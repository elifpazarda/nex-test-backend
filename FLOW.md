# QA Platform - Test Senaryo Akışı

```mermaid
flowchart LR
    A["Giris Yap / Kayit Ol"] --> B["Dashboard"]
    B --> C["Proje Sec / Olustur"]
    C --> D["Proje Detay"]
    D --> SG["Grup Sec / Olustur"]
    SG --> E{"Kaynak Sec"}

    E -->|"Hazir Senaryo"| F1["Yapistirir"]
    E -->|"Metin"| F2["Metin Girer"]
    E -->|"Jira"| F3["OAuth Baglan + Issue Key"]
    E -->|"Excel"| F4["Excel Yukler"]
    E -->|"PDF"| F5["PDF Yukler"]

    F2 --> G["Claude Senaryo Uretir"]
    F3 --> G
    F4 --> G
    F5 --> G

    F1 --> H["Senaryo Gosterilir"]
    G --> H

    H --> I["Kullanici Duzenler"]
    I --> J["BDD Donusumu (Claude)"]
    J --> K["BDD Gosterilir"]
    K --> L["Kullanici BDD Duzenler"]
    L --> M["Gruba Kaydet"]

    style SG fill:#3B82F6,color:#FFF
    style E fill:#FFD700,color:#000
    style G fill:#8B5CF6,color:#FFF
    style J fill:#8B5CF6,color:#FFF
    style M fill:#10B981,color:#FFF
```

## Akış Özeti

1. **Giriş / Kayıt** → Dashboard'a düşer
2. **Proje Seç / Oluştur** → Proje detayına girer
3. **Senaryo Grubu Seç / Oluştur** → Grup türü belirlenir (BUG, FEATURE, REGRESSION, SMOKE, INTEGRATION, E2E, PERFORMANCE, OTHER)
4. **Kaynak Seç** — 5 farklı yol:
   - **Hazır Senaryo**: Kullanıcı test senaryosunu yapıştırır (Claude üretmez)
   - **Metin Girişi**: Kullanıcı metin girer → Claude test senaryosu üretir
   - **Jira**: OAuth ile bağlanır → Issue key girer → Claude test senaryosu üretir
   - **Excel**: Dosya yükler → Claude test senaryosu üretir
   - **PDF**: Dosya yükler → Claude test senaryosu üretir
5. **Senaryo Gösterilir** → Kullanıcı düzenler
6. **BDD/Gherkin Dönüşümü** (Claude) → Kullanıcı BDD çıktısını düzenler
7. **Gruba Kaydet** — Senaryolar seçilen gruba kaydedilir

### Renk Kodları
- 🔵 **Mavi** — Gruplama adımı (senaryo grubu seçimi)
- 🟡 **Sarı** — Karar noktası (kaynak seçimi)
- 🟣 **Mor** — Claude'un çalıştığı adımlar
- 🟢 **Yeşil** — Kaydetme
