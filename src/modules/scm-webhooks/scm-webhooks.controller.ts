import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScmWebhooksService } from './scm-webhooks.service';
import { ScmWebhookGuard } from './guards/scm-webhook.guard';
import {
  CreateScmConnectionRequest,
  ScmWebhookEventListQuery,
  UpdateScmConnectionRequest,
} from './models/scm-webhook.request';
import type { GithubWebhookPayload } from './models/scm-webhook.request';
import {
  ScmConnectionCreatedResponse,
  ScmConnectionResponse,
  ScmWebhookEventResponse,
  WebhookAckResponse,
} from './models/scm-webhook.response';
import { PaginatedResponse } from '../../common/models/pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('v1/scm-webhooks')
export class ScmWebhooksController {
  constructor(private scmWebhooksService: ScmWebhooksService) {}

  // --- Management (JWT korumali) ---

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateScmConnectionRequest,
  ): Promise<ScmConnectionCreatedResponse> {
    return this.scmWebhooksService.createConnection(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScmConnectionResponse[]> {
    return this.scmWebhooksService.listConnections(user.id);
  }

  @Get(':connectionId/events')
  @UseGuards(JwtAuthGuard)
  events(
    @CurrentUser() user: CurrentUserData,
    @Param('connectionId') connectionId: string,
    @Query() query: ScmWebhookEventListQuery,
  ): Promise<PaginatedResponse<ScmWebhookEventResponse>> {
    return this.scmWebhooksService.listEvents(user.id, connectionId, query);
  }

  @Patch(':connectionId')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateScmConnectionRequest,
  ): Promise<ScmConnectionResponse> {
    return this.scmWebhooksService.updateConnection(user.id, connectionId, dto);
  }

  @Post(':connectionId/rotate-secret')
  @UseGuards(JwtAuthGuard)
  rotateSecret(
    @CurrentUser() user: CurrentUserData,
    @Param('connectionId') connectionId: string,
  ): Promise<ScmConnectionCreatedResponse> {
    return this.scmWebhooksService.rotateSecret(user.id, connectionId);
  }

  @Delete(':connectionId')
  @UseGuards(JwtAuthGuard)
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('connectionId') connectionId: string,
  ): Promise<{ deleted: boolean }> {
    return this.scmWebhooksService.deleteConnection(user.id, connectionId);
  }

  // --- Inbound webhook (public, HMAC imza ile korumali) ---

  @Post('github/:connectionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ScmWebhookGuard)
  github(
    @Param('connectionId') connectionId: string,
    @Headers('x-github-event') eventType: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() payload: GithubWebhookPayload,
  ): Promise<WebhookAckResponse> {
    return this.scmWebhooksService.recordGithubEvent(
      connectionId,
      eventType,
      deliveryId,
      payload,
    );
  }
}
