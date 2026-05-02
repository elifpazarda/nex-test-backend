import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
} from './models/project.request';
import { ProjectWithCount } from './models/project.response';
import {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/models/pagination';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    pagination: PaginationQuery,
  ): Promise<PaginatedResponse<ProjectWithCount>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        include: {
          _count: { select: { scenarios: true, scenarioGroups: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where: { userId } }),
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

  async findOne(id: string, userId: string): Promise<ProjectWithCount> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { scenarios: true, scenarioGroups: true } },
      },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı');
    if (project.userId !== userId)
      throw new ForbiddenException('Bu projeye erişim yetkiniz yok');
    return project;
  }

  async create(
    userId: string,
    request: CreateProjectRequest,
  ): Promise<ProjectWithCount> {
    return this.prisma.project.create({
      data: { ...request, userId },
      include: {
        _count: { select: { scenarios: true, scenarioGroups: true } },
      },
    });
  }

  async update(
    id: string,
    userId: string,
    request: UpdateProjectRequest,
  ): Promise<ProjectWithCount> {
    await this.findOne(id, userId);
    return this.prisma.project.update({
      where: { id },
      data: request,
      include: {
        _count: { select: { scenarios: true, scenarioGroups: true } },
      },
    });
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Proje silindi' };
  }
}
