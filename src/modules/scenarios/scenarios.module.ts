import { Module } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import { ScenariosController } from './scenarios.controller';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';
import { JiraModule } from '../jira/jira.module';
import { ScenarioGroupsModule } from '../scenario-groups/scenario-groups.module';
import { GenerationsModule } from '../generations/generations.module';

@Module({
  imports: [
    AiModule,
    ProjectsModule,
    JiraModule,
    ScenarioGroupsModule,
    GenerationsModule,
  ],
  providers: [ScenariosService],
  controllers: [ScenariosController],
  exports: [ScenariosService],
})
export class ScenariosModule {}
