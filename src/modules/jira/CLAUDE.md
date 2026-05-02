# Jira Module

Atlassian OAuth 2.0 (3LO) ile Jira baglanti yonetimi. Internal servis olarak senaryo uretimi sirasinda issue detayini getirir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `jira.controller.ts` | OAuth ve connection endpointleri |
| `jira.service.ts` | OAuth akisi, token yonetimi, Jira REST cagrilari, ADF → plain text |
| `jira.module.ts` | Module tanimi, `JiraService` export eder |
| `models/jira.request.ts` | `JiraOAuthCallbackQuery` |
| `models/jira.response.ts` | `JiraAuthUrlResponse`, `JiraConnectionResponse`, `JiraIssueResponse` |

## Endpointler

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | /jira/auth-url | JWT | `JiraAuthUrlResponse` — Atlassian OAuth URL'i doner |
| GET | /jira/callback | Public | Atlassian redirect'i yakalar, frontend'e yonlendirir |
| GET | /jira/connection | JWT | `JiraConnectionResponse` — Baglanti bilgisi |
| DELETE | /jira/connection | JWT | `{ message }` — Baglantiyi siler |

## OAuth 2.0 Akisi

1. Frontend `GET /jira/auth-url` cagirir → Atlassian OAuth URL'i alir
2. Kullanici Atlassian'a yonlendirilir, izin verir
3. Atlassian `GET /jira/callback?code=xxx&state=yyy` ile geri yonlendirir
4. Backend:
   - `state` parametresini decrypt ederek `userId` cikarir (CSRF koruması)
   - `code` ile Atlassian'dan `access_token` + `refresh_token` alir
   - Accessible resources API'den `cloudId`, `siteUrl`, `siteName` alir
   - Tokenlari sifreli olarak DB'ye kaydeder (upsert)
5. Kullanici `{FRONTEND_URL}/jira/callback?success=true` adresine yonlendirilir

## Token Refresh

- Access token 1 saatte expire olur
- `getValidAccessToken()` her API cagirisinda token'i kontrol eder
- Expire olduysa (60sn buffer) refresh token ile otomatik yeniler
- Atlassian her refresh'te yeni refresh token verir → ikisi de DB'ye kaydedilir
- Refresh basarisizsa baglanti silinir, kullanici yeniden baglanmali

## Internal Kullanim

`JiraService.getIssue(userId, issueKey)` diger modullerin (ornegin `scenarios`) issue detayi cekmesi icin export edilir:

- Issue key format dogrulamasi: `^[A-Z][A-Z0-9]+-\d+$`
- Bearer token ile `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue/{key}` cagirilir
- `description` alani ADF JSON olabilir → `adfToPlainText()` ile duz metne cevrilir
- `summary`, `description`, `issueType`, `status`, `url` doner

## ADF Flattener

Jira REST API v3 `description` alanini JSON olarak doner. `flattenAdfNode()` bunu duz metne cevirir. Desteklenen node tipleri: paragraph, heading, blockquote, listItem, bulletList, orderedList, codeBlock, text, hardBreak.

## Guvenlik

- Access/refresh token `aes-256-gcm` ile sifreli (`CryptoUtil`), anahtar `JIRA_TOKEN_ENCRYPTION_KEY`
- OAuth `state` parametresi de CryptoUtil ile sifrelenir (CSRF + replay koruması, 10dk TTL)
- Token hicbir endpoint'te response'a dahil edilmez
- Callback endpoint JWT korumasi olmadan calisir (browser redirect), guvenlik `state` ile saglanir

## Ortam Degiskenleri

| Degisken | Kullanim |
|----------|----------|
| `ATLASSIAN_CLIENT_ID` | OAuth app client ID |
| `ATLASSIAN_CLIENT_SECRET` | OAuth app client secret |
| `ATLASSIAN_CALLBACK_URL` | OAuth callback URL (ornek: `http://localhost:3001/api/jira/callback`) |
| `JIRA_TOKEN_ENCRYPTION_KEY` | Token sifreleme anahtari |
| `FRONTEND_URL` | Callback sonrasi yonlendirme adresi |

## Bagimliliklar

- `PrismaService` → `jiraConnection` tablosu
- `ConfigService` → Ortam degiskenleri
- `CryptoUtil` → Token ve state sifreleme
- `DateUtil` → Tarih formatlama
- `fetch` (Node 18+) → Atlassian OAuth + Jira REST API cagrilari
