import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { AiModule } from './modules/ai/ai.module';
import { JiraModule } from './modules/jira/jira.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    ScenariosModule,
    AiModule,
    JiraModule,
  ],
})
export class AppModule {}
