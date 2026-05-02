import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProjectsService } from '../projects/projects.service';
import { JiraService } from '../jira/jira.service';
import { ScenarioGroupsService } from '../scenario-groups/scenario-groups.service';
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
  ConvertBddResponse,
  ScenarioResponse,
  ScenarioWithGroup,
  ScenarioWithProject,
  ExcelRowData,
  ExcelImportResultItem,
  ExcelImportResponse,
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
  ) {}

  async generateFromText(
    request: GenerateFromTextRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const scenarios = await this.aiService.generateTestScenario(request.input);

    return { scenarios, input: request.input, sourceType: 'text' };
  }

  async generateFromJira(
    request: GenerateFromJiraRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const issue = await this.jiraService.getIssue(userId, request.issueKey);
    const input = this.buildJiraInput(issue);

    const scenarios = await this.aiService.generateTestScenario(input);

    return {
      scenarios,
      input,
      sourceType: 'jira',
      sourceRef: issue.key,
    };
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

    const scenarios = await this.aiService.generateTestScenario(input);

    return {
      scenarios,
      input,
      sourceType: 'excel',
      sourceRef: file.originalname,
    };
  }

  async generateFromPdf(
    file: Express.Multer.File,
    request: GenerateFromFileRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const parsed = await pdfParse(file.buffer);
    const input = parsed.text?.trim();
    if (!input) {
      throw new BadRequestException('PDF dosyasından içerik okunamadı');
    }

    const scenarios = await this.aiService.generateTestScenario(input);

    return {
      scenarios,
      input,
      sourceType: 'pdf',
      sourceRef: file.originalname,
    };
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

    return saved;
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
    await this.findOne(id, userId);
    await this.prisma.testScenario.delete({ where: { id } });
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

    const projectName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');

    switch (query.format) {
      case ExportFormat.EXCEL:
        return this.exportAsExcel(scenarios, projectName, query.xrayFormat);
      case ExportFormat.PDF:
        return this.exportAsPdf(scenarios, project.name);
      case ExportFormat.JSON:
        return this.exportAsJson(scenarios, projectName);
      case ExportFormat.FEATURE:
        return this.exportAsFeature(scenarios, project.name, projectName);
    }
  }

  async exportByGroup(
    groupId: string,
    query: ExportQueryRequest,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const group = await this.scenarioGroupsService.findOne(groupId, userId);
    const scenarios = await this.getFilteredScenarios(
      group.projectId,
      query,
      groupId,
    );

    if (scenarios.length === 0) {
      throw new BadRequestException('Export edilecek senaryo bulunamadı');
    }

    const groupName = group.name.replace(/[^a-zA-Z0-9-_]/g, '_');

    switch (query.format) {
      case ExportFormat.EXCEL:
        return this.exportAsExcel(scenarios, groupName, query.xrayFormat);
      case ExportFormat.PDF:
        return this.exportAsPdf(scenarios, group.name);
      case ExportFormat.JSON:
        return this.exportAsJson(scenarios, groupName);
      case ExportFormat.FEATURE:
        return this.exportAsFeature(scenarios, group.name, groupName);
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

    return { totalRows: rows.length, successCount, failureCount, results };
  }

  async exportSingle(
    id: string,
    query: ExportQueryRequest,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const scenario = await this.findOne(id, userId);

    const scenarioName = scenario.title.replace(/[^a-zA-Z0-9-_]/g, '_');

    switch (query.format) {
      case ExportFormat.EXCEL:
        return this.exportAsExcel([scenario], scenarioName, query.xrayFormat);
      case ExportFormat.PDF:
        return this.exportAsPdf([scenario], scenario.title);
      case ExportFormat.JSON:
        return this.exportAsJson([scenario], scenarioName);
      case ExportFormat.FEATURE:
        return this.exportAsFeature([scenario], scenario.title, scenarioName);
    }
  }

  private async getFilteredScenarios(
    projectId: string,
    query: ExportQueryRequest,
    groupId?: string,
  ): Promise<ScenarioResponse[]> {
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
      orderBy: { createdAt: 'desc' },
    });
  }

  private async exportAsExcel(
    scenarios: ScenarioResponse[],
    name: string,
    xrayFormat?: boolean,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scenarios');

    if (xrayFormat) {
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
    } else {
      worksheet.columns = [
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Input', key: 'input', width: 40 },
        { header: 'BDD Output', key: 'bddOutput', width: 50 },
        { header: 'Created At', key: 'createdAt', width: 25 },
      ];

      for (const s of scenarios) {
        worksheet.addRow({
          title: s.title,
          input: s.input,
          bddOutput: s.bddOutput,
          createdAt: s.createdAt,
        });
      }
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      filename: `${name}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private exportAsPdf(
    scenarios: ScenarioResponse[],
    title: string,
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
        const filename = title.replace(/[^a-zA-Z0-9-_]/g, '_');
        resolve({
          buffer,
          filename: `${filename}.pdf`,
          contentType: 'application/pdf',
        });
      });

      doc.registerFont('NotoSans', fontPath);
      doc.font('NotoSans');

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown(2);

      for (let i = 0; i < scenarios.length; i++) {
        const s = scenarios[i];

        if (i > 0) {
          doc.addPage();
        }

        doc.fontSize(14).text(s.title, { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(11).text('Input:', { underline: true });
        doc.fontSize(10).text(s.input);
        doc.moveDown(0.5);

        doc.fontSize(11).text('BDD Output:', { underline: true });
        doc.fontSize(10).text(s.bddOutput);
        doc.moveDown(1);
      }

      doc.end();
    });
  }

  private async exportAsJson(
    scenarios: ScenarioResponse[],
    name: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const data = scenarios.map((s) => ({
      title: s.title,
      input: s.input,
      bddOutput: s.bddOutput,
      createdAt: s.createdAt,
    }));

    const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');

    return {
      buffer,
      filename: `${name}.json`,
      contentType: 'application/json',
    };
  }

  private async exportAsFeature(
    scenarios: ScenarioResponse[],
    featureTitle: string,
    name: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const lines: string[] = [`Feature: ${featureTitle}`, ''];

    for (const s of scenarios) {
      lines.push(`  # ${s.title}`);
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
