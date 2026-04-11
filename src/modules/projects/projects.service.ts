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
import { ProjectResponse, ProjectWithCount } from './models/project.response';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<ProjectWithCount[]> {
    return this.prisma.project.findMany({
      where: { userId },
      include: { _count: { select: { scenarios: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Proje bulunamadı');
    if (project.userId !== userId)
      throw new ForbiddenException('Bu projeye erişim yetkiniz yok');
    return project;
  }

  async create(
    userId: string,
    request: CreateProjectRequest,
  ): Promise<ProjectResponse> {
    return this.prisma.project.create({ data: { ...request, userId } });
  }

  async update(
    id: string,
    userId: string,
    request: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    await this.findOne(id, userId);
    return this.prisma.project.update({ where: { id }, data: request });
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Proje silindi' };
  }
}
