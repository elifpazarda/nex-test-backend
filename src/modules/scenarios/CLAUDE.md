# Scenarios Module

AI destekli test senaryosu uretimi, kaydetme, import/export ve yonetimi. AiService ile entegre calisir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `scenarios.controller.ts` | Route handler'lari (tumu JWT korumali) |
| `scenarios.service.ts` | Senaryo uretimi (AI), import/export, CRUD is mantigi |
| `scenarios.module.ts` | AiModule + ProjectsModule + JiraModule + ScenarioGroupsModule import eder |
| `models/scenario.request.ts` | `GenerateFromTextRequest`, `GenerateFromJiraRequest`, `GenerateFromFileRequest`, `ConvertBddRequest`, `SaveScenariosRequest`, `ImportExcelRequest`, `ExportQueryRequest` |
| `models/scenario.response.ts` | `GenerateScenarioResponse`, `ConvertBddResponse`, `ScenarioResponse`, `ScenarioWithGroup`, `ScenarioWithProject`, `ExcelImportResponse`, `GeneratedScenarioItem`, `CodeGenerationItem` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /scenarios/generate/text | `GenerateFromTextRequest` | `GenerateScenarioResponse` |
| POST | /scenarios/generate/jira | `GenerateFromJiraRequest` | `GenerateScenarioResponse` |
| POST | /scenarios/generate/excel | `GenerateFromFileRequest` + file | `GenerateScenarioResponse` |
| POST | /scenarios/generate/pdf | `GenerateFromFileRequest` + file | `GenerateScenarioResponse` |
| POST | /scenarios/convert-bdd | `ConvertBddRequest` | `ConvertBddResponse` |
| POST | /scenarios/import-excel | `ImportExcelRequest` + file | `ExcelImportResponse` |
| POST | /scenarios | `SaveScenariosRequest` (groupId) | `ScenarioResponse[]` |
| GET | /scenarios/group/:groupId | `PaginationQuery` | `PaginatedResponse<ScenarioWithGroup>` |
| GET | /scenarios/export/all/:projectId | `ExportQueryRequest` | file download |
| GET | /scenarios/export/group/:groupId | `ExportQueryRequest` | file download |
| GET | /scenarios/export/:id | `ExportQueryRequest` | file download |
| GET | /scenarios/:id | - | `ScenarioWithProject` |
| DELETE | /scenarios/:id | - | `{ message }` |

Tum endpointler JWT korumalidir. Generate ve convert-bdd endpointlerinde rate limiting: 5 istek/dakika.

## Akis

```
Generate (uret, kaydetmez):
  GenerateFromTextRequest → proje sahiplik kontrolu
    → AiService.generateTestScenario(input) → scenarios
    → GenerateScenarioResponse doner

Save (kaydet):
  SaveScenariosRequest (groupId) → grup sahiplik kontrolu
    → group.projectId ile projectId derive edilir
    → DB'ye TestScenario olarak kaydet → ScenarioResponse[] doner

FindByGroup (paginated):
  → ScenarioGroupsService.findOne() ile yetki kontrolu
  → Gruba ait senaryolari paginated olarak doner
  → PaginatedResponse<ScenarioWithGroup> (items + meta)

FindOne:
  → Senaryo + iliskili Project + Group bilgisi ile doner (ScenarioWithProject)
  → Proje sahibi kontrolu scenario.project.userId uzerinden yapilir

Export:
  → Format parametresi: excel, pdf, json, feature
  → Dosya olarak doner (Content-Disposition: attachment)
```

## Bagimliliklar

- **AiModule**: `AiService` — Claude CLI ile senaryo uretimi ve kod donusumu
- **ProjectsModule**: `ProjectsService` — proje sahiplik kontrolu
- **JiraModule**: `JiraService` — Jira issue verisi cekme
- **ScenarioGroupsModule**: `ScenarioGroupsService` — grup sahiplik kontrolu, save/import icin groupId dogrulama
- **PrismaService**: DB erisimi
