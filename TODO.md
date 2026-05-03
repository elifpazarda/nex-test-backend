# TODO

Test ve kod incelemesi sirasinda tespit edilen iyilestirme, duzeltme ve tasarim noktalari.

---

## Tasarimsal / Mimari Sorunlar (Onem Sirasina Gore)

### 1. [YUKSEK] Hata Mesaji Format Tutarsizligi

- [x] Validation hatalari: `message: ["name must be...", "password must be..."]` (string array, Ingilizce)
- [x] Business hatalari: `message: "Bu email zaten kullanılıyor"` (tek string, Turkce)
  - Frontend her hata tipi icin farkli parse mantigi yazmak zorunda
  - **Oneri:** Her zaman `message: string[]` formatinda don, Turkce mesajlar kullan
  - **Etki:** HttpExceptionFilter + class-validator i18n konfigurasyonu
  - **Cozum:** `formatValidationErrors` utility (TR ceviri map) + ValidationPipe `exceptionFactory` + filter normalizasyonu

---

## Endpoint Edge Cases

Tum endpoint'lerin uc senaryo testleri asagida listelenmistir. Happy path testleri tamamlanmis ve `docs/api/` altinda dokumante edilmistir. Bu edge case'ler daha sonra tek tek test edilecektir.

### Auth

**Register**
- [ ] Bos body, gecersiz email, kisa sifre, kisa/uzun isim, duplicate email, ekstra alan, SQL injection, uzun sifre, unicode isim
- [ ] Validation mesajlari Ingilizce, format tutarsiz (string[] vs string)

**Login**
- [ ] Bos body, kayitsiz email, yanlis sifre, gecersiz email, bos password, uzun password
- [ ] Rate limiting yok, token expiry bilgisi donmuyor

**Me**
- [ ] Token yok/gecersiz/expired, silinmis kullanici, updatedAt donmuyor

**Logout**
- [x] tokenVersion increment calisiyor (eski tokenlar gecersiz)
- [ ] Ayni tokenVersion ile birden fazla token verilebilir (token blacklist yok)

### Projects

**Create** — Bos body, kisa/uzun isim, uzun description, token yok, ayni isimde proje
**List** — Token yok, izolasyon, siralama secenegi yok
**Get** — Gecersiz ID, baska kullanicinin projesi, _count donmuyor
**Update** — Bos body, kismi guncelleme, gecersiz ID, yetki, null description
**Delete** — Gecersiz ID, yetki, tekrar silme, cascade

### Scenario Groups

**Create** — Bos body, gecersiz type/projectId, kisa/uzun isim, yetki, ayni isimde grup
**List** — Gecersiz projectId, yetki
**Get** — Gecersiz ID, yetki, list vs detail tutarsizligi
**Update** — Bos body, kismi guncelleme, gecersiz type/ID, yetki, projectId degistirme
**Delete** — Gecersiz ID, yetki, tekrar silme, cascade

### Scenarios

**Generate (text)** — Bos body, kisa/uzun input, gecersiz projectId, yetki, anlamsiz input, AI down, timeout
**Convert BDD** — Bos body/dizi, gecersiz framework/projectId, yetki, Playwright/Cypress testi yok
**Save** — Bos body/dizi, gecersiz groupId, yetki, kisa title, bdd olmadan kayit, cok fazla senaryo
**Find by Project** — Bu endpoint kaldirildi. `GET /api/scenarios/group/:groupId` kullanilmali.
**Find by Group** — Gecersiz groupId, yetki, bos grup
**Find One** — Gecersiz ID, yetki
**Delete** — _(henuz test edilmedi)_
**Export** — _(henuz test edilmedi)_
**Generate (excel/pdf/jira)** — _(henuz test edilmedi)_
**Import Excel** — _(henuz test edilmedi)_

---

## Export

### Excel Export Iyilestirmesi

- [x] Excel export formati gozden gecirilecek (gorsel/icerik iyilestirme gerekiyor)
  - **Cozum:** Standart formata Group/GroupType/Category/Priority/Preconditions/Steps/ExpectedResult/SourceType/SourceRef sutunlari eklendi; header styling (lacivert+beyaz, bold), freeze first row, autoFilter, wrap text, ayri Metadata sheet'i

### Export Icerik Iyilestirmesi

- [x] Proje bazli export'ta (export/all) her senaryonun hangi gruba ait oldugu belirtilmeli (tum formatlar: json, excel, pdf, feature)
  - **Cozum:** `getFilteredScenarios` artik group include ediyor; Excel'de Group sutunu, PDF'te her senaryoda group satiri, JSON'da group objesi, .feature'da `# Group:` comment'i
- [x] Grup bazli export'ta (export/group) grup bilgisi header/metadata olarak eklenmeli
  - **Cozum:** `ExportMetadata` interface'i + Excel Metadata sheet, PDF kapak bolumu, JSON top-level metadata, .feature dosyasi bas yorumlari

---

## Genel

_(test ilerledikce eklenecek)_
