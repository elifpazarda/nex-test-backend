# nex-test-backend

AI destekli test senaryosu uretim platformunun backend servisi.

## Hizli Baslangic

```bash
npm install
cp .env.example .env   # degiskenleri doldur
npx prisma generate && npx prisma migrate dev
npm run start:dev       # http://localhost:3001/api
```

## Dokumantasyon

Detayli kurulum, API endpointleri, veritabani schemasi ve Jira entegrasyonu icin **[BACKEND_README.md](BACKEND_README.md)** dosyasina bak.
