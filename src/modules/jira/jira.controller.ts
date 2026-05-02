import { Controller, Delete, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JiraService } from './jira.service';
import { JiraOAuthCallbackQuery } from './models/jira.request';
import {
  JiraAuthUrlResponse,
  JiraConnectionResponse,
} from './models/jira.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('jira')
export class JiraController {
  private readonly frontendUrl: string;

  constructor(
    private jiraService: JiraService,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  async getAuthUrl(
    @CurrentUser() user: CurrentUserData,
  ): Promise<JiraAuthUrlResponse> {
    return this.jiraService.getAuthUrl(user.id);
  }

  @Get('callback')
  async callback(
    @Query() query: JiraOAuthCallbackQuery,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.jiraService.handleCallback(query.code, query.state);
      res.redirect(`${this.frontendUrl}/jira/callback?success=true`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Bilinmeyen hata';
      res.redirect(
        `${this.frontendUrl}/jira/callback?success=false&error=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('connection')
  @UseGuards(JwtAuthGuard)
  getConnection(
    @CurrentUser() user: CurrentUserData,
  ): Promise<JiraConnectionResponse> {
    return this.jiraService.getConnection(user.id);
  }

  @Delete('connection')
  @UseGuards(JwtAuthGuard)
  deleteConnection(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.jiraService.deleteConnection(user.id);
  }
}
