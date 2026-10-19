import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { GenerationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProjectsService } from '../projects/projects.service';
import { JiraService } from '../jira/jira.service';
import { ScenarioGroupsService } from '../scenario-groups/scenario-groups.service';
import { GenerationsService } from '../generations/generations.service';
import {
  GenerateFromTextRequest,
  GenerateFromJiraRequest,
  GenerateFromFileRequest,
  ConvertBddRequest,
  SaveScenariosRequest,
  ImportExcelRequest,
  ExportQueryRequest,
  ExportFormat,
} from './models/scenario.request';
import {
  GenerateScenarioResponse,
  GeneratedScenarioItem,
  ConvertBddResponse,
  ScenarioResponse,
  ScenarioWithGroup,
  ScenarioWithProject,
  ExcelRowData,
  ExcelImportResultItem,
  ExcelImportResponse,
  ExportMetadata,
} from './models/scenario.response';
import {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/models/pagination';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;
import * as path from 'path';

@Injectable()
export class ScenariosService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private projectsService: ProjectsService,
    private jiraService: JiraService,
    private scenarioGroupsService: ScenarioGroupsService,
    private generationsService: GenerationsService,
  ) {}

  async generateFromText(
    request: GenerateFromTextRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    return this.runGeneration(userId, request.projectId, {
      input: request.input,
      sourceType: 'text',
      title: request.title ?? this.deriveTitle(request.input),
    });
  }

  async generateFromJira(
    request: GenerateFromJiraRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const issue = await this.jiraService.getIssue(userId, request.issueKey);
    const input = this.buildJiraInput(issue);

    return this.runGeneration(userId, request.projectId, {
      input,
      sourceType: 'jira',
      sourceRef: issue.key,
      title: request.title ?? `${issue.key} · ${issue.summary}`,
    });
  }

  async generateFromExcel(
    file: Express.Multer.File,
    request: GenerateFromFileRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const input = await this.extractExcelContent(file.buffer);
    if (!input) {
      throw new BadRequestException('Excel dosyasından içerik okunamadı');
    }

    return this.runGeneration(userId, request.projectId, {
      input,
      sourceType: 'excel',
      sourceRef: file.originalname,
      title: request.title ?? file.originalname,
    });
  }

  async generateFromPdf(
    file: Express.Multer.File,
    request: GenerateFromFileRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    let input: string | undefined;
    try {
      const parsed = await pdfParse(file.buffer);
      input = parsed.text?.trim();
    } catch {
      throw new BadRequestException('PDF dosyasından içerik okunamadı');
    }
    if (!input) {
      throw new BadRequestException('PDF dosyasından içerik okunamadı');
    }

    return this.runGeneration(userId, request.projectId, {
      input,
      sourceType: 'pdf',
      sourceRef: file.originalname,
      title: request.title ?? file.originalname,
    });
  }

  // Ortak uretim akisi: AI cagrisini sureyle olcer, sonucu bir Generation
  // calistirmasi olarak kaydeder (Gecmis ekranini besler) ve response'a
  // generationId ekler. AI hatasinda FAILED kaydi yazip hatayi tekrar firlatir.
  private async runGeneration(
    userId: string,
    projectId: string,
    params: {
      input: string;
      sourceType: string;
      sourceRef?: string;
      title: string;
    },
  ): Promise<GenerateScenarioResponse> {
    const start = Date.now();
    let scenarios: GeneratedScenarioItem[];

    try {
      scenarios = await this.aiService.generateTestScenario(params.input);
    } catch (error) {
      await this.generationsService.record({
        userId,
        projectId,
        title: params.title,
        sourceType: params.sourceType,
        sourceRef: params.sourceRef,
        scenarioCount: 0,
        durationMs: Date.now() - start,
        status: GenerationStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Üretim hatası',
      });
      throw error;
    }

    const generation = await this.generationsService.record({
      userId,
      projectId,
      title: params.title,
      sourceType: params.sourceType,
      sourceRef: params.sourceRef,
      scenarioCount: scenarios.length,
      durationMs: Date.now() - start,
      status:
        scenarios.length === 0
          ? GenerationStatus.WARNING
          : GenerationStatus.SUCCESS,
    });

    return {
      scenarios,
      input: params.input,
      sourceType: params.sourceType,
      sourceRef: params.sourceRef,
      generationId: generation.id,
    };
  }

  // Serbest metinden kisa bir baslik turetir (ilk satir / ~60 karakter).
  private deriveTitle(input: string): string {
    const firstLine = input.split('\n')[0].trim();
    const base = firstLine.length > 0 ? firstLine : input.trim();
    return base.length > 60 ? `${base.slice(0, 57)}...` : base;
  }

  async convertToBdd(
    request: ConvertBddRequest,
    userId: string,
  ): Promise<ConvertBddResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const scenarioText = request.scenarios
      .map(
        (s) =>
          `[${s.id}] Senaryo: ${s.title}\nÖn Koşullar: ${s.preconditions}\nAdımlar:\n${s.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\nBeklenen Sonuç: ${s.expectedResult}`,
      )
      .join('\n\n---\n\n');

    const framework = request.framework ?? 'cucumber';
    const results = await this.aiService.convertToCode(scenarioText, framework);

    return { framework, results };
  }

  async save(
    request: SaveScenariosRequest,
    userId: string,
  ): Promise<ScenarioResponse[]> {
    const group = await this.scenarioGroupsService.findOne(
      request.groupId,
      userId,
    );

    const saved: ScenarioResponse[] = [];

    for (const s of request.scenarios) {
      const rawOutput = JSON.stringify({
        category: s.category,
        priority: s.priority,
        preconditions: s.preconditions,
        steps: s.steps,
        expectedResult: s.expectedResult,
      });

      const bddOutput = s.bdd ? JSON.stringify(s.bdd) : '';

      const record = await this.prisma.testScenario.create({
        data: {
          title: s.title,
          input: request.input,
          rawOutput,
          bddOutput,
          category: s.category,
          priority: s.priority,
          preconditions: s.preconditions,
          steps: s.steps,
          expectedResult: s.expectedResult,
          sourceType: request.sourceType ?? null,
          sourceRef: request.sourceRef ?? null,
          projectId: group.projectId,
          groupId: request.groupId,
        },
      });

      saved.push(record);
    }

    if (saved.length > 0) {
      await this.touchGroupAndProject(request.groupId, group.projectId);
      if (request.generationId) {
        await this.generationsService.incrementSaved(
          request.generationId,
          userId,
          saved.length,
        );
      }
    }

    return saved;
  }

  // Oturumsuz akislar (webhook gibi) icin: senaryoyu uretir VE dogrudan hedef
  // gruba kaydeder. runGeneration (AI + Generation run kaydi) ile save'i birlestirir;
  // grup sahipligi scenarioGroupsService.findOne ile dogrulanir.
  async generateAndSaveToGroup(
    userId: string,
    groupId: string,
    params: {
      input: string;
      sourceType: string;
      sourceRef?: string;
      title: string;
    },
  ): Promise<{ generationId: string; scenarioCount: number; savedCount: number }> {
    const group = await this.scenarioGroupsService.findOne(groupId, userId);

    const gen = await this.runGeneration(userId, group.projectId, params);
    if (gen.scenarios.length === 0) {
      return { generationId: gen.generationId, scenarioCount: 0, savedCount: 0 };
    }

    const saved = await this.save(
      {
        groupId,
        input: gen.input,
        sourceType: params.sourceType,
        sourceRef: params.sourceRef,
        generationId: gen.generationId,
        scenarios: gen.scenarios.map((s) => ({
          title: s.title,
          category: s.category,
          priority: s.priority,
          preconditions: s.preconditions,
          steps: s.steps,
          expectedResult: s.expectedResult,
        })),
      } as SaveScenariosRequest,
      userId,
    );

    return {
      generationId: gen.generationId,
      scenarioCount: gen.scenarios.length,
      savedCount: saved.length,
    };
  }

  // Senaryo ekleme/silme, parent grup ve projenin @updatedAt'ini otomatik
  // tetiklemez (Prisma sadece ilgili satir yazilinca gunceller). Bu yuzden
  // senaryo aktivitesinden sonra grup ve projeyi acikca "dokunuyoruz" ki
  // "son guncelleme" degerleri gercek aktiviteyi yansitsin.
  private async touchGroupAndProject(
    groupId: string,
    projectId: string,
  ): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.scenarioGroup.update({
        where: { id: groupId },
        data: { updatedAt: now },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: now },
      }),
    ]);
  }

  private buildJiraInput(issue: {
    key: string;
    summary: string;
    description: string;
    issueType: string;
  }): string {
    const parts: string[] = [
      `Jira Issue: ${issue.key} (${issue.issueType})`,
      `Summary: ${issue.summary}`,
    ];
    if (issue.description) {
      parts.push(`Description:\n${issue.description}`);
    }
    return parts.join('\n\n');
  }

  async findOne(id: string, userId: string): Promise<ScenarioWithProject> {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: {
        project: true,
        group: { select: { id: true, name: true, type: true } },
      },
    });
    if (!scenario) throw new NotFoundException('Senaryo bulunamadı');
    if (scenario.project.userId !== userId)
      throw new ForbiddenException('Erişim yetkisi yok');
    return scenario;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const scenario = await this.findOne(id, userId);
    await this.prisma.testScenario.delete({ where: { id } });
    await this.touchGroupAndProject(scenario.group.id, scenario.project.id);
    return { message: 'Senaryo silindi' };
  }

  async findByGroup(
    groupId: string,
    userId: string,
    pagination: PaginationQuery,
  ): Promise<PaginatedResponse<ScenarioWithGroup>> {
    await this.scenarioGroupsService.findOne(groupId, userId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.testScenario.findMany({
        where: { groupId },
        include: { group: { select: { id: true, name: true, type: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.testScenario.count({ where: { groupId } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportAll(
    projectId: string,
    query: ExportQueryRequest,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const project = await this.projectsService.findOne(projectId, userId);
    const scenarios = await this.getFilteredScenarios(projectId, query);

    if (scenarios.length === 0) {
      throw new BadRequestException('Export edilecek senaryo bulunamadı');
    }

    const metadata: ExportMetadata = {
      source: 'all',
      project: {
        id: project.id,
        name: project.name,
        description: project.description ?? null,
      },
      exportedAt: new Date(),
      scenarioCount: scenarios.length,
    };
    const filenameBase = this.toSafeFilename(project.name);

    return this.runExport(query, scenarios, metadata, filenameBase);
  }

  async exportByGroup(
    groupId: string,
    query: ExportQueryRequest,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const group = await this.scenarioGroupsService.findOne(groupId, userId);
    const project = await this.projectsService.findOne(group.projectId, userId);
    const scenarios = await this.getFilteredScenarios(
      group.projectId,
      query,
      groupId,
    );

    if (scenarios.length === 0) {
      throw new BadRequestException('Export edilecek senaryo bulunamadı');
    }

    const metadata: ExportMetadata = {
      source: 'group',
      project: {
        id: project.id,
        name: project.name,
        description: project.description ?? null,
      },
      group: { id: group.id, name: group.name, type: group.type },
      exportedAt: new Date(),
      scenarioCount: scenarios.length,
    };
    const filenameBase = this.toSafeFilename(group.name);

    return this.runExport(query, scenarios, metadata, filenameBase);
  }

  private toSafeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private runExport(
    query: ExportQueryRequest,
    scenarios: ScenarioWithGroup[],
    metadata: ExportMetadata,
    filenameBase: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    switch (query.format) {
      case ExportFormat.EXCEL:
        return this.exportAsExcel(
          scenarios,
          metadata,
          filenameBase,
          query.xrayFormat,
        );
      case ExportFormat.PDF:
        return this.exportAsPdf(scenarios, metadata, filenameBase);
      case ExportFormat.JSON:
        return this.exportAsJson(scenarios, metadata, filenameBase);
      case ExportFormat.FEATURE:
        return this.exportAsFeature(scenarios, metadata, filenameBase);
    }
  }

  async importExcel(
    file: Express.Multer.File,
    request: ImportExcelRequest,
    userId: string,
  ): Promise<ExcelImportResponse> {
    const group = await this.scenarioGroupsService.findOne(
      request.groupId,
      userId,
    );

    const rows = await this.parseExcel(file.buffer);
    if (rows.length === 0) {
      throw new BadRequestException(
        'Excel dosyasında işlenecek satır bulunamadı',
      );
    }

    const saveResults =
      request.saveResults === true ||
      (request.saveResults as unknown) === 'true';

    const results: ExcelImportResultItem[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const row of rows) {
      const input = this.buildInput(row);

      let bddOutput = '';
      let aiError: string | undefined;

      try {
        const codeResults = await this.aiService.convertToCode(
          input,
          'cucumber',
        );
        bddOutput = JSON.stringify(codeResults);
      } catch (error) {
        aiError = error instanceof Error ? error.message : 'BDD dönüşüm hatası';
      }

      const resultItem: ExcelImportResultItem = {
        rowNumber: row.rowNumber,
        issueKey: row.issueKey,
        testSummary: row.testSummary,
        input,
        bddOutput,
        error: aiError,
      };

      if (saveResults) {
        try {
          const saved = await this.prisma.testScenario.create({
            data: {
              title:
                row.testSummary ||
                row.issueKey ||
                row.action.slice(0, 50) ||
                `Row ${row.rowNumber}`,
              input,
              rawOutput: input,
              bddOutput,
              category: '',
              priority: '',
              preconditions: '',
              steps: [],
              expectedResult: '',
              projectId: group.projectId,
              groupId: request.groupId,
            },
          });
          resultItem.savedId = saved.id;
        } catch (error) {
          resultItem.error =
            error instanceof Error ? error.message : 'Kaydetme hatası';
        }
      }

      if (aiError) {
        failureCount++;
      } else {
        successCount++;
      }

      results.push(resultItem);
    }

    if (results.some((r) => r.savedId)) {
      await this.touchGroupAndProject(request.groupId, group.projectId);
    }

    return { totalRows: rows.length, successCount, failureCount, results };
  }

  async exportSingle(
    id: string,
    query: ExportQueryRequest,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const scenario = await this.findOne(id, userId);

    const metadata: ExportMetadata = {
      source: 'single',
      project: {
        id: scenario.project.id,
        name: scenario.project.name,
        description: scenario.project.description ?? null,
      },
      group: {
        id: scenario.group.id,
        name: scenario.group.name,
        type: scenario.group.type,
      },
      exportedAt: new Date(),
      scenarioCount: 1,
    };
    const filenameBase = this.toSafeFilename(scenario.title);

    return this.runExport(query, [scenario], metadata, filenameBase);
  }

  private async getFilteredScenarios(
    projectId: string,
    query: ExportQueryRequest,
    groupId?: string,
  ): Promise<ScenarioWithGroup[]> {
    const where: Record<string, unknown> = { projectId };
    if (groupId) where.groupId = groupId;

    if (query.startDate || query.endDate) {
      const createdAt: Record<string, string> = {};
      if (query.startDate) createdAt.gte = query.startDate;
      if (query.endDate) createdAt.lte = query.endDate;
      where.createdAt = createdAt;
    }

    return this.prisma.testScenario.findMany({
      where,
      include: { group: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async exportAsExcel(
    scenarios: ScenarioWithGroup[],
    metadata: ExportMetadata,
    name: string,
    xrayFormat?: boolean,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QA Platform';
    workbook.created = metadata.exportedAt;

    if (xrayFormat) {
      this.buildXrayWorksheet(workbook, scenarios);
    } else {
      this.buildScenarioWorksheet(workbook, scenarios, metadata);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      filename: `${name}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private buildXrayWorksheet(
    workbook: ExcelJS.Workbook,
    scenarios: ScenarioWithGroup[],
  ): void {
    const worksheet = workbook.addWorksheet('Scenarios');
    worksheet.columns = [
      { header: 'Issue Id', key: 'issueId', width: 15 },
      { header: 'Issue Key', key: 'issueKey', width: 15 },
      { header: 'Issue Type', key: 'issueType', width: 15 },
      { header: 'Test Type', key: 'testType', width: 15 },
      { header: 'Test Summary', key: 'testSummary', width: 40 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Action', key: 'action', width: 40 },
      { header: 'Data', key: 'data', width: 20 },
      { header: 'Result', key: 'result', width: 40 },
      { header: 'Project key', key: 'projectKey', width: 15 },
      { header: 'Test Repo', key: 'testRepo', width: 15 },
      { header: 'Test Priority', key: 'testPriority', width: 15 },
    ];
    for (const s of scenarios) {
      worksheet.addRow({
        issueId: '',
        issueKey: '',
        issueType: 'Test',
        testType: 'Manual',
        testSummary: s.title,
        description: s.input,
        action: s.bddOutput,
        data: '',
        result: '',
        projectKey: '',
        testRepo: '',
        testPriority: 'Normal',
      });
    }
    this.styleHeader(worksheet);
  }

  private buildScenarioWorksheet(
    workbook: ExcelJS.Workbook,
    scenarios: ScenarioWithGroup[],
    metadata: ExportMetadata,
  ): void {
    const metaSheet = workbook.addWorksheet('Metadata');
    metaSheet.columns = [
      { key: 'field', width: 22 },
      { key: 'value', width: 60 },
    ];
    const metaRows: Array<[string, string]> = [
      ['Project', metadata.project.name],
      ['Project Description', metadata.project.description ?? '-'],
      ['Source', metadata.source],
    ];
    if (metadata.group) {
      metaRows.push(
        ['Group', metadata.group.name],
        ['Group Type', metadata.group.type],
      );
    }
    metaRows.push(
      ['Scenario Count', String(metadata.scenarioCount)],
      ['Exported At', metadata.exportedAt.toISOString()],
    );
    for (const [field, value] of metaRows) {
      const row = metaSheet.addRow({ field, value });
      row.getCell('field').font = { bold: true };
      row.getCell('value').alignment = { wrapText: true, vertical: 'top' };
    }

    const sheet = workbook.addWorksheet('Scenarios');
    sheet.columns = [
      { header: 'Title', key: 'title', width: 32 },
      { header: 'Group', key: 'group', width: 22 },
      { header: 'Group Type', key: 'groupType', width: 14 },
      { header: 'Category', key: 'category', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Preconditions', key: 'preconditions', width: 35 },
      { header: 'Steps', key: 'steps', width: 50 },
      { header: 'Expected Result', key: 'expectedResult', width: 35 },
      { header: 'Input', key: 'input', width: 40 },
      { header: 'BDD Output', key: 'bddOutput', width: 50 },
      { header: 'Source Type', key: 'sourceType', width: 14 },
      { header: 'Source Ref', key: 'sourceRef', width: 18 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];

    for (const s of scenarios) {
      const row = sheet.addRow({
        title: s.title,
        group: s.group.name,
        groupType: s.group.type,
        category: s.category,
        priority: s.priority,
        preconditions: s.preconditions,
        steps: s.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n'),
        expectedResult: s.expectedResult,
        input: s.input,
        bddOutput: s.bddOutput,
        sourceType: s.sourceType ?? '',
        sourceRef: s.sourceRef ?? '',
        createdAt: s.createdAt,
      });
      row.alignment = { wrapText: true, vertical: 'top' };
    }

    this.styleHeader(sheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };
  }

  private styleHeader(worksheet: ExcelJS.Worksheet): void {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 22;
  }

  private exportAsPdf(
    scenarios: ScenarioWithGroup[],
    metadata: ExportMetadata,
    name: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return new Promise((resolve) => {
      const fontPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'assets',
        'fonts',
        'NotoSans-Regular.ttf',
      );
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          filename: `${name}.pdf`,
          contentType: 'application/pdf',
        });
      });

      doc.registerFont('NotoSans', fontPath);
      doc.font('NotoSans');

      const headerTitle = metadata.group
        ? `${metadata.project.name} — ${metadata.group.name}`
        : metadata.project.name;

      doc.fontSize(20).text(headerTitle, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Project: ${metadata.project.name}`);
      if (metadata.group) {
        doc.text(`Group: ${metadata.group.name} (${metadata.group.type})`);
      }
      doc.text(`Scenarios: ${metadata.scenarioCount}`);
      doc.text(`Exported At: ${metadata.exportedAt.toISOString()}`);
      doc.moveDown(1.5);

      for (let i = 0; i < scenarios.length; i++) {
        const s = scenarios[i];

        if (i > 0) doc.addPage();

        doc.fontSize(14).text(s.title);
        doc.moveDown(0.3);

        doc
          .fontSize(9)
          .text(
            `Group: ${s.group.name} (${s.group.type})  •  Category: ${s.category || '-'}  •  Priority: ${s.priority || '-'}`,
          );
        doc.moveDown(0.6);

        if (s.preconditions) {
          doc.fontSize(11).text('Preconditions');
          doc.fontSize(10).text(s.preconditions);
          doc.moveDown(0.5);
        }

        if (s.steps?.length) {
          doc.fontSize(11).text('Steps');
          doc.fontSize(10);
          s.steps.forEach((step, idx) => doc.text(`${idx + 1}. ${step}`));
          doc.moveDown(0.5);
        }

        if (s.expectedResult) {
          doc.fontSize(11).text('Expected Result');
          doc.fontSize(10).text(s.expectedResult);
          doc.moveDown(0.5);
        }

        if (s.input) {
          doc.fontSize(11).text('Input');
          doc.fontSize(10).text(s.input);
          doc.moveDown(0.5);
        }

        if (s.bddOutput) {
          doc.fontSize(11).text('BDD Output');
          doc.fontSize(10).text(s.bddOutput);
          doc.moveDown(0.5);
        }
      }

      doc.end();
    });
  }

  private async exportAsJson(
    scenarios: ScenarioWithGroup[],
    metadata: ExportMetadata,
    name: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const payload = {
      metadata: {
        source: metadata.source,
        project: metadata.project,
        group: metadata.group,
        scenarioCount: metadata.scenarioCount,
        exportedAt: metadata.exportedAt.toISOString(),
      },
      scenarios: scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        group: s.group,
        category: s.category,
        priority: s.priority,
        preconditions: s.preconditions,
        steps: s.steps,
        expectedResult: s.expectedResult,
        input: s.input,
        bddOutput: s.bddOutput,
        sourceType: s.sourceType,
        sourceRef: s.sourceRef,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };

    const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');

    return {
      buffer,
      filename: `${name}.json`,
      contentType: 'application/json',
    };
  }

  private async exportAsFeature(
    scenarios: ScenarioWithGroup[],
    metadata: ExportMetadata,
    name: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const lines: string[] = [];

    lines.push(`# Project: ${metadata.project.name}`);
    if (metadata.group) {
      lines.push(`# Group: ${metadata.group.name} (${metadata.group.type})`);
    }
    lines.push(`# Scenarios: ${metadata.scenarioCount}`);
    lines.push(`# Exported At: ${metadata.exportedAt.toISOString()}`);
    lines.push('');

    const featureTitle = metadata.group
      ? `${metadata.project.name} — ${metadata.group.name}`
      : metadata.project.name;
    lines.push(`Feature: ${featureTitle}`);
    lines.push('');

    for (const s of scenarios) {
      lines.push(`  # ${s.title}`);
      lines.push(
        `  # Group: ${s.group.name} (${s.group.type}) | Category: ${s.category || '-'} | Priority: ${s.priority || '-'}`,
      );
      const bddLines = s.bddOutput
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      lines.push(bddLines);
      lines.push('');
    }

    const buffer = Buffer.from(lines.join('\n'), 'utf-8');

    return {
      buffer,
      filename: `${name}.feature`,
      contentType: 'text/plain',
    };
  }

  private async parseExcel(buffer: Buffer): Promise<ExcelRowData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException(
        'Excel dosyasında çalışma sayfası bulunamadı',
      );
    }

    const headerRow = worksheet.getRow(1);
    const columnMap = new Map<string, number>();

    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value ?? '')
        .trim()
        .toLowerCase();
      columnMap.set(header, colNumber);
    });

    const requiredColumns = ['test summary', 'action'];
    for (const col of requiredColumns) {
      if (!columnMap.has(col)) {
        throw new BadRequestException(
          `Gerekli sütun bulunamadı: "${col}". Excel dosyasının başlık satırını kontrol edin.`,
        );
      }
    }

    const rows: ExcelRowData[] = [];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const getCellValue = (header: string): string => {
        const colNum = columnMap.get(header);
        if (!colNum) return '';
        return String(row.getCell(colNum).value ?? '').trim();
      };

      const action = getCellValue('action');
      const description = getCellValue('description');
      const result = getCellValue('result');
      const testSummary = getCellValue('test summary');

      if (!action && !description && !result && !testSummary) {
        continue;
      }

      rows.push({
        rowNumber: i,
        issueKey: getCellValue('issue key'),
        testSummary,
        testType: getCellValue('test type'),
        action,
        data: getCellValue('data'),
        result,
        description,
      });
    }

    return rows;
  }

  private buildInput(row: ExcelRowData): string {
    const parts: string[] = [];

    if (row.testSummary) parts.push(`Test Case: ${row.testSummary}`);
    if (row.description) parts.push(`Description: ${row.description}`);
    if (row.action) parts.push(`Action: ${row.action}`);
    if (row.data) parts.push(`Test Data: ${row.data}`);
    if (row.result) parts.push(`Expected Result: ${row.result}`);

    return parts.join('\n');
  }

  private async extractExcelContent(buffer: Buffer): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const lines: string[] = [];

    for (const worksheet of workbook.worksheets) {
      lines.push(`--- ${worksheet.name} ---`);
      worksheet.eachRow((row) => {
        const values = row.values as (string | number | null)[];
        const cells = values
          .slice(1)
          .map((v) => String(v ?? '').trim())
          .filter((v) => v);
        if (cells.length > 0) {
          lines.push(cells.join(' | '));
        }
      });
      lines.push('');
    }

    return lines.join('\n').trim();
  }
}
