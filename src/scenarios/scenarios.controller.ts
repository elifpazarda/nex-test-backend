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
import { GenerateScenarioDto, SaveScenarioDto } from './dto/scenario.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(private scenariosService: ScenariosService) {}

  @Post('generate')
  generate(
    @Body() dto: GenerateScenarioDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scenariosService.generate(dto, user.id);
  }

  @Post()
  save(
    @Body() dto: SaveScenarioDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scenariosService.save(dto, user.id);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scenariosService.findByProject(projectId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scenariosService.findOne(id, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scenariosService.remove(id, user.id);
  }
}
