import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';

// Nest rawBody: true ile express request'ine ham govdeyi ekler.
interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

// Gelen GitHub webhook'unu URL'deki baglanti (connection) UUID'sine gore dogrular:
// o baglantinin secret'i cozulur ve X-Hub-Signature-256 (HMAC-SHA256) kontrol edilir.
// Baglanti yok/pasif veya imza tutmazsa 401 doner (Clarity ile ayni davranis).
@Injectable()
export class ScmWebhookGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RawBodyRequest>();

    const connectionId = (req.params as Record<string, string>)?.connectionId;
    if (!connectionId) {
      throw new UnauthorizedException('Baglanti kimligi eksik');
    }

    const conn = await this.prisma.scmWebhookConnection.findFirst({
      where: { id: connectionId, active: true, provider: 'github' },
      select: { secret: true },
    });
    if (!conn) {
      throw new UnauthorizedException('Gecersiz veya pasif webhook baglantisi');
    }

    const signature = req.header('x-hub-signature-256');
    if (!signature) {
      throw new UnauthorizedException('X-Hub-Signature-256 header eksik');
    }

    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Ham istek govdesi okunamadi');
    }

    let secret: string;
    try {
      secret = CryptoUtil.decrypt(conn.secret);
    } catch {
      throw new UnauthorizedException('Baglanti secret cozulemedi');
    }

    const expected =
      'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    // timingSafeEqual esit uzunluk ister; farkli uzunlukta imza zaten gecersiz.
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Webhook imzasi gecersiz');
    }

    return true;
  }
}
