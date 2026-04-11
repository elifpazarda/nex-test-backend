import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProjectsService } from '../projects/projects.service';
import { GenerateScenarioDto, SaveScenarioDto } from './dto/scenario.dto';

@Injectable()
export class ScenariosService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private projectsService: ProjectsService,
  ) {}

  async generate(dto: GenerateScenarioDto, userId: string) {
    await this.projectsService.findOne(dto.projectId, userId);

    const rawOutput = await this.aiService.generateTestScenario(dto.input);
    const bddOutput = await this.aiService.convertToBdd(rawOutput);
    const { score, feedback } =
      await this.aiService.evaluateQuality(rawOutput);

    return {
      rawOutput,
      bddOutput,
      qualityScore: score,
      qualityFeedback: feedback,
    };
  }

  async save(dto: SaveScenarioDto, userId: string) {
    await this.projectsService.findOne(dto.projectId, userId);
    return this.prisma.testScenario.create({
      data: {
        title: dto.title,
        input: dto.input,
        rawOutput: dto.rawOutput,
        bddOutput: dto.bddOutput,
        qualityScore: dto.qualityScore,
        qualityFeedback: dto.qualityFeedback ?? '',
        projectId: dto.projectId,
      },
    });
  }

  async findByProject(projectId: string, userId: string) {
    await this.projectsService.findOne(projectId, userId);
    return this.prisma.testScenario.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!scenario) throw new NotFoundException('Senaryo bulunamadı');
    if (scenario.project.userId !== userId)
      throw new ForbiddenException('Erişim yetkisi yok');
    return scenario;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.testScenario.delete({ where: { id } });
    return { message: 'Senaryo silindi' };
  }
}
