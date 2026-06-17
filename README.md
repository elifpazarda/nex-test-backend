# nex-test-backend

> AI destekli test senaryosu üretim platformunun backend servisi.

Doğal dil, Jira issue, Excel veya PDF'den yola çıkarak **Anthropic Claude** ile otomatik test senaryoları, BDD (Gherkin) formatı ve kalite değerlendirmesi üretir. Senaryoları projeler ve gruplar altında organize eder; Excel, PDF, JSON ve `.feature` formatlarında dışa aktarır.

<p>
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white">
  <img alt="Claude" src="https://img.shields.io/badge/Anthropic-Claude-D97757?logo=anthropic&logoColor=white">
</p>

---

## Özellikler

- **AI ile senaryo üretimi** — doğal dil açıklaması, Jira issue, Excel veya PDF girdisinden test senaryoları üretir
- **BDD dönüşümü** — mevcut senaryoları Gherkin (Given/When/Then) formatına çevirir
- **Proje & grup yönetimi** — senaryoları projeler ve tiplenmiş gruplarla (BUG, FEATURE, REGRESSION, SMOKE, INTEGRATION, E2E, PERFORMANCE, OTHER) organize eder
- **Import / Export** — Xray formatında Excel import; Excel / PDF / JSON / `.feature` export
- **Jira entegrasyonu** — Atlassian OAuth 2.0 (3LO) ile bağlanıp issue'lardan doğrudan senaryo üretir
- **Güvenlik** — JWT (access + refresh) auth, AES-256-GCM ile şifreli Jira token saklama, endpoint bazlı rate limiting
- **Tutarlı API** — tüm yanıtlar tek bir `ApiResponse<T>` wrapper formatında döner

---

## Teknoloji

| Katman | Seçim |
|--------|-------|
| Framework | NestJS 11 + TypeScript (strict mode) |
| Veritabanı | PostgreSQL + Prisma 7 |
| Auth | JWT (Passport) — access + refresh token |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Rate Limiting | `@nestjs/throttler` (global 100/dk, AI endpointleri 5/dk) |
| Test | Jest (unit + e2e) |

---

## Hızlı Başlangıç

**Gereksinimler:** Node.js >= 18, npm >= 9, PostgreSQL >= 14, bir [Anthropic API anahtarı](https://console.anthropic.com).

```bash
# 1. Repoyu klonla
git clone https://github.com/elifpazarda/nex-test-backend.git
cd nex-test-backend

# 2. Bağımlılıkları yükle
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env        # değerleri doldur (en az DATABASE_URL, JWT_*, ANTHROPIC_API_KEY)

# 4. Veritabanını hazırla
npx prisma generate
npx prisma migrate dev

# 5. Sunucuyu başlat
npm run start:dev
```

Sunucu varsayılan olarak **http://localhost:3001/api** adresinde çalışır.

> **PDF export** kullanacaksan `src/assets/fonts/NotoSans-Regular.ttf` fontunu manuel indirmen gerekir ([Google Fonts / Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans)). Bu klasör `.gitignore`'da, repo'da takip edilmez.

---

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run start:dev` | Watch mode geliştirme sunucusu |
| `npm run build` | TypeScript derleme |
| `npm run start:prod` | Production mode |
| `npm run lint` | ESLint kontrol + otomatik fix |
| `npm run test` | Unit testler |
| `npm run test:cov` | Coverage raporu |
| `npm run test:e2e` | E2E testler |

---

## Mimari

```
src/
  main.ts            # Bootstrap: ValidationPipe, CORS, /api prefix, global interceptor/filter
  app.module.ts      # Root module (ConfigModule global, ThrottlerModule)
  prisma/            # Global Prisma service
  common/            # Guard'lar, decorator'lar, interceptor/filter, ortak modeller
  modules/
    auth/            # Kayıt, giriş, refresh token, JWT yönetimi
    projects/        # Proje CRUD
    scenario-groups/ # Senaryo grubu CRUD (tiplenmiş)
    scenarios/       # AI üretim (text/jira/excel/pdf), import/export, yönetim
    ai/              # Anthropic Claude API entegrasyonu + prompt'lar
    jira/            # Atlassian OAuth 2.0, Jira bağlantısı ve issue çekme
```

**Veri modeli:** `User (1)→(N) Project (1)→(N) ScenarioGroup (1)→(N) TestScenario` ve `User (1)→(1) JiraConnection`.

---

## API'ye Genel Bakış

Tüm endpointler `/api` prefix'i altındadır ve (callback hariç) JWT gerektirir.

| Grup | Örnek endpointler |
|------|-------------------|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| **Projects** | `GET /projects`, `POST /projects`, `GET/PATCH/DELETE /projects/:id` |
| **Scenario Groups** | `POST /scenario-groups`, `GET /scenario-groups/project/:projectId` |
| **Scenarios — üretim** | `POST /scenarios/generate/{text,jira,excel,pdf}`, `POST /scenarios/convert-bdd` |
| **Scenarios — yönetim** | `POST /scenarios`, `POST /scenarios/import-excel`, `GET /scenarios/group/:groupId` |
| **Scenarios — export** | `GET /scenarios/export/{all/:projectId,group/:groupId,:id}?format=excel\|pdf\|json\|feature` |
| **Jira** | `GET /jira/auth-url`, `GET /jira/callback`, `GET/DELETE /jira/connection` |

Tüm yanıtlar ortak wrapper ile döner:

```json
{ "success": true, "timestamp": "2026-04-11T13:15:08.000Z", "path": "/api/auth/login", "data": { } }
```

> Endpointlerin tam listesi, istek/yanıt detayları, ortam değişkenleri tablosu, veritabanı şeması ve Jira OAuth akışı için **[BACKEND_README.md](BACKEND_README.md)** dosyasına bak.

---

## Dokümantasyon

| Belge | İçerik |
|-------|--------|
| **[BACKEND_README.md](BACKEND_README.md)** | Detaylı kurulum, tüm API endpointleri, ortam değişkenleri, veritabanı ve Jira entegrasyonu |
| **[CLAUDE.md](CLAUDE.md)** | Mimari rehberi, kodlama standartları ve geliştirme iş akışı |

---

## Lisans

Bu proje şu an için lisanssız (`UNLICENSED`) yayınlanmaktadır.
