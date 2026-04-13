import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JiraService } from './jira.service';
import { SaveJiraConnectionRequest } from './models/jira.request';
import { JiraConnectionResponse } from './models/jira.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @Post('connection')
  saveConnection(
    @Body() request: SaveJiraConnectionRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<JiraConnectionResponse> {
    return this.jiraService.saveConnection(user.id, request);
  }

  @Get('connection')
  getConnection(
    @CurrentUser() user: CurrentUserData,
  ): Promise<JiraConnectionResponse> {
    return this.jiraService.getConnection(user.id);
  }

  @Delete('connection')
  deleteConnection(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.jiraService.deleteConnection(user.id);
  }
}
