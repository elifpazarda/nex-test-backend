import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  CreateScmConnectionRequest,
  GithubWebhookPayload,
} from './models/scm-webhook.request';
import {
  ScmConnectionCreatedResponse,
  ScmConnectionResponse,
  WebhookAckResponse,
} from './models/scm-webhook.response';

// Baglanti kaydindan response'a (secret haric) donusum icin minimal gorunum.
interface ConnectionRow {
  id: string;
  provider: string;
  label: string | null;
  active: boolean;
  projectId: string | null;
  createdAt: Date;
}

@Injectable()
export class ScmWebhooksService {
  private readonly logger = new Logger(ScmWebhooksService.name);

  constructor(private prisma: PrismaService) {}

  // Payload URL'ini (GitHub'a girilecek adres) baglanti UUID'sinden uretir.
  private webhookUrl(connectionId: string): string {
    const base = (process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`).replace(/\/$/, '');
    return `${base}/api/v1/scm-webhooks/github/${connectionId}`;
  }

  private toResponse(row: ConnectionRow): ScmConnectionResponse {
    return {
      id: row.id,
      provider: row.provider,
      label: row.label,
      active: row.active,
      projectId: row.projectId,
      webhookUrl: this.webhookUrl(row.id),
      createdAt: row.createdAt,
    };
  }

  // Yeni baglanti olusturur, secret uretir ve (yalnizca burada) acik haliyle doner.
  async createConnection(
    userId: string,
    dto: CreateScmConnectionRequest,
  ): Promise<ScmConnectionCreatedResponse> {
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { userId: true },
      });
      if (!project) throw new NotFoundException('Proje bulunamadı');
      if (project.userId !== userId) {
        throw new ForbiddenException('Bu projeye erişiminiz yok');
      }
    }

    const secret = randomBytes(32).toString('hex');

    const row = await this.prisma.scmWebhookConnection.create({
      data: {
        provider: dto.provider,
        label: dto.label ?? null,
        projectId: dto.projectId ?? null,
        secret: CryptoUtil.encrypt(secret),
        userId,
      },
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        projectId: true,
        createdAt: true,
      },
    });

    this.logger.log(`SCM webhook baglantisi olusturuldu: ${row.id} (${row.provider})`);

    return { ...this.toResponse(row), secret };
  }

  async listConnections(userId: string): Promise<ScmConnectionResponse[]> {
    const rows = await this.prisma.scmWebhookConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        projectId: true,
        createdAt: true,
      },
    });
    return rows.map((r) => this.toResponse(r));
  }

  async deleteConnection(
    userId: string,
    connectionId: string,
  ): Promise<{ deleted: boolean }> {
    const result = await this.prisma.scmWebhookConnection.deleteMany({
      where: { id: connectionId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Webhook baglantisi bulunamadı');
    }
    return { deleted: true };
  }

  // Imzasi dogrulanmis bir GitHub event'ini kaydeder. Ayni teslimat (delivery)
  // tekrar gelirse yeniden yazmaz (idempotency), mevcut kaydi doner.
  async recordGithubEvent(
    connectionId: string,
    eventType: string | undefined,
    deliveryId: string | undefined,
    payload: GithubWebhookPayload,
  ): Promise<WebhookAckResponse> {
    const type = eventType ?? 'unknown';
    const action = typeof payload?.action === 'string' ? payload.action : null;
    const sourceRef = payload?.repository?.full_name ?? null;

    if (deliveryId) {
      const existing = await this.prisma.scmWebhookEvent.findUnique({
        where: { deliveryId },
        select: { id: true },
      });
      if (existing) {
        this.logger.log(`Tekrar eden GitHub teslimati yok sayildi: ${deliveryId}`);
        return { received: true, eventId: existing.id, eventType: type };
      }
    }

    const event = await this.prisma.scmWebhookEvent.create({
      data: {
        connectionId,
        provider: 'github',
        eventType: type,
        action,
        deliveryId: deliveryId ?? null,
        sourceRef,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    this.logger.log(
      `GitHub webhook kaydedildi: ${type}${action ? '/' + action : ''} (${sourceRef ?? 'repo yok'}) [conn ${connectionId}]`,
    );

    return { received: true, eventId: event.id, eventType: type };
  }
}
