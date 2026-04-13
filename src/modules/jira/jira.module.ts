import { Module } from '@nestjs/common';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';

@Module({
  providers: [JiraService],
  controllers: [JiraController],
  exports: [JiraService],
})
export class JiraModule {}
