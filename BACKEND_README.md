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
| `JIRA_TOKEN_ENCRYPTION_KEY` | Jira token sifreleme anahtari (64 char hex) | `openssl rand -hex 32` cikisini kullan |
| `ATLASSIAN_CLIENT_ID` | Atlassian OAuth app client ID | Developer Console'dan al |
| `ATLASSIAN_CLIENT_SECRET` | Atlassian OAuth app client secret | Developer Console'dan al |
| `ATLASSIAN_CALLBACK_URL` | OAuth callback URL | `http://localhost:3001/api/jira/callback` |
| `FRONTEND_URL` | CORS ve OAuth redirect icin frontend adresi | `http://localhost:3000` |

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
| POST | /api/scenarios/generate/jira | JWT | Jira issue'dan senaryo uret (kaydetmez) |
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
| GET | /api/jira/auth-url | JWT | Atlassian OAuth 2.0 yetkilendirme URL'i doner |
| GET | /api/jira/callback | - | Atlassian OAuth callback (browser redirect) |
| GET | /api/jira/connection | JWT | Mevcut baglanti bilgisi (token dondurulmez) |
| DELETE | /api/jira/connection | JWT | Baglantiyi sil |

**Jira baglanti akisi (OAuth 2.0):**

1. `GET /api/jira/auth-url` cagir → Atlassian OAuth URL'i al
2. Kullaniciyi bu URL'e yonlendir → Atlassian'da giris yapar, izin verir
3. Atlassian otomatik olarak `GET /api/jira/callback` adresine yonlendirir
4. Backend token'lari alir, sifreli olarak DB'ye kaydeder
5. Kullanici frontend'e yonlendirilir (`{FRONTEND_URL}/jira/callback?success=true`)

**Jira'dan senaryo uretme:**

```json
POST /api/scenarios/generate/jira
{ "projectId": "...", "issueKey": "PROJ-123" }
```

**Token yonetimi:**

- Access token 1 saatte expire olur, otomatik refresh edilir
- Refresh basarisizsa baglanti silinir, kullanici yeniden baglanmali
- Token'lar AES-256-GCM ile sifreli saklanir (`JIRA_TOKEN_ENCRYPTION_KEY`)
- Token hicbir response'da geri donmez

**Onkosullar:**

- **Jira Cloud zorunlu.** Servis Atlassian Cloud API kullanir; Jira Server / Data Center destegi yoktur.
- **Atlassian OAuth app gerekli.** [Developer Console](https://developer.atlassian.com/console)'da OAuth 2.0 app olustur, callback URL olarak `ATLASSIAN_CALLBACK_URL` degerini ekle, `read:jira-work` scope'u ver.
- **`issueKey` format:** `[A-Z][A-Z0-9]+-\d+` regex'ine uymali (orn: `PROJ-123`, `QA-42`). Format disi string `400` doner.
