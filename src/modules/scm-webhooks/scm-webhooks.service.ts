import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { ScenariosService } from '../scenarios/scenarios.service';
import { PaginatedResponse } from '../../common/models/pagination';
import {
  CreateScmConnectionRequest,
  GithubWebhookPayload,
  ScmWebhookEventListQuery,
  UpdateScmConnectionRequest,
} from './models/scm-webhook.request';
import {
  ScmConnectionCreatedResponse,
  ScmConnectionResponse,
  ScmWebhookEventResponse,
  WebhookAckResponse,
} from './models/scm-webhook.response';

// Otomatik uretimi tetikleyen event/action kombinasyonlari (whitelist).
const GENERATE_EVENTS = new Set(['issues', 'pull_request']);
const GENERATE_ACTIONS = new Set(['opened', 'edited']);

// Baglanti kaydindan response'a (secret haric) donusum icin minimal gorunum.
interface ConnectionRow {
  id: string;
  provider: string;
  label: string | null;
  active: boolean;
  autoGenerate: boolean;
  targetGroupId: string | null;
  projectId: string | null;
  createdAt: Date;
}

@Injectable()
export class ScmWebhooksService {
  private readonly logger = new Logger(ScmWebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private scenariosService: ScenariosService,
  ) {}

  // Payload URL'ini (GitHub'a girilecek adres) baglanti UUID'sinden uretir.
  private webhookUrl(connectionId: string): string {
    const base = (
      process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
    ).replace(/\/$/, '');
    return `${base}/api/v1/scm-webhooks/github/${connectionId}`;
  }

  private toResponse(row: ConnectionRow): ScmConnectionResponse {
    return {
      id: row.id,
      provider: row.provider,
      label: row.label,
      active: row.active,
      autoGenerate: row.autoGenerate,
      targetGroupId: row.targetGroupId,
      projectId: row.projectId,
      webhookUrl: this.webhookUrl(row.id),
      createdAt: row.createdAt,
    };
  }

  // Verilen grubun kullaniciya ait oldugunu dogrular, projectId'sini doner.
  private async assertGroupOwnership(
    groupId: string,
    userId: string,
  ): Promise<string> {
    const group = await this.prisma.scenarioGroup.findFirst({
      where: { id: groupId, project: { userId } },
      select: { projectId: true },
    });
    if (!group) {
      throw new NotFoundException('Hedef grup bulunamadı veya erişiminiz yok');
    }
    return group.projectId;
  }

