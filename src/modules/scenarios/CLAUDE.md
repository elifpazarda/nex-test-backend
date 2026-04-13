# Scenarios Module

AI destekli test senaryosu uretimi, kaydetme ve yonetimi. AiService ile entegre calisir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `scenarios.controller.ts` | Route handler'lari (tumu JWT korumalı) |
| `scenarios.service.ts` | Senaryo uretimi (AI), CRUD is mantigi |
| `scenarios.module.ts` | AiModule + ProjectsModule import eder |
| `models/scenario.request.ts` | `GenerateScenarioRequest`, `SaveScenarioRequest` |
| `models/scenario.response.ts` | `GenerateScenarioResponse`, `ScenarioResponse`, `ScenarioWithProject` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /scenarios/generate | `GenerateScenarioRequest` | `GenerateScenarioResponse` |
| POST | /scenarios/generate-from-jira | `GenerateFromJiraRequest` | `GenerateFromJiraResponse` |
| POST | /scenarios | `SaveScenarioRequest` | `ScenarioResponse` |
| GET | /scenarios/project/:projectId | - | `ScenarioResponse[]` |
| GET | /scenarios/:id | - | `ScenarioWithProject` |
| DELETE | /scenarios/:id | - | `{ message }` |

Tum endpointler JWT korumalıdir.

## Akis

```
Generate (uret, kaydetmez):
  GenerateScenarioRequest → proje sahiplik kontrolu
    → AiService.generateTestScenario(input) → rawOutput
    → AiService.convertToBdd(rawOutput) → bddOutput
    → AiService.evaluateQuality(rawOutput) → { score, feedback }
    → GenerateScenarioResponse doner

Save (kaydet):
  SaveScenarioRequest → proje sahiplik kontrolu
    → DB'ye TestScenario olarak kaydet → ScenarioResponse doner

FindOne:
  → Senaryo + iliskili Project bilgisi ile doner (ScenarioWithProject)
  → Proje sahibi kontrolu scenario.project.userId uzerinden yapilir
```

## Bagimliliklar

- **AiModule**: `AiService` — Claude API ile senaryo uretimi
- **ProjectsModule**: `ProjectsService` — proje sahiplik kontrolu
- **PrismaService**: DB erisimi
