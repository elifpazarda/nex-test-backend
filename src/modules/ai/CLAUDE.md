# AI Module

Claude CLI ile test senaryosu uretimi ve kod donusumu. Dogrudan Anthropic SDK kullanmaz, `claude` CLI aracini `execFile` ile calistirir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `ai.service.ts` | Claude CLI calistirma, JSON schema ile yapilandirilmis cikti |
| `ai.module.ts` | AiService export eder |
| `prompts/` | Sistem/kullanici prompt dosyalari ve JSON schemalari |
| `prompts/frameworks/` | Framework bazli prompt dosyalari (cucumber, playwright, cypress, vb.) |

## Metodlar

| Metod | Girdi | Cikti | Aciklama |
|-------|-------|-------|----------|
| `generateTestScenario(input)` | Dogal dilde test aciklamasi | `GeneratedScenarioItem[]` | Happy path, edge case, negatif senaryolar uretir |
| `convertToCode(rawScenario, framework)` | Ham senaryo metni + framework adi | `CodeGenerationItem[]` | Framework bazli BDD/test kodu uretir |

## Claude CLI Calisma Sekli

```
execFile('claude', [
  '-p', userPrompt,
  '--system-prompt', systemPrompt,
  '--model', model,          // varsayilan: 'sonnet'
  '--output-format', 'json',
  '--json-schema', schema
])
```

- Prompt dosyalari `prompts/` dizininden okunur (`readFileSync`)
- `{{input}}` placeholder'i kullanici girdisiyle degistirilir
- JSON schema ile yapilandirilmis cikti alinir (`structured_output`)
- Max buffer: 5MB

### Framework Bazli Kod Donusumu

`convertToCode()` icin her framework kendi prompt dizinine sahip:

```
prompts/frameworks/{framework}/
  system.txt     # Sistem promptu
  user.txt       # Kullanici promptu ({{input}} placeholder)
  schema.json    # JSON cikti schemasi
```

Desteklenmeyen framework icin `BadRequestException` firlatilir.

## Kullanim

Bu modul dogrudan endpoint sunmaz. `ScenariosModule` tarafindan import edilir ve `ScenariosService` icinden cagirilir.

## Onkosullar

- `claude` CLI sisteme kurulu ve PATH'te erisilebilir olmali
- Anthropic API anahtari CLI tarafinda yapilandirilmis olmali (`claude` komutu kendi konfigurasyonunu kullanir)
