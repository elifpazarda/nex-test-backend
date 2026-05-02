import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScenarioGroupsService } from './scenario-groups.service';
import {
  CreateScenarioGroupRequest,
  UpdateScenarioGroupRequest,
} from './models/scenario-group.request';
import { ScenarioGroupWithCount } from './models/scenario-group.response';
import {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/models/pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scenario-groups')
export class ScenarioGroupsController {
  constructor(private scenarioGroupsService: ScenarioGroupsService) {}

  @Get('project/:projectId')
  findAllByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: PaginationQuery,
  ): Promise<PaginatedResponse<ScenarioGroupWithCount>> {
    return this.scenarioGroupsService.findAllByProject(
      projectId,
      user.id,
      pagination,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioGroupWithCount> {
    return this.scenarioGroupsService.findOne(id, user.id);
  }

  @Post()
  create(
    @Body() request: CreateScenarioGroupRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioGroupWithCount> {
    return this.scenarioGroupsService.create(user.id, request);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() request: UpdateScenarioGroupRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioGroupWithCount> {
    return this.scenarioGroupsService.update(id, user.id, request);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.scenarioGroupsService.remove(id, user.id);
  }
}
