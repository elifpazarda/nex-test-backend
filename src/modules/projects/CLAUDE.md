# Projects Module

Kullanici projelerinin CRUD yonetimi. Her proje bir kullaniciya ait ve birden fazla senaryo grubu ve test senaryosu icerebilir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `projects.controller.ts` | Route handler'lari (tumu JWT korumali) |
| `projects.service.ts` | CRUD is mantigi, sahiplik kontrolu |
| `projects.module.ts` | Module tanimi, ProjectsService export eder |
| `models/project.request.ts` | `CreateProjectRequest`, `UpdateProjectRequest` |
| `models/project.response.ts` | `ProjectResponse`, `ProjectWithCount` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | /projects | `PaginationQuery` | `PaginatedResponse<ProjectWithCount>` |
| GET | /projects/:id | - | `ProjectWithCount` |
| POST | /projects | `CreateProjectRequest` | `ProjectWithCount` |
| PATCH | /projects/:id | `UpdateProjectRequest` | `ProjectWithCount` |
| DELETE | /projects/:id | - | `{ message }` |

Tum endpointler JWT korumalidir.

## Sahiplik Kontrolu

- `findOne()` her islemde cagirilir ve `userId` kontrolu yapar
- Baska kullanicinin projesine erisim `ForbiddenException` firlatir
- Proje bulunamazsa `NotFoundException` firlatir

## Response Detay

- Tum CRUD endpointleri `ProjectWithCount` doner: proje alanlari + `_count.scenarios` ve `_count.scenarioGroups`
- `findAll()` paginated: `PaginatedResponse<ProjectWithCount>` (items + meta)
- Pagination query: `page` (varsayilan 1), `limit` (varsayilan 20)

## Bagimliliklar

- `ProjectsService` diger moduller tarafindan kullanilir (scenarios, scenario-groups modulleri import eder)
- `PrismaService` uzerinden DB erisimi
