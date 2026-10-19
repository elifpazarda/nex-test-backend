import { Module } from '@nestjs/common';
import { ScmWebhooksService } from './scm-webhooks.service';
import { ScmWebhooksController } from './scm-webhooks.controller';

@Module({
  providers: [ScmWebhooksService],
  controllers: [ScmWebhooksController],
  exports: [ScmWebhooksService],
})
export class ScmWebhooksModule {}
