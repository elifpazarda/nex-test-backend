import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProjectsService } from '../projects/projects.service';
import {
  GenerateScenarioRequest,
  SaveScenarioRequest,
} from './models/scenario.request';
import {
  GenerateScenarioResponse,
  ScenarioResponse,
  ScenarioWithProject,
} from './models/scenario.response';

@Injectable()
export class ScenariosService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private projectsService: ProjectsService,
  ) {}

  async generate(
    request: GenerateScenarioRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const rawOutput = await this.aiService.generateTestScenario(request.input);
    const bddOutput = await this.aiService.convertToBdd(rawOutput);
    const { score, feedback } = await this.aiService.evaluateQuality(rawOutput);

    return {
      rawOutput,
      bddOutput,
      qualityScore: score,
      qualityFeedback: feedback,
    };
  }

  async save(
    request: SaveScenarioRequest,
    userId: string,
  ): Promise<ScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);
    return this.prisma.testScenario.create({
      data: {
        title: request.title,
        input: request.input,
        rawOutput: request.rawOutput,
        bddOutput: request.bddOutput,
        qualityScore: request.qualityScore,
        qualityFeedback: request.qualityFeedback ?? '',
        projectId: request.projectId,
      },
    });
  }

  async findByProject(
    projectId: string,
    userId: string,
  ): Promise<ScenarioResponse[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.prisma.testScenario.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<ScenarioWithProject> {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!scenario) throw new NotFoundException('Senaryo bulunamadı');
    if (scenario.project.userId !== userId)
      throw new ForbiddenException('Erişim yetkisi yok');
    return scenario;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOne(id, userId);
    await this.prisma.testScenario.delete({ where: { id } });
    return { message: 'Senaryo silindi' };
  }
}
