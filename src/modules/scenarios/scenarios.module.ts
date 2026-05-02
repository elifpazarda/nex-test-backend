import { Module } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import { ScenariosController } from './scenarios.controller';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';
import { JiraModule } from '../jira/jira.module';
import { ScenarioGroupsModule } from '../scenario-groups/scenario-groups.module';

@Module({
  imports: [AiModule, ProjectsModule, JiraModule, ScenarioGroupsModule],
  providers: [ScenariosService],
  controllers: [ScenariosController],
})
export class ScenariosModule {}
