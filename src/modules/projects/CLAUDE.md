# Projects Module

Kullanici projelerinin CRUD yonetimi. Her proje bir kullaniciya ait ve birden fazla test senaryosu icerebilir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `projects.controller.ts` | Route handler'lari (tumu JWT korumalı) |
| `projects.service.ts` | CRUD is mantigi, sahiplik kontrolu |
| `projects.module.ts` | Module tanimi, ProjectsService export eder |
| `models/project.request.ts` | `CreateProjectRequest`, `UpdateProjectRequest` |
| `models/project.response.ts` | `ProjectResponse`, `ProjectWithCount` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | /projects | - | `ProjectWithCount[]` |
| GET | /projects/:id | - | `ProjectResponse` |
| POST | /projects | `CreateProjectRequest` | `ProjectResponse` |
| PATCH | /projects/:id | `UpdateProjectRequest` | `ProjectResponse` |
| DELETE | /projects/:id | - | `{ message }` |

Tum endpointler JWT korumalıdir.

## Sahiplik Kontrolu

- `findOne()` her islemde cagirilir ve `userId` kontrolu yapar
- Baska kullanicinin projesine erisim `ForbiddenException` firlatir
- Proje bulunamazsa `NotFoundException` firlatir

## Response Detay

- `findAll()` → `ProjectWithCount[]`: Her proje ile birlikte `_count.scenarios` (senaryo sayisi) doner
- Diger metodlar → `ProjectResponse`: Proje alanlari (password benzeri hassas alan yok)

## Bagimliliklar

- `ProjectsService` diger moduller tarafindan kullanilir (scenarios modulu import eder)
- `PrismaService` uzerinden DB erisimi
