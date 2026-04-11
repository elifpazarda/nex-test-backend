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
    models/            # ApiResponse<T> interface
  modules/
    auth/
      models/
        auth.request.ts    # RegisterRequest, LoginRequest
        auth.response.ts   # UserResponse, AuthTokens
      auth.service.ts      # Register, login, me, token generation
      auth.controller.ts
      jwt.strategy.ts      # Passport JWT strategy
    projects/
      models/
        project.request.ts  # CreateProjectRequest, UpdateProjectRequest
        project.response.ts # ProjectResponse, ProjectWithCount
      projects.service.ts
      projects.controller.ts
    scenarios/
      models/
        scenario.request.ts    # GenerateScenarioRequest, SaveScenarioRequest
        scenario.response.ts # ScenarioResponse, ScenarioWithProject
      scenarios.service.ts   # AI entegrasyonu burada
      scenarios.controller.ts
    ai/
      ai.service.ts          # Anthropic SDK: senaryo uret, BDD donustur, kalite degerlendir
```

## API Endpointleri

Tum endpointler `/api` prefix'i altinda.

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /api/auth/register | - | Kayit |
| POST | /api/auth/login | - | Giris, token doner |
| GET | /api/auth/me | JWT | Kullanici bilgisi |
| POST | /api/auth/logout | JWT | Cikis |
| GET | /api/projects | JWT | Kullanicinin projeleri |
| POST | /api/projects | JWT | Proje olustur |
| GET | /api/projects/:id | JWT | Proje detay |
| PATCH | /api/projects/:id | JWT | Proje guncelle |
| DELETE | /api/projects/:id | JWT | Proje sil |
| POST | /api/scenarios/generate | JWT | AI ile senaryo uret |
| POST | /api/scenarios | JWT | Senaryo kaydet |
| GET | /api/scenarios/project/:id | JWT | Proje senaryolari |
| GET | /api/scenarios/:id | JWT | Senaryo detay |
| DELETE | /api/scenarios/:id | JWT | Senaryo sil |

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

## Prisma

- Schema: `prisma/schema.prisma`
- Config: `prisma.config.ts` (Prisma 7 - URL burada tanimlaniyor)
- Modeller: User, Project, TestScenario
- Schema degisikliginde `prisma generate` otomatik calisir (hook)
