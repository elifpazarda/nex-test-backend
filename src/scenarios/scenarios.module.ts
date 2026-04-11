import { Module } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import { ScenariosController } from './scenarios.controller';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [AiModule, ProjectsModule],
  providers: [ScenariosService],
  controllers: [ScenariosController],
})
export class ScenariosModule {}
