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
  app.module.ts        # Root module (ConfigModule global)
  prisma/              # Global Prisma service
  common/
    guards/            # JwtAuthGuard
    decorators/        # @CurrentUser() decorator
  auth/
    dto/               # RegisterDto, LoginDto
    auth.service.ts    # Register, login, me, token generation
    auth.controller.ts # /auth endpoints
    jwt.strategy.ts    # Passport JWT strategy
  projects/
    dto/               # CreateProjectDto, UpdateProjectDto
    projects.service.ts
    projects.controller.ts
  scenarios/
    dto/               # GenerateScenarioDto, SaveScenarioDto
    scenarios.service.ts  # AI entegrasyonu burada
    scenarios.controller.ts
  ai/
    ai.service.ts      # Anthropic SDK: senaryo uret, BDD donustur, kalite degerlendir
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
- DTO'larda class-validator decorator'lari zorunlu
- Service katmaninda is mantigi, controller'da sadece routing
- Prisma sorgularinda `select` veya `include` ile gereksiz veri cekme
- Interface tercih et, type sadece union/intersection icin
- Her modul kendi dto/ klasorune sahip
- Guard'lar common/guards/ altinda, decorator'lar common/decorators/ altinda

## Git Workflow

- Branch isimlendirme: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- Force push yasak, branch silme yasak (hooks ile engelli)
- Commit oncesi lint + type check + test otomatik calisir

## Yeni Endpoint Ekleme Adimlari

1. `dto/` altinda DTO sinifi olustur (class-validator ile)
2. Service'e is mantigi methodunu ekle
3. Controller'a route handler ekle (@UseGuards, @Body, @Param)
4. Gerekirse module'a import/provider ekle
5. İlgili test dosyasini guncelle
6. `npx nest build` ile derleme dogrula

## Ortam Degiskenleri

`.env.example` dosyasina bak. `.env` dosyasi `.gitignore`'da ve hook ile korunuyor.

## Prisma

- Schema: `prisma/schema.prisma`
- Config: `prisma.config.ts` (Prisma 7 - URL burada tanimlaniyor)
- Modeller: User, Project, TestScenario
- Schema degisikliginde `prisma generate` otomatik calisir (hook)
