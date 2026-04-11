# AI Module

Anthropic Claude API entegrasyonu. Test senaryosu uretimi, BDD donusumu ve kalite degerlendirmesi.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `ai.service.ts` | Claude API istemcisi, 3 ana metod |
| `ai.module.ts` | AiService export eder |

## Metodlar

| Metod | Girdi | Cikti | Aciklama |
|-------|-------|-------|----------|
| `generateTestScenario(input)` | Dogal dilde test aciklamasi | `string` | Happy path, edge case, negatif senaryolar uretir |
| `convertToBdd(rawScenario)` | Ham senaryo metni | `string` | Gherkin BDD formatina donusturur (Given/When/Then) |
| `evaluateQuality(rawScenario)` | Ham senaryo metni | `{ score, feedback }` | 0-100 arasi kalite puani ve geri bildirim |

## Claude API Detaylari

- Model: `claude-opus-4-5`
- Max tokens: 2048 (uretim/donusum), 1024 (degerlendirme)
- Prompt dili: Turkce
- `evaluateQuality` JSON parse yapar, hata durumunda `{ score: 50, feedback: "..." }` doner

## Ortam Degiskenleri

| Degisken | Kullanim |
|----------|----------|
| `ANTHROPIC_API_KEY` | Claude API erisim anahtari |

## Kullanim

Bu modul dogrudan endpoint sunmaz. `ScenariosModule` tarafindan import edilir ve `ScenariosService` icinden cagirilir.
