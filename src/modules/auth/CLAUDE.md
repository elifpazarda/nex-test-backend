# Auth Module

Kullanici kayit, giris, token yenileme, bilgi sorgulama ve cikis islemleri. JWT token yonetimi tokenVersion ile desteklenir.

## Dosyalar

| Dosya | Sorumluluk |
|-------|------------|
| `auth.controller.ts` | Route handler'lari, guard ve decorator kullanimi |
| `auth.service.ts` | Kayit, giris, refresh, me, logout, token uretimi is mantigi |
| `auth.module.ts` | PassportModule + JwtModule import |
| `jwt.strategy.ts` | Bearer token dogrulama, tokenVersion kontrolu, payload → `{ id, email }` donusumu |
| `models/auth.request.ts` | `RegisterRequest`, `LoginRequest`, `RefreshTokenRequest` |
| `models/auth.response.ts` | `UserResponse`, `AuthTokens`, `JwtPayload` |

## Endpointler

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | /auth/register | - | `RegisterRequest` | `UserResponse` |
| POST | /auth/login | - | `LoginRequest` | `AuthTokens` |
| POST | /auth/refresh | - | `RefreshTokenRequest` | `AuthTokens` |
| GET | /auth/me | JWT | - | `UserResponse` |
| POST | /auth/logout | JWT | - | `{ message }` |

## Akis

```
Register:
  RegisterRequest → sifre hash (bcrypt) → DB'ye kaydet → UserResponse (password haric)

Login:
  LoginRequest → email ile kullanici bul → sifre karsilastir (bcrypt)
    → JWT_SECRET ile accessToken imzala (payload: { sub, email, tokenVersion })
    → JWT_REFRESH_SECRET ile refreshToken imzala
    → AuthTokens doner

Refresh:
  RefreshTokenRequest → refreshToken dogrula (JWT_REFRESH_SECRET)
    → DB'den kullanici bul → tokenVersion eslesme kontrolu
    → Yeni token cifti uret → AuthTokens doner

Me:
  Authorization: Bearer <token> → JwtStrategy dogrular
    → payload { sub, email, tokenVersion } → DB'den tokenVersion kontrolu
    → eslesmezse UnauthorizedException
    → @CurrentUser() ile userId alinir → DB'den kullanici cekilir → UserResponse

Logout:
  tokenVersion artirilir (increment 1) → eski tokenlar gecersiz olur
  → { message: "Cikis yapildi" }
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
- JWT payload: `{ sub: userId, email, tokenVersion }` — hassas veri icermez
- tokenVersion ile token invalidation: logout sonrasi eski tokenlar gecersiz
- Register ve login endpointlerinde rate limiting: 10 istek/dakika
