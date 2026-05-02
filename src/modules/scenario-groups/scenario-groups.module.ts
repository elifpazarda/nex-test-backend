import { Module } from '@nestjs/common';
import { ScenarioGroupsService } from './scenario-groups.service';
import { ScenarioGroupsController } from './scenario-groups.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  providers: [ScenarioGroupsService],
  controllers: [ScenarioGroupsController],
  exports: [ScenarioGroupsService],
})
export class ScenarioGroupsModule {}
