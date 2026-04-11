import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private client: Anthropic;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  async generateTestScenario(input: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Sen bir kıdemli QA mühendisisin. Aşağıdaki açıklama için kapsamlı test senaryoları üret.

Açıklama: ${input}

Şu başlıkları içeren test senaryoları yaz:
- Happy path (başarılı akış)
- Edge case'ler (sınır durumlar)
- Negatif senaryolar (hata durumları)

Her senaryo için: Senaryo adı, ön koşullar, adımlar, beklenen sonuç.`,
        },
      ],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async convertToBdd(rawScenario: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Aşağıdaki test senaryolarını Gherkin BDD formatına (Feature, Scenario, Given, When, Then) dönüştür. Sadece Gherkin formatında çıktı ver.

Test Senaryoları:
${rawScenario}`,
        },
      ],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async evaluateQuality(
    rawScenario: string,
  ): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Aşağıdaki test senaryolarını kalite açısından değerlendir.

Değerlendirme kriterleri:
- Kapsam genişliği (happy path, edge case, negatif)
- Adımların netliği
- Beklenen sonuçların açıklığı

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey ekleme:
{"score": <0-100 arası tam sayı>, "feedback": "<kısa değerlendirme metni>"}

Test Senaryoları:
${rawScenario}`,
        },
      ],
    });

    try {
      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';
      const parsed = JSON.parse(text) as { score?: number; feedback?: string };
      return { score: parsed.score ?? 50, feedback: parsed.feedback ?? '' };
    } catch {
      return { score: 50, feedback: 'Değerlendirme yapılamadı' };
    }
  }
}
