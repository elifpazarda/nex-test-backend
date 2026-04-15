import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class AiService {
  private async runClaude(
    systemPrompt: string,
    userPrompt: string,
    model = 'sonnet',
  ): Promise<string> {
    const { stdout } = await execFileAsync('claude', [
      '-p',
      userPrompt,
      '--system-prompt',
      systemPrompt,
      '--model',
      model,
      '--output-format',
      'text',
    ]);
    return stdout.trim();
  }

  async generateTestScenario(input: string): Promise<string> {
    const systemPrompt =
      'Sen bir kıdemli QA mühendisisin. Kapsamlı test senaryoları üretirsin.';

    const userPrompt = `Aşağıdaki açıklama için kapsamlı test senaryoları üret.

Açıklama: ${input}

Şu başlıkları içeren test senaryoları yaz:
- Happy path (başarılı akış)
- Edge case'ler (sınır durumlar)
- Negatif senaryolar (hata durumları)

Her senaryo için: Senaryo adı, ön koşullar, adımlar, beklenen sonuç.`;

    return this.runClaude(systemPrompt, userPrompt);
  }

  async convertToBdd(rawScenario: string): Promise<string> {
    const systemPrompt =
      'Sen bir BDD uzmanısın. Test senaryolarını Gherkin formatına dönüştürürsün.';

    const userPrompt = `Aşağıdaki test senaryolarını Gherkin BDD formatına (Feature, Scenario, Given, When, Then) dönüştür. Sadece Gherkin formatında çıktı ver.

Test Senaryoları:
${rawScenario}`;

    return this.runClaude(systemPrompt, userPrompt);
  }
}
