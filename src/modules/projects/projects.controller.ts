import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
} from './models/project.request';
import { ProjectResponse, ProjectWithCount } from './models/project.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserData): Promise<ProjectWithCount[]> {
    return this.projectsService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProjectResponse> {
    return this.projectsService.findOne(id, user.id);
  }

  @Post()
  create(
    @Body() request: CreateProjectRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProjectResponse> {
    return this.projectsService.create(user.id, request);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() request: UpdateProjectRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProjectResponse> {
    return this.projectsService.update(id, user.id, request);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.projectsService.remove(id, user.id);
  }
}
