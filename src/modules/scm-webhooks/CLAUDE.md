# SCM Webhooks Module

Dis kaynak kontrol platformlarindan (su an GitHub) gelen inbound webhook
teslimatlarini karsilar. Clarity (id3) ile ayni yapi: payload URL'i
`/api/v1/scm-webhooks/github/{connectionId}` seklindedir; sondaki UUID bir
`ScmWebhookConnection` kaydini isaret eder ve her baglantinin kendi secret'i
(CryptoUtil ile sifreli) vardir. Global secret yoktur.

## Neden public ama korumali

Diger endpointler `JwtAuthGuard` ile korunur. GitHub webhook istekleri
`Authorization` header'i tasimaz → JWT guard 401 verir. Bu yuzden inbound route
public'tir ama `ScmWebhookGuard` (baglanti secret'i ile HMAC-SHA256) korur.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `scm-webhooks.controller.ts` | Management (JWT) + inbound webhook (imza) route'lari |
| `scm-webhooks.service.ts` | Baglanti olustur/listele/sil, secret uret+sifrele, event kaydi + idempotency |
| `scm-webhooks.module.ts` | `ScmWebhooksService` export eder |
| `guards/scm-webhook.guard.ts` | UUID baglantisini bulur, secret'i cozer, `X-Hub-Signature-256` dogrular |
| `models/scm-webhook.request.ts` | `CreateScmConnectionRequest`, `GithubWebhookPayload` |
| `models/scm-webhook.response.ts` | `ScmConnectionResponse`, `ScmConnectionCreatedResponse`, `WebhookAckResponse` |

## Endpointler

| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /v1/scm-webhooks | JWT | Baglanti olustur — UUID + secret doner (secret yalnizca burada). Opsiyonel: `autoGenerate`, `targetGroupId` |
| GET | /v1/scm-webhooks | JWT | Kullanicinin baglantilari (secret haric) |
| DELETE | /v1/scm-webhooks/:connectionId | JWT | Baglanti sil |
| POST | /v1/scm-webhooks/github/:connectionId | HMAC imza | Inbound GitHub webhook |

(Global prefix `/api` ile tam yol: `/api/v1/scm-webhooks/...`)

## Akis

```
Olusturma (JWT):
  POST /api/v1/scm-webhooks { provider:"github", label?, projectId? }
    → projectId verilirse sahiplik dogrulanir
    → secret = randomBytes(32) hex; DB'ye CryptoUtil.encrypt ile yazilir
    → doner: { id (UUID), webhookUrl, secret, ... }  ← secret yalnizca bir kez

GitHub kurulumu:
  Payload URL  = webhookUrl (PUBLIC_API_URL tabanli)
  Content type = application/json
  Secret       = olusturmada donen secret

Inbound (public):
  POST /api/v1/scm-webhooks/github/:connectionId
    → ScmWebhookGuard:
        baglanti yok/pasif        → 401
        imza header yok           → 401
        ham govde yok             → 401
        secret cozulemedi         → 401
        HMAC uyusmazligi          → 401 (timingSafeEqual)
    → service.recordGithubEvent:
        ayni X-GitHub-Delivery daha once geldiyse → mevcut kaydi doner (idempotency)
        aksi halde ScmWebhookEvent olusturur (status=RECEIVED)
    → 200 { received:true, eventId, eventType }   ← HEMEN doner

Otomatik uretim (ack sonrasi, ASENKRON — fire-and-forget):
  Kosul: eventType ∈ {issues, pull_request} ve action ∈ {opened, edited}
         ve connection.autoGenerate=true ve connection.targetGroupId dolu
    → buildGenerationInput(payload): issue/PR title+body → input, "{repo}#{num}" → sourceRef
        icerik yoksa → event.status=SKIPPED
    → ScenariosService.generateAndSaveToGroup(userId, targetGroupId, {...}):
        AI uretir + senaryolari gruba TestScenario olarak kaydeder + Generation run'i yazar
    → basari → event.status=PROCESSED ; hata → event.status=FAILED (+error)
  Uygun olmayan event (or autoGenerate kapali) → sadece kayit, uretim yok
```

## Otomatik Senaryo Uretimi (autoGenerate)

- Baglanti olustururken `autoGenerate: true` + `targetGroupId` verilir (autoGenerate acikken
  targetGroupId **zorunlu**, aksi halde 400). targetGroup sahipligi dogrulanir; projectId gruptan turer.
- Uygun event geldiginde uretim **asenkron** calisir — webhook yaniti (200) AI'yi beklemez.
- Uretilen senaryolar `targetGroupId` grubuna `TestScenario` olarak kaydedilir; ayrica
  `sourceType: "webhook"` ile bir `Generation` run'i olusur.
- Maliyet kontrolu: yalnizca whitelist event/action + `autoGenerate` acik baglantilarda uretir.
- `ScmWebhookEvent.status`: RECEIVED → PROCESSED | SKIPPED | FAILED (+`error`).

## Kritik Detaylar

- **Ham govde (rawBody) sart.** `main.ts` → `NestFactory.create(AppModule, { rawBody: true })`.
  Imza parse edilmis JSON uzerinden degil, ham buffer uzerinden hesaplanir.
- **Secret per-connection ve sifreli.** `CryptoUtil` (AES-256-GCM, `JIRA_TOKEN_ENCRYPTION_KEY`)
  ile saklanir; plaintext yalnizca olusturma yanitinda gorunur.
- **`@Body()` kullanilir (DTO degil) webhook'ta.** Payload interface oldugundan
  global ValidationPipe devreye girmez; GitHub'in genis payload'u oldugu gibi gecer.
- **Idempotency** `deliveryId` (`@unique`) uzerinden.
- `ScmWebhookGuard` PrismaService enjekte eder (global PrismaModule).

## Bagimliliklar

- `PrismaService` (global) — baglanti + event
- `CryptoUtil` — secret sifrele/coz
- `process.env.PUBLIC_API_URL` — payload URL tabani (opsiyonel)
