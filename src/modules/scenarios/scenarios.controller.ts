import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import {
  GenerateScenarioRequest,
  SaveScenarioRequest,
} from './models/scenario.request';
import {
  GenerateScenarioResponse,
  ScenarioResponse,
  ScenarioWithProject,
} from './models/scenario.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(private scenariosService: ScenariosService) {}

  @Post('generate')
  generate(
    @Body() request: GenerateScenarioRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerateScenarioResponse> {
    return this.scenariosService.generate(request, user.id);
  }

  @Post()
  save(
    @Body() request: SaveScenarioRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioResponse> {
    return this.scenariosService.save(request, user.id);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioResponse[]> {
    return this.scenariosService.findByProject(projectId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioWithProject> {
    return this.scenariosService.findOne(id, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.scenariosService.remove(id, user.id);
  }
}
