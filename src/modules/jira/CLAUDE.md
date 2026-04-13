# Jira Module

Kullanicinin Jira hesabi ile baglanti yonetimi. Internal servis olarak senaryo uretimi sirasinda issue detayini getirir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `jira.controller.ts` | Connection CRUD endpointleri (JWT korumali) |
| `jira.service.ts` | Baglanti yonetimi, Jira REST cagrilari, ADF → plain text |
| `jira.module.ts` | Module tanimi, `JiraService` export eder |
| `models/jira.request.ts` | `SaveJiraConnectionRequest` |
| `models/jira.response.ts` | `JiraConnectionResponse`, `JiraIssueResponse` |

## Endpointler

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /jira/connection | `SaveJiraConnectionRequest` | `JiraConnectionResponse` |
| GET | /jira/connection | - | `JiraConnectionResponse` |
| DELETE | /jira/connection | - | `{ message }` |

Tum endpointler JWT korumali. Response'ta **asla** `apiToken` dondurulmez.

## Baglanti Akisi

1. Kullanici `POST /jira/connection` ile `baseUrl`, `email`, `apiToken` gonderir
2. `JiraService.verifyCredentials()` → `GET /rest/api/3/myself` ile ping atilir
3. Basarili ise token `CryptoUtil.encrypt()` ile sifrelenir ve DB'ye yazilir (upsert)
4. Basarisiz ise `401/403` yakalanir, `UnauthorizedException` firlatilir

## Internal Kullanim

`JiraService.getIssue(userId, issueKey)` diger modullerin (ornegin `scenarios`) issue detayi cekmesi icin export edilir:

- Issue key format dogrulamasi: `^[A-Z][A-Z0-9]+-\d+$`
- DB'den encrypted token alinir ve decrypt edilir
- `/rest/api/3/issue/{key}` cagirilir
- `description` alani ADF (Atlassian Document Format) JSON olabilir → `adfToPlainText()` ile duz metne cevrilir
- `summary`, `description`, `issueType`, `status`, `url` doner

## ADF Flattener

Jira REST API v3 `description` alanini JSON olarak doner (paragraphlar, listeler, code blocklar). `flattenAdfNode()` bunu AI prompt'una uygun duz metne cevirir. Desteklenen node tipleri: paragraph, heading, blockquote, listItem, bulletList, orderedList, codeBlock, text, hardBreak.

## Guvenlik

- API token `aes-256-gcm` ile sifreli (`CryptoUtil`), anahtar `JIRA_TOKEN_ENCRYPTION_KEY` env var'dan
- Token hicbir endpoint'te response'a dahil edilmez
- `CryptoUtil.decrypt()` sadece internal `getIssue()` icinde calisir

## Bagimliliklar

- `PrismaService` → `jiraConnection` tablosu
- `CryptoUtil` → token sifreleme
- `fetch` (Node 18+) → Jira REST API cagrilari