  // Yeni baglanti olusturur, secret uretir ve (yalnizca burada) acik haliyle doner.
  async createConnection(
    userId: string,
    dto: CreateScmConnectionRequest,
  ): Promise<ScmConnectionCreatedResponse> {
    const autoGenerate = dto.autoGenerate ?? false;
    if (autoGenerate && !dto.targetGroupId) {
      throw new BadRequestException(
        'autoGenerate açıkken targetGroupId zorunludur',
      );
    }

    // Hedef grup verildiyse sahiplik dogrula; projectId'yi gruptan turet.
    let projectId: string | null = dto.projectId ?? null;
    if (dto.targetGroupId) {
      projectId = await this.assertGroupOwnership(dto.targetGroupId, userId);
    } else if (dto.projectId) {
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
        autoGenerate,
        targetGroupId: dto.targetGroupId ?? null,
        projectId,
        secret: CryptoUtil.encrypt(secret),
        userId,
      },
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        autoGenerate: true,
        targetGroupId: true,
        projectId: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `SCM webhook baglantisi olusturuldu: ${row.id} (${row.provider}, autoGenerate=${autoGenerate})`,
    );

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
        autoGenerate: true,
        targetGroupId: true,
        projectId: true,
        createdAt: true,
      },
    });
    return rows.map((r) => this.toResponse(r));
  }

  // Baglanti ayarlarini gunceller. Nihai autoGenerate=true ise nihai
  // targetGroupId dolu olmali; targetGroupId degisirse projectId gruptan turer.
  async updateConnection(
    userId: string,
    connectionId: string,
    dto: UpdateScmConnectionRequest,
  ): Promise<ScmConnectionResponse> {
    const existing = await this.prisma.scmWebhookConnection.findFirst({
      where: { id: connectionId, userId },
      select: { autoGenerate: true, targetGroupId: true },
    });
    if (!existing) {
      throw new NotFoundException('Webhook baglantisi bulunamadı');
    }

    const data: Prisma.ScmWebhookConnectionUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.active !== undefined) data.active = dto.active;

    let targetGroupId = existing.targetGroupId;
    if (dto.targetGroupId !== undefined) {
      const projectId = await this.assertGroupOwnership(dto.targetGroupId, userId);
      data.targetGroup = { connect: { id: dto.targetGroupId } };
      data.project = { connect: { id: projectId } };
      targetGroupId = dto.targetGroupId;
    }

    const autoGenerate = dto.autoGenerate ?? existing.autoGenerate;
    if (dto.autoGenerate !== undefined) data.autoGenerate = dto.autoGenerate;
    if (autoGenerate && !targetGroupId) {
      throw new BadRequestException(
        'autoGenerate açıkken targetGroupId zorunludur',
      );
    }

    const row = await this.prisma.scmWebhookConnection.update({
      where: { id: connectionId },
      data,
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        autoGenerate: true,
        targetGroupId: true,
        projectId: true,
        createdAt: true,
      },
    });
    return this.toResponse(row);
  }

  // Baglantinin secret'ini yeniler ve yeni degeri (yalnizca burada) acik doner.
  async rotateSecret(
    userId: string,
    connectionId: string,
  ): Promise<ScmConnectionCreatedResponse> {
    const existing = await this.prisma.scmWebhookConnection.findFirst({
      where: { id: connectionId, userId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Webhook baglantisi bulunamadı');
    }

    const secret = randomBytes(32).toString('hex');
    const row = await this.prisma.scmWebhookConnection.update({
      where: { id: connectionId },
      data: { secret: CryptoUtil.encrypt(secret) },
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        autoGenerate: true,
        targetGroupId: true,
        projectId: true,
        createdAt: true,
      },
    });

    this.logger.log(`SCM webhook secret yenilendi: ${connectionId}`);
    return { ...this.toResponse(row), secret };
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

  // Bir baglantinin webhook event gecmisini (payload haric) paginated doner.
  // Once baglanti sahipligi dogrulanir.
  async listEvents(
    userId: string,
    connectionId: string,
    query: ScmWebhookEventListQuery,
  ): Promise<PaginatedResponse<ScmWebhookEventResponse>> {
    const conn = await this.prisma.scmWebhookConnection.findFirst({
      where: { id: connectionId, userId },
      select: { id: true },
    });
    if (!conn) {
      throw new NotFoundException('Webhook baglantisi bulunamadı');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      connectionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.scmWebhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          provider: true,
          eventType: true,
          action: true,
          deliveryId: true,
          sourceRef: true,
          status: true,
          error: true,
          createdAt: true,
        },
      }),
      this.prisma.scmWebhookEvent.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Imzasi dogrulanmis bir GitHub event'ini kaydeder. Ayni teslimat (delivery)
  // tekrar gelirse yeniden yazmaz (idempotency), mevcut kaydi doner. Uygun
  // event ise otomatik senaryo uretimini ASENKRON tetikler (ack'i bloklamaz).
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

    // Otomatik uretime uygun mu? (event + action whitelist)
    if (GENERATE_EVENTS.has(type) && action && GENERATE_ACTIONS.has(action)) {
      const conn = await this.prisma.scmWebhookConnection.findUnique({
        where: { id: connectionId },
        select: { autoGenerate: true, targetGroupId: true, userId: true },
      });
      if (conn?.autoGenerate && conn.targetGroupId) {
        // fire-and-forget: ack'i bekletmeden arka planda uret+kaydet
        void this.runWebhookGeneration(
          event.id,
          conn.userId,
          conn.targetGroupId,
          type,
          payload,
        );
      }
    }

    return { received: true, eventId: event.id, eventType: type };
  }

  // Event payload'undan AI girdisi, kaynak referansi ve baslik uretir.
  private buildGenerationInput(
    type: string,
    payload: GithubWebhookPayload,
  ): { input: string; sourceRef: string; title: string } | null {
    const repo = payload?.repository?.full_name ?? 'repo';
    const node = type === 'issues' ? payload?.issue : payload?.pull_request;
    const title = (node?.title ?? '').trim();
    const body = (node?.body ?? '').trim();
    if (!title && !body) return null;

    let input = `# ${title}\n\n${body}`.trim();

    // pull_request: payload'da bulunan degisiklik metadata'sini girdiye ekle
    // (dosya adlari payload'da gelmez — onun icin GitHub API token'i gerekir).
    if (type === 'pull_request') {
      const pr = payload?.pull_request;
      const meta: string[] = [];
      if (pr?.head?.ref || pr?.base?.ref) {
        meta.push(`- Dal: ${pr?.head?.ref ?? '?'} → ${pr?.base?.ref ?? '?'}`);
      }
      if (
        pr?.changed_files !== undefined ||
        pr?.additions !== undefined ||
        pr?.deletions !== undefined ||
        pr?.commits !== undefined
      ) {
        meta.push(
          `- Degisiklik: ${pr?.changed_files ?? 0} dosya (+${pr?.additions ?? 0}/-${pr?.deletions ?? 0}), ${pr?.commits ?? 0} commit`,
        );
      }
      if (meta.length > 0) {
        input = `${input}\n\n## PR Bilgisi\n${meta.join('\n')}`;
      }
    }

    const ref = `${repo}#${node?.number ?? '?'}`;
    const heading = `${ref} · ${title || '(basliksiz)'}`;
    return {
      input,
      sourceRef: ref,
      title: heading.length > 120 ? `${heading.slice(0, 117)}...` : heading,
    };
  }

  // Arka plan uretimi: event durumunu (PROCESSED/SKIPPED/FAILED) gunceller.
  private async runWebhookGeneration(
    eventId: string,
    userId: string,
    groupId: string,
    type: string,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const built = this.buildGenerationInput(type, payload);
    if (!built) {
      await this.setEventStatus(eventId, 'SKIPPED', 'Islenecek icerik yok');
      return;
    }

    try {
      const result = await this.scenariosService.generateAndSaveToGroup(
        userId,
        groupId,
        {
          input: built.input,
          sourceType: 'webhook',
          sourceRef: built.sourceRef,
          title: built.title,
        },
      );
      await this.setEventStatus(eventId, 'PROCESSED');
      this.logger.log(
        `Webhook uretimi tamam: ${built.sourceRef} → ${result.savedCount}/${result.scenarioCount} senaryo kaydedildi`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook uretim hatasi';
      await this.setEventStatus(eventId, 'FAILED', message);
      this.logger.error(`Webhook uretimi basarisiz (${built.sourceRef}): ${message}`);
    }
  }

  private async setEventStatus(
    eventId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    await this.prisma.scmWebhookEvent.update({
      where: { id: eventId },
      data: { status, error: error ?? null },
    });
  }
}
