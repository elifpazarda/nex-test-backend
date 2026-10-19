import { Injectable } from '@nestjs/common';
import { GenerationStatus, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/models/pagination';
import { GenerationListQuery } from './models/generation.request';
import {
  GenerationResponse,
  GenerationStatsResponse,
} from './models/generation.response';

dayjs.extend(utc);

export interface RecordGenerationParams {
  userId: string;
  projectId: string;
  title: string;
  sourceType: string;
  sourceRef?: string | null;
  scenarioCount: number;
  durationMs: number;
  status: GenerationStatus;
  errorMessage?: string;
}

// stats hesabinda kullanilan minimal run gorunumu
interface RunSlim {
  scenarioCount: number;
  savedCount: number;
  durationMs: number;
  status: GenerationStatus;
  createdAt: Date;
}

@Injectable()
export class GenerationsService {
  constructor(private prisma: PrismaService) {}

  // Bir uretim calistirmasini kaydeder. uret endpointleri tarafindan cagrilir.
  async record(params: RecordGenerationParams): Promise<{ id: string }> {
    const generation = await this.prisma.generation.create({
      data: {
        title: params.title,
        sourceType: params.sourceType,
        sourceRef: params.sourceRef ?? null,
        scenarioCount: params.scenarioCount,
        durationMs: params.durationMs,
        status: params.status,
        errorMessage: params.errorMessage ?? null,
        userId: params.userId,
        projectId: params.projectId,
      },
      select: { id: true },
    });
    return generation;
  }

  // Kullanici bu run'dan senaryo kaydettiginde korunan (savedCount) sayisini artirir.
  // Sahiplik dogrulanir; baska kullanicinin/olmayan run'a dokunmaz (sessizce gecer).
  async incrementSaved(
    generationId: string,
    userId: string,
    count: number,
  ): Promise<void> {
    if (count <= 0) return;
    await this.prisma.generation.updateMany({
      where: { id: generationId, userId },
      data: { savedCount: { increment: count } },
    });
  }

  async list(
    userId: string,
    query: GenerationListQuery,
  ): Promise<PaginatedResponse<GenerationResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GenerationWhereInput = { userId };
    if (query.sourceType) where.sourceType = query.sourceType;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { sourceRef: { contains: query.search, mode: 'insensitive' } },
        { project: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.generation.findMany({
        where,
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.generation.count({ where }),
    ]);

    return {
      items: items.map((g) => this.toResponse(g)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async stats(userId: string): Promise<GenerationStatsResponse> {
    const now = dayjs.utc();
    const todayStart = now.startOf('day').toDate();
    const weekAgo = now.subtract(7, 'day').toDate();
    const twoWeeksAgo = now.subtract(14, 'day').toDate();

    // Son 14 gunun tum run'larini tek sorguda cekip bellekte hesapliyoruz.
    const runs: RunSlim[] = await this.prisma.generation.findMany({
      where: { userId, createdAt: { gte: twoWeeksAgo } },
      select: {
        scenarioCount: true,
        savedCount: true,
        durationMs: true,
        status: true,
        createdAt: true,
      },
    });

    const thisWeek = runs.filter((r) => r.createdAt >= weekAgo);
    const lastWeek = runs.filter(
      (r) => r.createdAt < weekAgo && r.createdAt >= twoWeeksAgo,
    );
    const today = runs.filter((r) => r.createdAt >= todayStart);

    const weeklyScenarioCount = this.sum(thisWeek, (r) => r.scenarioCount);
    const lastWeekScenarioCount = this.sum(lastWeek, (r) => r.scenarioCount);

    const approvalTotal = weeklyScenarioCount;
    // savedCount, scenarioCount'u asamaz (tekrar kaydetmelerde cap)
    const approvalSaved = this.sum(thisWeek, (r) =>
      Math.min(r.savedCount, r.scenarioCount),
    );

    const todayScenarioCount = this.sum(today, (r) => r.scenarioCount);
    const todayDurationMs = this.sum(today, (r) => r.durationMs);

    const successful = thisWeek.filter(
      (r) => r.status === GenerationStatus.SUCCESS,
    ).length;

    return {
      weekly: {
        scenarioCount: weeklyScenarioCount,
        changePercent: this.percentChange(
          weeklyScenarioCount,
          lastWeekScenarioCount,
        ),
      },
      approval: {
        rate: this.rate(approvalSaved, approvalTotal),
        saved: approvalSaved,
        total: approvalTotal,
      },
      today: {
        runCount: today.length,
        scenarioCount: todayScenarioCount,
        avgDurationSec:
          today.length === 0
            ? 0
            : Math.round((todayDurationMs / today.length / 1000) * 10) / 10,
      },
      success: {
        rate: this.rate(successful, thisWeek.length),
        successful,
        total: thisWeek.length,
      },
    };
  }

  private toResponse(
    g: Prisma.GenerationGetPayload<{
      include: { project: { select: { id: true; name: true } } };
    }>,
  ): GenerationResponse {
    return {
      id: g.id,
      title: g.title,
      sourceType: g.sourceType,
      sourceRef: g.sourceRef,
      scenarioCount: g.scenarioCount,
      savedCount: g.savedCount,
      durationMs: g.durationMs,
      durationSec: Math.round((g.durationMs / 1000) * 10) / 10,
      status: g.status,
      project: g.project,
      createdAt: g.createdAt,
    };
  }

  private sum(runs: RunSlim[], pick: (r: RunSlim) => number): number {
    return runs.reduce((acc, r) => acc + pick(r), 0);
  }

  private rate(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  private percentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
