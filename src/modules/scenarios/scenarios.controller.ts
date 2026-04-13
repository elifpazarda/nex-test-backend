import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ScenariosService } from './scenarios.service';
import {
  GenerateScenarioRequest,
  GenerateFromJiraRequest,
  SaveScenarioRequest,
  ImportExcelRequest,
  ExportQueryRequest,
} from './models/scenario.request';
import {
  GenerateScenarioResponse,
  GenerateFromJiraResponse,
  ScenarioResponse,
  ScenarioWithProject,
  ExcelImportResponse,
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

  @Post('generate-from-jira')
  generateFromJira(
    @Body() request: GenerateFromJiraRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerateFromJiraResponse> {
    return this.scenariosService.generateFromJira(request, user.id);
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() request: ImportExcelRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ExcelImportResponse> {
    return this.scenariosService.importExcel(file, request, user.id);
  }

  @Get('export/project/:projectId')
  async exportByProject(
    @Param('projectId') projectId: string,
    @Query() query: ExportQueryRequest,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, contentType } =
      await this.scenariosService.exportByProject(projectId, query, user.id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('export/:id')
  async exportSingle(
    @Param('id') id: string,
    @Query() query: ExportQueryRequest,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, contentType } =
      await this.scenariosService.exportSingle(id, query, user.id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
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
