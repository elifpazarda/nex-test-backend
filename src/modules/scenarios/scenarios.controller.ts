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
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ScenariosService } from './scenarios.service';
import {
  GenerateFromTextRequest,
  GenerateFromJiraRequest,
  GenerateFromFileRequest,
  ConvertBddRequest,
  SaveScenariosRequest,
  ImportExcelRequest,
  ExportQueryRequest,
} from './models/scenario.request';
import {
  GenerateScenarioResponse,
  ConvertBddResponse,
  ScenarioResponse,
  ScenarioWithGroup,
  ScenarioWithProject,
  ExcelImportResponse,
} from './models/scenario.response';
import {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/models/pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(private scenariosService: ScenariosService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('generate/text')
  generateFromText(
    @Body() request: GenerateFromTextRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerateScenarioResponse> {
    return this.scenariosService.generateFromText(request, user.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('generate/jira')
  generateFromJira(
    @Body() request: GenerateFromJiraRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerateScenarioResponse> {
    return this.scenariosService.generateFromJira(request, user.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('generate/excel')
  @UseInterceptors(FileInterceptor('file'))
  generateFromExcel(
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
    @Body() request: GenerateFromFileRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerateScenarioResponse> {
    return this.scenariosService.generateFromExcel(file, request, user.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('generate/pdf')
  @UseInterceptors(FileInterceptor('file'))
  generateFromPdf(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() request: GenerateFromFileRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GenerateScenarioResponse> {
    return this.scenariosService.generateFromPdf(file, request, user.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('convert-bdd')
  convertToBdd(
    @Body() request: ConvertBddRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ConvertBddResponse> {
    return this.scenariosService.convertToBdd(request, user.id);
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

  @Get('export/all/:projectId')
  async exportAll(
    @Param('projectId') projectId: string,
    @Query() query: ExportQueryRequest,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, contentType } =
      await this.scenariosService.exportAll(projectId, query, user.id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('export/group/:groupId')
  async exportByGroup(
    @Param('groupId') groupId: string,
    @Query() query: ExportQueryRequest,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, contentType } =
      await this.scenariosService.exportByGroup(groupId, query, user.id);

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
    @Body() request: SaveScenariosRequest,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScenarioResponse[]> {
    return this.scenariosService.save(request, user.id);
  }

  @Get('group/:groupId')
  findByGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: PaginationQuery,
  ): Promise<PaginatedResponse<ScenarioWithGroup>> {
    return this.scenariosService.findByGroup(groupId, user.id, pagination);
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
