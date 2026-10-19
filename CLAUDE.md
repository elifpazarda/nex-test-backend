# QA Platform Backend

AI destekli test senaryosu uretim platformunun backend servisi.

## Stack

- NestJS 11 + TypeScript (strict mode)
- Prisma 7 + PostgreSQL
- JWT Authentication (Passport)
- Anthropic Claude API (test senaryosu uretimi)
- Jest (unit + e2e test)
- ESLint + Prettier

## Komutlar

```bash
# Gelistirme
npm run start:dev      # Watch mode sunucu
npm run build          # TypeScript derleme
npx nest build         # NestJS build

# Kalite
npm run lint           # ESLint kontrol + fix
npx tsc --noEmit       # Sadece tip kontrolu (hizli)
npx prettier --check . # Format kontrolu

# Test
npm run test           # Unit testler
npm run test:watch     # Watch mode test
npm run test:cov       # Coverage raporu
npm run test:e2e       # E2E testler

# Veritabani
npx prisma generate                    # Client olustur
npx prisma migrate dev --name <isim>   # Migration olustur
npx prisma studio                      # DB gorsel arayuz
npx prisma db push                     # Schema'yi DB'ye push et (dev)
```

## Mimari

```
src/
  main.ts              # Bootstrap: ValidationPipe, CORS, /api prefix, port 3001
                       # Global: ResponseInterceptor, HttpExceptionFilter
  app.module.ts        # Root module (ConfigModule global)
  prisma/              # Global Prisma service
  common/
    guards/            # JwtAuthGuard
    decorators/        # @CurrentUser() decorator
    interceptors/      # ResponseInterceptor (API response wrapper)
    filters/           # HttpExceptionFilter (hata response wrapper)
    models/            # ApiResponse<T> interface, PaginationQuery, PaginatedResponse
  modules/
    auth/
      models/
        auth.request.ts    # RegisterRequest, LoginRequest, RefreshTokenRequest
        auth.response.ts   # UserResponse, AuthTokens, JwtPayload
      auth.service.ts      # Register, login, refresh, me, logout, token generation
      auth.controller.ts
      jwt.strategy.ts      # Passport JWT strategy (tokenVersion dogrulamasi)
    projects/
      models/
        project.request.ts  # CreateProjectRequest, UpdateProjectRequest
        project.response.ts # ProjectResponse, ProjectWithCount
      projects.service.ts
      projects.controller.ts
    scenarios/
      models/
        scenario.request.ts    # GenerateFromTextRequest, GenerateFromJiraRequest, GenerateFromFileRequest, ConvertBddRequest, SaveScenariosRequest, ImportExcelRequest, ExportQueryRequest
        scenario.response.ts   # GenerateScenarioResponse, ConvertBddResponse, ScenarioResponse, ScenarioWithGroup, ScenarioWithProject, ExcelImportResponse
      scenarios.service.ts     # AI entegrasyonu, import/export, CRUD
      scenarios.controller.ts
    scenario-groups/
      models/
        scenario-group.request.ts   # CreateScenarioGroupRequest, UpdateScenarioGroupRequest
        scenario-group.response.ts  # ScenarioGroupResponse, ScenarioGroupWithCount
      scenario-groups.service.ts    # CRUD + proje sahiplik kontrolu
      scenario-groups.controller.ts
    ai/
      ai.service.ts          # Claude CLI: senaryo uret, kod donustur (framework bazli)
      prompts/               # Sistem/kullanici prompt dosyalari ve JSON schemalari
    jira/
      models/
        jira.request.ts      # JiraOAuthCallbackQuery
        jira.response.ts     # JiraAuthUrlResponse, JiraConnectionResponse, JiraIssueResponse
      jira.service.ts        # Atlassian OAuth 2.0, Jira REST client, ADF → plain text
      jira.controller.ts     # OAuth + connection endpointleri
    generations/
      models/
        generation.request.ts   # GenerationListQuery (pagination + sourceType + search)
        generation.response.ts  # GenerationResponse, GenerationStatsResponse
      generations.service.ts    # AI uretim gecmisi kaydi (record), korunan sayisi, liste, istatistik
      generations.controller.ts # /generations liste + /generations/stats
    scm-webhooks/
      models/
        scm-webhook.request.ts   # CreateScmConnectionRequest, GithubWebhookPayload (gevsek tip)
        scm-webhook.response.ts  # ScmConnectionResponse, ScmConnectionCreatedResponse, WebhookAckResponse
      guards/
        scm-webhook.guard.ts     # URL'deki UUID baglantisini bulur, secret'i cozer, X-Hub-Signature-256 dogrular (gecersizse 401)
      scm-webhooks.service.ts    # Baglanti CRUD (secret uret/sifrele), inbound GitHub event kaydi, idempotency
      scm-webhooks.controller.ts # /v1/scm-webhooks (JWT management) + /v1/scm-webhooks/github/:uuid (public, imza korumali)
```

