import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateScenarioGroupRequest,
  UpdateScenarioGroupRequest,
} from './models/scenario-group.request';
import { ScenarioGroupWithCount } from './models/scenario-group.response';
import {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/models/pagination';

@Injectable()
export class ScenarioGroupsService {
  constructor(
    private prisma: PrismaService,
    private projectsService: ProjectsService,
  ) {}

  async findAllByProject(
    projectId: string,
    userId: string,
    pagination: PaginationQuery,
  ): Promise<PaginatedResponse<ScenarioGroupWithCount>> {
    await this.projectsService.findOne(projectId, userId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.scenarioGroup.findMany({
        where: { projectId },
        include: { _count: { select: { scenarios: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.scenarioGroup.count({ where: { projectId } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<
    ScenarioGroupWithCount & { project: { userId: string }; projectId: string }
  > {
    const group = await this.prisma.scenarioGroup.findUnique({
      where: { id },
      include: {
        project: true,
        _count: { select: { scenarios: true } },
      },
    });
    if (!group) throw new NotFoundException('Senaryo grubu bulunamadı');
    if (group.project.userId !== userId)
      throw new ForbiddenException('Bu gruba erişim yetkiniz yok');
    return group;
  }

  async create(
    userId: string,
    request: CreateScenarioGroupRequest,
  ): Promise<ScenarioGroupWithCount> {
    await this.projectsService.findOne(request.projectId, userId);
    return this.prisma.scenarioGroup.create({
      data: {
        name: request.name,
        type: request.type,
        projectId: request.projectId,
      },
      include: { _count: { select: { scenarios: true } } },
    });
  }

  async update(
    id: string,
    userId: string,
    request: UpdateScenarioGroupRequest,
  ): Promise<ScenarioGroupWithCount> {
    await this.findOne(id, userId);
    return this.prisma.scenarioGroup.update({
      where: { id },
      data: request,
      include: { _count: { select: { scenarios: true } } },
    });
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOne(id, userId);
    await this.prisma.scenarioGroup.delete({ where: { id } });
    return { message: 'Senaryo grubu silindi' };
  }
}
