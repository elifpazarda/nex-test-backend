# Auth Module

Kullanici kayit, giris ve JWT token yonetimi.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `auth.controller.ts` | Route handler'lari, guard ve decorator kullanimi |
| `auth.service.ts` | Kayit, giris, token uretimi is mantigi |
| `auth.module.ts` | PassportModule + JwtModule import |
| `jwt.strategy.ts` | Bearer token dogrulama, payload → `{ id, email }` donusumu |
| `models/auth.request.ts` | `RegisterRequest`, `LoginRequest` |
| `models/auth.response.ts` | `UserResponse`, `AuthTokens` |

## Endpointler

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | /auth/register | - | `RegisterRequest` | `UserResponse` |
| POST | /auth/login | - | `LoginRequest` | `AuthTokens` |
| GET | /auth/me | JWT | - | `UserResponse` |
| POST | /auth/logout | JWT | - | `{ message }` |

## Akis

```
Register:
  RegisterRequest → sifre hash (bcrypt) → DB'ye kaydet → UserResponse (password haric)

Login:
  LoginRequest → email ile kullanici bul → sifre karsilastir (bcrypt)
    → JWT_SECRET ile accessToken imzala
    → JWT_REFRESH_SECRET ile refreshToken imzala
    → AuthTokens doner

Me:
  Authorization: Bearer <token> → JwtStrategy dogrular
    → payload { sub, email } → { id, email } olarak request.user'a atar
    → @CurrentUser() ile userId alinir → DB'den kullanici cekilir → UserResponse

Logout:
  Sunucu tarafinda token invalidation yok (stateless JWT)
  Client token'i siler
```

## Ortam Degiskenleri

| Degisken | Kullanim |
|----------|----------|
| `JWT_SECRET` | Access token imzalama/dogrulama |
| `JWT_EXPIRES_IN` | Access token suresi (ornek: `1d`) |
| `JWT_REFRESH_SECRET` | Refresh token imzalama/dogrulama |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token suresi (ornek: `7d`) |

## Guvenlik

- Sifre bcrypt ile hash'lenir (salt round: 10)
- Password alani response'larda donmez (`select` ile haric tutulur)
- JWT payload: `{ sub: userId, email }` — hassas veri icermez
