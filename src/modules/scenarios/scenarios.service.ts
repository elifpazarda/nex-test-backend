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
import {
  GenerateScenarioRequest,
  GenerateFromJiraRequest,
  SaveScenarioRequest,
  ImportExcelRequest,
  ExportQueryRequest,
  ExportFormat,
} from './models/scenario.request';
import {
  GenerateScenarioResponse,
  GenerateFromJiraResponse,
  ScenarioResponse,
  ScenarioWithProject,
  ExcelRowData,
  ExcelImportResultItem,
  ExcelImportResponse,
} from './models/scenario.response';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as path from 'path';

@Injectable()
export class ScenariosService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private projectsService: ProjectsService,
    private jiraService: JiraService,
  ) {}

  async generate(
    request: GenerateScenarioRequest,
    userId: string,
  ): Promise<GenerateScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const rawOutput = await this.aiService.generateTestScenario(request.input);
    const bddOutput = await this.aiService.convertToBdd(rawOutput);
    const { score, feedback } = await this.aiService.evaluateQuality(rawOutput);

    return {
      rawOutput,
      bddOutput,
      qualityScore: score,
      qualityFeedback: feedback,
    };
  }

  async generateFromJira(
    request: GenerateFromJiraRequest,
    userId: string,
  ): Promise<GenerateFromJiraResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const issue = await this.jiraService.getIssue(userId, request.issueKey);
    const input = this.buildJiraInput(issue);

    const rawOutput = await this.aiService.generateTestScenario(input);
    const bddOutput = await this.aiService.convertToBdd(rawOutput);
    const { score, feedback } = await this.aiService.evaluateQuality(rawOutput);

    return {
      input,
      rawOutput,
      bddOutput,
      qualityScore: score,
      qualityFeedback: feedback,
      jiraIssue: {
        key: issue.key,
        summary: issue.summary,
        issueType: issue.issueType,
        status: issue.status,
        url: issue.url,
      },
    };
  }

  async save(
    request: SaveScenarioRequest,
    userId: string,
  ): Promise<ScenarioResponse> {
    await this.projectsService.findOne(request.projectId, userId);
    return this.prisma.testScenario.create({
      data: {
        title: request.title,
        input: request.input,
        rawOutput: request.rawOutput,
        bddOutput: request.bddOutput,
        qualityScore: request.qualityScore,
        qualityFeedback: request.qualityFeedback ?? '',
        sourceType: request.sourceType ?? null,
        sourceRef: request.sourceRef ?? null,
        projectId: request.projectId,
      },
    });
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

  async findByProject(
    projectId: string,
    userId: string,
  ): Promise<ScenarioResponse[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.prisma.testScenario.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<ScenarioWithProject> {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { project: true },
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

  async importExcel(
    file: Express.Multer.File,
    request: ImportExcelRequest,
    userId: string,
  ): Promise<ExcelImportResponse> {
    await this.projectsService.findOne(request.projectId, userId);

    const rows = await this.parseExcel(file.buffer);
    if (rows.length === 0) {
      throw new BadRequestException('Excel dosyasında işlenecek satır bulunamadı');
    }

    const evaluateQuality = (request.evaluateQuality as unknown) !== false && (request.evaluateQuality as unknown) !== 'false';
    const saveResults = request.saveResults === true || (request.saveResults as unknown) === 'true';

    const results: ExcelImportResultItem[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const row of rows) {
      const input = this.buildInput(row);

      let bddOutput = '';
      let qualityScore: number | undefined;
      let qualityFeedback: string | undefined;
      let aiError: string | undefined;

      try {
        bddOutput = await this.aiService.convertToBdd(input);
      } catch (error) {
        aiError = error instanceof Error ? error.message : 'BDD dönüşüm hatası';
      }

      if (evaluateQuality && !aiError) {
        try {
          const result = await this.aiService.evaluateQuality(input);
          qualityScore = result.score;
          qualityFeedback = result.feedback;
        } catch {
          // Kalite değerlendirmesi başarısız olursa devam et
        }
      }

      const resultItem: ExcelImportResultItem = {
        rowNumber: row.rowNumber,
        issueKey: row.issueKey,
        testSummary: row.testSummary,
        input,
        bddOutput,
        qualityScore,
        qualityFeedback,
        error: aiError,
      };

      if (saveResults) {
        try {
          const saved = await this.prisma.testScenario.create({
            data: {
              title: row.testSummary || row.issueKey || row.action.slice(0, 50) || `Row ${row.rowNumber}`,
              input,
              rawOutput: input,
              bddOutput,
              qualityScore: qualityScore ?? 0,
              qualityFeedback: qualityFeedback ?? '',
              projectId: request.projectId,
            },
          });
          resultItem.savedId = saved.id;
        } catch (error) {
          resultItem.error = error instanceof Error ? error.message : 'Kaydetme hatası';
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

  async exportByProject(
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
  ): Promise<ScenarioResponse[]> {
    const where: Record<string, unknown> = { projectId };

    if (query.minScore !== undefined) {
      where.qualityScore = { gte: query.minScore };
    }

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
        { header: 'Quality Score', key: 'qualityScore', width: 15 },
        { header: 'Quality Feedback', key: 'qualityFeedback', width: 30 },
        { header: 'Created At', key: 'createdAt', width: 25 },
      ];

      for (const s of scenarios) {
        worksheet.addRow({
          title: s.title,
          input: s.input,
          bddOutput: s.bddOutput,
          qualityScore: s.qualityScore,
          qualityFeedback: s.qualityFeedback,
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
      const fontPath = path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'NotoSans-Regular.ttf');
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

        doc.fontSize(10).text(`Quality Score: ${s.qualityScore}/100`);
        if (s.qualityFeedback) {
          doc.text(`Feedback: ${s.qualityFeedback}`);
        }
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
      qualityScore: s.qualityScore,
      qualityFeedback: s.qualityFeedback,
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
      throw new BadRequestException('Excel dosyasında çalışma sayfası bulunamadı');
    }

    const headerRow = worksheet.getRow(1);
    const columnMap = new Map<string, number>();

    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value ?? '').trim().toLowerCase();
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
}
