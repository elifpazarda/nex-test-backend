import { Module } from '@nestjs/common';
import { ScmWebhooksService } from './scm-webhooks.service';
import { ScmWebhooksController } from './scm-webhooks.controller';
import { ScenariosModule } from '../scenarios/scenarios.module';

@Module({
  imports: [ScenariosModule],
  providers: [ScmWebhooksService],
  controllers: [ScmWebhooksController],
  exports: [ScmWebhooksService],
})
export class ScmWebhooksModule {}
