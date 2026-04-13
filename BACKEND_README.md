# nex-test-backend

AI destekli test senaryosu uretim platformunun backend servisi. Kullanicilar proje olusturur, dogal dilde test aciklamasi yazar ve Claude AI otomatik olarak test senaryolari, BDD (Gherkin) formati ve kalite degerlendirmesi uretir.

## Stack

- **Framework:** NestJS 11 + TypeScript
- **Veritabani:** PostgreSQL + Prisma 7
- **Auth:** JWT (Passport)
- **AI:** Anthropic Claude API
- **Test:** Jest

---

## Gereksinimler

| Araç | Versiyon |
|------|----------|
| Node.js | >= 18 |
| npm | >= 9 |
| PostgreSQL | >= 14 |
| Anthropic API Key | [console.anthropic.com](https://console.anthropic.com) |

---

## Kurulum

```bash
# 1. Repoyu klonla
git clone <repo-url>
cd nex-test-backend

# 2. Bagimliliklari yukle
npm install

# 3. Ortam degiskenlerini ayarla
cp .env.example .env
# .env dosyasini duzenle (asagidaki tabloya bak)

# 4. Veritabanini olustur
npx prisma generate
npx prisma migrate dev

# 5. PDF export icin font indir (opsiyonel, sadece PDF export kullanacaksan)
mkdir -p src/assets/fonts
# Google Fonts'tan Noto Sans Regular indir ve su konuma koy:
#   src/assets/fonts/NotoSans-Regular.ttf
# https://fonts.google.com/noto/specimen/Noto+Sans

# 6. Sunucuyu baslat
npm run start:dev
```

Sunucu `http://localhost:3001/api` adresinde calisir.

---

## Ortam Degiskenleri

`.env.example` dosyasini `.env` olarak kopyala ve asagidaki degerleri doldur:

| Degisken | Aciklama | Ornek |
|----------|----------|-------|
| `PORT` | Sunucu portu | `3001` |
| `NODE_ENV` | Ortam | `development` |
| `DATABASE_URL` | PostgreSQL baglanti adresi | `postgresql://postgres:password@localhost:5432/qa_platform` |
| `JWT_SECRET` | Access token imza anahtari | Rastgele uzun bir string |
| `JWT_EXPIRES_IN` | Access token suresi | `1d` |
| `JWT_REFRESH_SECRET` | Refresh token imza anahtari | Rastgele uzun bir string |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token suresi | `7d` |
| `ANTHROPIC_API_KEY` | Claude API anahtari | `sk-ant-...` |
| `JIRA_TOKEN_ENCRYPTION_KEY` | Jira API token sifreleme anahtari (64 char hex) | `openssl rand -hex 32` cikisini kullan |
| `FRONTEND_URL` | CORS icin frontend adresi | `http://localhost:3000` |

---

## Script'ler

| Komut | Aciklama |
|-------|----------|
| `npm run start:dev` | Watch mode gelistirme sunucusu |
| `npm run build` | TypeScript derleme |
| `npm run start:prod` | Production mode |
| `npm run lint` | ESLint kontrol + otomatik fix |
| `npm run test` | Unit testler |
| `npm run test:watch` | Watch mode test |
| `npm run test:cov` | Coverage raporu |
| `npm run test:e2e` | E2E testler |

---

## Proje Yapisi

```
src/
  main.ts                # Bootstrap, global interceptor/filter/pipe
  app.module.ts          # Root module
  prisma/                # Global Prisma service
  common/
    guards/              # JwtAuthGuard
    decorators/          # @CurrentUser() decorator
    interceptors/        # ResponseInterceptor (response wrapper)
    filters/             # HttpExceptionFilter (error wrapper)
    models/              # ApiResponse<T> interface
  modules/
    auth/                # Kayit, giris, JWT token yonetimi
    projects/            # Proje CRUD islemleri
    scenarios/           # Test senaryosu uretim, import/export, yonetim
    ai/                  # Anthropic Claude API entegrasyonu
    jira/                # Jira baglantisi ve issue cekme
```

### Assets (Font)

`src/assets/` klasoru `.gitignore`'da, repo'da takip edilmez. PDF export kullanacaksan **NotoSans-Regular.ttf** dosyasini [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans) uzerinden indirip `src/assets/fonts/NotoSans-Regular.ttf` olarak kaydetmen gerekir. Font eksikse `/api/scenarios/export?format=pdf` endpoint'i hata doner.

---

## API Response Formati

Tum endpointler ayni wrapper formatinda doner:

**Basarili:**
```json
{
  "success": true,
  "timestamp": "2026-04-11T13:15:08.000Z",
  "path": "/api/auth/login",
  "data": { ... }
}
```

**Hata:**
```json
{
  "success": false,
  "timestamp": "2026-04-11T13:15:08.000Z",
  "path": "/api/auth/login",
  "error": { "statusCode": 401, "message": "Gecersiz kimlik bilgileri" }
}
```

---

## Veritabani

Prisma ORM kullanilir. Schema: `prisma/schema.prisma`

**Modeller:** User, Project, TestScenario, JiraConnection

```bash
npx prisma generate                    # Client olustur
npx prisma migrate dev --name <isim>   # Yeni migration
npx prisma studio                      # Gorsel DB arayuzu
npx prisma db push                     # Schema'yi DB'ye push et (dev)
```

---

## API Endpointleri

Tum endpointler `/api` prefix'i altinda.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /api/auth/register | - | Kayit ol |
| POST | /api/auth/login | - | Giris yap, token doner |
| GET | /api/auth/me | JWT | Aktif kullanici bilgisi |
| POST | /api/auth/logout | JWT | Cikis |

### Projects — `/api/projects`

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| GET | /api/projects | JWT | Kullanicinin projeleri |
| POST | /api/projects | JWT | Proje olustur |
| GET | /api/projects/:id | JWT | Proje detay |
| PATCH | /api/projects/:id | JWT | Proje guncelle |
| DELETE | /api/projects/:id | JWT | Proje sil |

### Scenarios — `/api/scenarios`

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /api/scenarios/generate | JWT | Claude ile text'ten senaryo uret (kaydetmez) |
| POST | /api/scenarios/generate-from-jira | JWT | Jira issue'dan senaryo uret (kaydetmez) |
| POST | /api/scenarios/import-excel | JWT | Excel (Xray formati) dosyasindan senaryo import |
| POST | /api/scenarios | JWT | Senaryoyu kaydet (manuel ya da uretilmis) |
| GET | /api/scenarios/project/:id | JWT | Projenin senaryolari |
| GET | /api/scenarios/:id | JWT | Senaryo detay |
| GET | /api/scenarios/export/project/:projectId | JWT | Proje senaryolarini export (excel/pdf/json/feature) |
| GET | /api/scenarios/export/:id | JWT | Tek senaryoyu export |
| DELETE | /api/scenarios/:id | JWT | Senaryo sil |

### Jira — `/api/jira`

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /api/jira/connection | JWT | Jira baglantisi kur (baseUrl + email + apiToken); token kaydedilmeden once test edilir |
| GET | /api/jira/connection | JWT | Mevcut baglanti bilgisi (token dondurulmez) |
| DELETE | /api/jira/connection | JWT | Baglantiyi sil |

**Jira'dan senaryo uretme akisi:**

1. [Atlassian hesabindan](https://id.atlassian.com/manage-profile/security/api-tokens) bir API token olustur
2. `POST /api/jira/connection` ile bagla:
   ```json
   {
     "baseUrl": "https://sirket.atlassian.net",
     "email": "sen@sirket.com",
     "apiToken": "..."
   }
   ```
3. `POST /api/scenarios/generate-from-jira` ile issue'dan senaryo uret:
   ```json
   { "projectId": "...", "issueKey": "PROJ-123" }
   ```
4. Donen ciktiyi `POST /api/scenarios` ile kaydet (opsiyonel: `sourceType: "jira"`, `sourceRef: "PROJ-123"`)

Token AES-256-GCM ile sifreli saklanir (`JIRA_TOKEN_ENCRYPTION_KEY` ile). Token hicbir response'da geri donmez.

**Onkosullar:**

- **Jira Cloud zorunlu.** Servis `/rest/api/3/` endpoint'lerini kullanir; bu yalnizca Cloud'da (`*.atlassian.net`) vardir. Jira Server / Data Center destegi yoktur.
- **`baseUrl` format:** Sadece scheme + domain. Sonunda slash, path veya `/jira` olmamali.
  - ✅ Dogru: `https://sirket.atlassian.net`
  - ❌ Yanlis: `https://sirket.atlassian.net/`, `https://sirket.atlassian.net/jira`
- **`issueKey` format:** `[A-Z][A-Z0-9]+-\d+` regex'ine uymali (orn: `PROJ-123`, `CLAR-131`). Kucuk harf veya format disi string `400` doner.
- **Jira email'i** bizim backend kullanici email'inden farkli olabilir; ikisi bagimsiz sistemlerdir.
