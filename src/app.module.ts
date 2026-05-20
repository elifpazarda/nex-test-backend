import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConditionalThrottlerGuard } from './common/guards/conditional-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { AiModule } from './modules/ai/ai.module';
import { JiraModule } from './modules/jira/jira.module';
import { ScenarioGroupsModule } from './modules/scenario-groups/scenario-groups.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    ScenariosModule,
    AiModule,
    JiraModule,
    ScenarioGroupsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ConditionalThrottlerGuard,
    },
  ],
})
export class AppModule {}