## API Endpointleri

Tum endpointler `/api` prefix'i altinda.

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /api/auth/register | - | Kayit |
| POST | /api/auth/login | - | Giris, token doner |
| POST | /api/auth/refresh | - | Refresh token ile yeni token cifti al |
| GET | /api/auth/me | JWT | Kullanici bilgisi |
| POST | /api/auth/logout | JWT | Cikis (tokenVersion arttirir) |
| GET | /api/projects | JWT | Kullanicinin projeleri |
| POST | /api/projects | JWT | Proje olustur |
| GET | /api/projects/:id | JWT | Proje detay |
| PATCH | /api/projects/:id | JWT | Proje guncelle |
| DELETE | /api/projects/:id | JWT | Proje sil |
| POST | /api/scenario-groups | JWT | Senaryo grubu olustur |
| GET | /api/scenario-groups/project/:projectId | JWT | Proje gruplari (senaryo sayisiyla) |
| GET | /api/scenario-groups/:id | JWT | Grup detay |
| PATCH | /api/scenario-groups/:id | JWT | Grup guncelle |
| DELETE | /api/scenario-groups/:id | JWT | Grup sil (cascade) |
| POST | /api/scenarios/generate/text | JWT | Dogal dilden AI ile senaryo uret |
| POST | /api/scenarios/generate/jira | JWT | Jira issue'dan AI ile senaryo uret |
| POST | /api/scenarios/generate/excel | JWT | Excel dosyasindan AI ile senaryo uret |
| POST | /api/scenarios/generate/pdf | JWT | PDF dosyasindan AI ile senaryo uret |
| POST | /api/scenarios/convert-bdd | JWT | Senaryoyu BDD/kod formatina donustur |
| POST | /api/scenarios | JWT | Senaryo kaydet (groupId gerekli) |
| POST | /api/scenarios/import-excel | JWT | Excel'den senaryo import et |
| GET | /api/scenarios/group/:groupId | JWT | Grup senaryolari (paginated) |
| GET | /api/scenarios/export/all/:projectId | JWT | Proje senaryolarini export et |
| GET | /api/scenarios/export/group/:groupId | JWT | Grup senaryolarini export et |
| GET | /api/scenarios/export/:id | JWT | Tek senaryoyu export et |
| GET | /api/scenarios/:id | JWT | Senaryo detay |
| DELETE | /api/scenarios/:id | JWT | Senaryo sil |
| GET | /api/jira/auth-url | JWT | Atlassian OAuth URL'i doner |
| GET | /api/jira/callback | - | Atlassian OAuth callback (browser redirect) |
| GET | /api/jira/connection | JWT | Jira baglanti bilgisi |
| DELETE | /api/jira/connection | JWT | Jira baglantisini sil |
| GET | /api/generations | JWT | AI uretim gecmisi (paginated, sourceType + search filtresi) |
| GET | /api/generations/stats | JWT | Uretim ozet istatistikleri (haftalik/onay/bugun/basari) |
| POST | /api/v1/scm-webhooks | JWT | SCM webhook baglantisi olustur (UUID + secret doner, secret bir kez) |
| GET | /api/v1/scm-webhooks | JWT | Kullanicinin webhook baglantilari (secret haric) |
| GET | /api/v1/scm-webhooks/:connectionId/events | JWT | Baglantinin webhook event gecmisi (paginated, status/eventType filtresi) |
| PATCH | /api/v1/scm-webhooks/:connectionId | JWT | Baglanti ayarlarini guncelle (label/active/autoGenerate/targetGroupId) |
| POST | /api/v1/scm-webhooks/:connectionId/rotate-secret | JWT | Secret'i yenile (yeni secret bir kez doner) |
| DELETE | /api/v1/scm-webhooks/:connectionId | JWT | Webhook baglantisini sil |
| POST | /api/v1/scm-webhooks/github/:connectionId | HMAC imza | GitHub webhook'u karsilar, imza dogrular, ScmWebhookEvent kaydeder |

