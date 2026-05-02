# Scenario Groups Module

Proje icindeki test senaryolarini mantiksal gruplara ayirmak icin kullanilir. Her grup bir ture sahiptir (BUG, FEATURE, REGRESSION, vs.).

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `scenario-groups.controller.ts` | Route handler'lari (tumu JWT korumali) |
| `scenario-groups.service.ts` | CRUD is mantigi, sahiplik kontrolu |
| `scenario-groups.module.ts` | ProjectsModule import eder, ScenarioGroupsService export eder |
| `models/scenario-group.request.ts` | `CreateScenarioGroupRequest`, `UpdateScenarioGroupRequest` |
| `models/scenario-group.response.ts` | `ScenarioGroupResponse`, `ScenarioGroupWithCount` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /scenario-groups | `CreateScenarioGroupRequest` | `ScenarioGroupWithCount` |
| GET | /scenario-groups/project/:projectId | `PaginationQuery` | `PaginatedResponse<ScenarioGroupWithCount>` |
| GET | /scenario-groups/:id | - | `ScenarioGroupWithCount` |
| PATCH | /scenario-groups/:id | `UpdateScenarioGroupRequest` | `ScenarioGroupWithCount` |
| DELETE | /scenario-groups/:id | - | `{ message }` |

Tum endpointler JWT korumalidir.

## Sahiplik Kontrolu

- `findOne()` her islemde cagirilir ve `group.project.userId` kontrolu yapar
- `findAllByProject()` proje sahipligini `ProjectsService.findOne()` ile dogrular
- Baska kullanicinin grubuna erisim `ForbiddenException` firlatir

## Veri Modeli

```
Project (1) → (N) ScenarioGroup (1) → (N) TestScenario
```

ScenarioGroupType enum: BUG, FEATURE, REGRESSION, SMOKE, INTEGRATION, E2E, PERFORMANCE, OTHER

## Response Detay

- Tum CRUD endpointleri `ScenarioGroupWithCount` doner: grup alanlari + `_count.scenarios`
- `findAllByProject()` paginated: `PaginatedResponse<ScenarioGroupWithCount>` (items + meta)
- Pagination query: `page` (varsayilan 1), `limit` (varsayilan 20)

## Bagimliliklar

- **ProjectsModule**: `ProjectsService` — proje sahiplik kontrolu
- **PrismaService**: DB erisimi
- Bu modul `ScenarioGroupsService`'i export eder — `ScenariosModule` tarafindan kullanilir
