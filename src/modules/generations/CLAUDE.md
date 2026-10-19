# Generations Module

AI uretim gecmisi (Gecmis / tum uretimler ekrani). Her `generate/*` cagrisi bir
`Generation` calistirmasi olarak kaydedilir; bu modul o kayitlari listeler ve
ozet istatistik uretir. Senaryolardan bagimsizdir: uret endpointleri senaryoyu
kaydetmese bile burada bir "run" olusur (sure, durum, uretilen sayisi).

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `generations.controller.ts` | Route handler'lari (JWT korumali) |
| `generations.service.ts` | Kayit (`record`), korunan sayisi (`incrementSaved`), listeleme, istatistik |
| `generations.module.ts` | `GenerationsService` export eder (ScenariosModule import eder) |
| `models/generation.request.ts` | `GenerationListQuery` (pagination + sourceType filtresi + search) |
| `models/generation.response.ts` | `GenerationResponse`, `GenerationStatsResponse` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | /generations | `GenerationListQuery` | `PaginatedResponse<GenerationResponse>` |
| GET | /generations/stats | - | `GenerationStatsResponse` |

Her ikisi de JWT korumali; sadece istegi yapan kullanicinin run'larini doner.

## Akis

```
Kayit (ScenariosService.runGeneration icinden):
  generate/text|jira|excel|pdf → AI cagrisi sureyle olculur
    → GenerationsService.record({ scenarioCount, durationMs, status, ... })
    → response'a generationId eklenir
  Durum: AI hatasi → FAILED, 0 senaryo → WARNING, aksi halde → SUCCESS

Korunan senaryo (onay orani):
  POST /scenarios (SaveScenariosRequest.generationId verilirse)
    → GenerationsService.incrementSaved(generationId, userId, saved.length)
    → sahiplik updateMany where'i ile dogrulanir

List:
  userId + opsiyonel sourceType filtresi + search (title/sourceRef/project.name,
  case-insensitive) → createdAt desc, paginated

Stats (son 14 gun tek sorguda cekilir, bellekte hesaplanir):
  weekly   : son 7 gun uretilen senaryo + gecen haftaya gore % degisim
  approval : korunan / uretilen (bu hafta)  — savedCount, scenarioCount ile cap'lenir
  today    : calistirma sayisi, uretilen senaryo, ortalama sure (sn)
  success  : basarili calistirma / toplam calistirma (bu hafta)
```

## Notlar

- `approval` senaryo bazli (korunan/uretilen), `success` calistirma bazli
  (basarili run/toplam run). Iki metrigin paydasi farklidir — bu kasitlidir.
- `Generation` modeli `onDelete: Cascade` ile User ve Project'e bagli.

## Bagimliliklar

- `PrismaService` — DB erisimi
- `GenerationsService` ScenariosModule tarafindan import edilir (record + incrementSaved)
