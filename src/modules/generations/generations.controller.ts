import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { GenerationListQuery } from './models/generation.request';
import {
  GenerationResponse,
  GenerationStatsResponse,
} from './models/generation.response';
import { PaginatedResponse } from '../../common/models/pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('generations')
export class GenerationsController {
  constructor(private generationsService: GenerationsService) {}

  @Get('stats')
  stats(
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerationStatsResponse> {
    return this.generationsService.stats(user.id);
  }

  @Get()
  list(
    @CurrentUser() user: CurrentUserData,
    @Query() query: GenerationListQuery,
  ): Promise<PaginatedResponse<GenerationResponse>> {
    return this.generationsService.list(user.id, query);
  }
}