## Kodlama Standartlari

- TypeScript strict mode, `noImplicitAny` dikkat
- NestJS dependency injection kullan, manual instantiation yapma
- Request class'larinda class-validator decorator'lari zorunlu
- Veri katmanlari:
  - **Request** (`*.request.ts`): Client → API, input verisi (class + class-validator)
  - **Entity**: API ↔ DB, Prisma schema tarafindan tanimlanir (`prisma/schema.prisma`)
  - **Response** (`*.response.ts`): API → Client, output verisi (interface)
- Service katmaninda is mantigi, controller'da sadece routing
- Prisma sorgularinda `select` veya `include` ile gereksiz veri cekme
- Tum fonksiyonlarda return tipi acikca yazilmali (type inference'a birakilmamali)
- Interface tercih et, type sadece union/intersection icin
- Her modul kendi models/ klasorune sahip (request.ts = input, response.ts = output)
- Tum tarihler UTC ISO 8601 formatinda (`2026-04-11T13:15:08.000Z`), `DateUtil` kullan (`common/utils/date.util.ts`)
- Guard'lar common/guards/, decorator'lar common/decorators/ altinda
- Tum API response'lari `ApiResponse<T>` wrapper ile sarilir (interceptor + filter)
- Basarili: `{ success: true, timestamp, path, data }`
- Hata: `{ success: false, timestamp, path, error: { statusCode, message } }`

## Git Workflow

- Branch isimlendirme: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- Force push yasak, branch silme yasak (hooks ile engelli)
- Commit oncesi lint + type check + test otomatik calisir

## Yeni Endpoint Ekleme Adimlari

1. `models/` altinda Request sinifi olustur (class-validator ile) ve Response interface'i tanimla
2. Service'e is mantigi methodunu ekle
3. Controller'a route handler ekle (@UseGuards, @Body, @Param)
4. Gerekirse module'a import/provider ekle
5. Ilgili test dosyasini guncelle
6. `npx nest build` ile derleme dogrula

## Yeni Modul Ekleme Adimlari

1. `src/modules/<modul>/` altinda module, service, controller olustur
2. `models/` altinda `*.request.ts` ve `*.response.ts` dosyalari olustur
3. **`CLAUDE.md` dosyasi ekle** — dosyalar, endpointler, akis, bagimliliklar
4. `app.module.ts`'e import ekle
5. `npx nest build` ile derleme dogrula

## Ortam Degiskenleri

`.env.example` dosyasina bak. `.env` dosyasi `.gitignore`'da ve hook ile korunuyor.

## Assets (Fontlar)

`src/assets/` klasoru `.gitignore`'da — repo'yu klonladiktan sonra manuel kurulum gerekir.

PDF export icin gerekli font:
- **NotoSans-Regular.ttf** → [Google Fonts / Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans) adresinden indir, `src/assets/fonts/NotoSans-Regular.ttf` olarak kaydet.

Font eksikse `/api/scenarios/export?format=pdf` endpoint'i hata doner.

## Prisma

- Schema: `prisma/schema.prisma`
- Config: `prisma.config.ts` (Prisma 7 - URL burada tanimlaniyor)
- Modeller: User, Project, ScenarioGroup, TestScenario, Generation, JiraConnection, ScmWebhookConnection, ScmWebhookEvent
- Enum: ScenarioGroupType (BUG, FEATURE, REGRESSION, SMOKE, INTEGRATION, E2E, PERFORMANCE, OTHER), GenerationStatus (SUCCESS, WARNING, FAILED)
- Schema degisikliginde `prisma generate` otomatik calisir (hook)
