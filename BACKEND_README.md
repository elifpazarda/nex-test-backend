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

# 5. Sunucuyu baslat
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
    scenarios/           # Test senaryosu uretim ve yonetimi
    ai/                  # Anthropic Claude API entegrasyonu
```

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

**Modeller:** User, Project, TestScenario

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
| POST | /api/scenarios/generate | JWT | Claude ile senaryo uret (kaydetmez) |
| POST | /api/scenarios | JWT | Senaryoyu kaydet |
| GET | /api/scenarios/project/:id | JWT | Projenin senaryolari |
| GET | /api/scenarios/:id | JWT | Senaryo detay |
| DELETE | /api/scenarios/:id | JWT | Senaryo sil |
