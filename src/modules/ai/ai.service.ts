import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  GeneratedScenarioItem,
  CodeGenerationItem,
} from '../scenarios/models/scenario.response';

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 5 * 1024 * 1024;

@Injectable()
export class AiService {
  private readonly promptsDir = join(__dirname, 'prompts');

  private readPrompt(filename: string): string {
    return readFileSync(join(this.promptsDir, filename), 'utf-8').trim();
  }

  private async runClaudeWithSchema(
    systemPrompt: string,
    userPrompt: string,
    jsonSchema: string,
    model = 'sonnet',
  ): Promise<string> {
    let stdout = '';
    try {
      const result = await execFileAsync(
        'claude',
        [
          '-p',
          userPrompt,
          '--system-prompt',
          systemPrompt,
          '--model',
          model,
          '--output-format',
          'json',
          '--json-schema',
          jsonSchema,
        ],
        { maxBuffer: MAX_BUFFER },
      );
      stdout = result.stdout;
    } catch (error) {
      // claude CLI non-zero exit ile cikabilir; stdout yine de JSON zarfi icerebilir
      stdout = (error as { stdout?: string }).stdout ?? '';
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new ServiceUnavailableException(
        'AI servisi yanıt vermedi, lütfen tekrar deneyin',
      );
    }

    let envelope: { is_error?: boolean; result?: string };
    try {
      envelope = JSON.parse(trimmed) as { is_error?: boolean; result?: string };
    } catch {
      throw new ServiceUnavailableException(
        'AI servisinden geçersiz yanıt alındı, lütfen tekrar deneyin',
      );
    }

    if (envelope.is_error) {
      throw new ServiceUnavailableException(
        'AI servisi şu an yanıt veremedi, lütfen tekrar deneyin',
      );
    }

    return trimmed;
  }

  async generateTestScenario(input: string): Promise<GeneratedScenarioItem[]> {
    const systemPrompt = this.readPrompt('generate-scenario.system.txt');
    const userTemplate = this.readPrompt('generate-scenario.user.txt');
    const schema = this.readPrompt('generate-scenario.schema.json');

    const userPrompt = userTemplate.replace('{{input}}', input);

    const raw = await this.runClaudeWithSchema(
      systemPrompt,
      userPrompt,
      schema,
    );

    const parsed = JSON.parse(raw) as {
      structured_output?: { scenarios?: GeneratedScenarioItem[] };
    };
    return parsed.structured_output?.scenarios ?? [];
  }

  async convertToCode(
    rawScenario: string,
    framework: string,
  ): Promise<CodeGenerationItem[]> {
    const frameworkDir = join(this.promptsDir, 'frameworks', framework);

    if (!existsSync(frameworkDir)) {
      throw new BadRequestException(`Desteklenmeyen framework: ${framework}`);
    }

    const systemPrompt = readFileSync(
      join(frameworkDir, 'system.txt'),
      'utf-8',
    ).trim();
    const userTemplate = readFileSync(
      join(frameworkDir, 'user.txt'),
      'utf-8',
    ).trim();
    const schema = readFileSync(
      join(frameworkDir, 'schema.json'),
      'utf-8',
    ).trim();

    const userPrompt = userTemplate.replace('{{input}}', rawScenario);

    const raw = await this.runClaudeWithSchema(
      systemPrompt,
      userPrompt,
      schema,
    );

    const parsed = JSON.parse(raw) as {
      structured_output?: { results?: CodeGenerationItem[] };
    };

    const results = parsed.structured_output?.results ?? [];
    return results.map((r) => ({ ...r, framework }));
  }
}
