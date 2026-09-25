# MTK-UI

Mənzil-Tikinti Kooperativi (MTK) idarəetmə sisteminin frontend hissəsi. Next.js (App Router) üzərində qurulub, giriş üçün Keycloak-dan, məlumatlar üçün isə ayrıca [MTK API](https://github.com/AliHasanov97/MTK) (.NET backend) layihəsindən istifadə edir.

## Tərkib

- **Landing səhifə** — sistemin təqdimatı, "Daxil ol" düyməsi.
- **Giriş (auth)** — Keycloak ilə Authorization Code + PKCE axını (public client). Access token bitməzdən əvvəl fonda avtomatik yenilənir (refresh token ilə), istifadəçi sistemdən çıxarılmır.
- **Panel** (`/panel`) — rol əsaslı, tək panel. Sol menyu istifadəçinin roluna görə fərqli bölmələr göstərir:
  - **Binalar və mənzillər** — MTK API-nin Buildings modulu ilə canlı işləyir.
  - **Hesablar / Maliyyə / Müraciətlər** — hazırda placeholder (backend-də uyğun modullar hələ yazılmayıb).
  - **İstifadəçilər / Rollar / Qruplar / Audit qeydləri** — MTK API-nin Identity modulu ilə canlı işləyir (yalnız İdarəçi rolu üçün görünür).

## Tələb olunanlar

- Node.js 20+
- İşləyən [MTK API](https://github.com/AliHasanov97/MTK) backend-i və onun Keycloak/Postgres infrastrukturu (bax: həmin repo-nun README-si)

## Quraşdırma

```bash
npm install
```

Layihənin kökündə `.env.local` faylı yaradın:

```bash
KEYCLOAK_URL=http://localhost:8080/
KEYCLOAK_REALM=mtk
KEYCLOAK_CLIENT_ID=mtk-web
APP_URL=http://localhost:3000/
NEXT_PUBLIC_API_URL=http://localhost:5000/
```

Dev serveri işə salın:

```bash
npm run dev
```

Sayt `http://localhost:3000` ünvanında açılacaq.

## Keycloak konfiqurasiyası

`mtk-web` public client-də aşağıdakılar təyin olunmalıdır:

- **Valid redirect URIs**: `http://localhost:3000/auth/callback` (və lazım gələrsə `http://localhost:3000/*`)
- **Valid post logout redirect URIs**: `http://localhost:3000/*`
- Access token-in `aud` sahəsində backend-in gözlədiyi audience-in olması (bax: MTK API-nin `Authentication:Audience` konfiqurasiyası)

Rol əsaslı panel bölmələri istifadəçinin `realm_access.roles` daxilindəki adlara görə göstərilir (bax: `app/lib/auth/roles.ts`).

## Layihə strukturu

```
app/
  components/       Landing səhifə komponentləri (Header, Hero, Footer və s.)
  lib/
    auth/            Keycloak/PKCE giriş axını, AuthContext, rol tərifləri
    api/             Backend API-yə tipli sorğular (buildings.ts, identity.ts)
  panel/             Panel layout-u, naviqasiya, hər modulun səhifələri
  auth/callback/     Keycloak-dan qayıdış nöqtəsi (kod → token mübadiləsi)
```

## Skriptlər

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # production server
npm run lint     # ESLint
```

## Əlaqəli layihə

Backend API: [AliHasanov97/MTK](https://github.com/AliHasanov97/MTK) — .NET modular monolith, Keycloak-la inteqrasiya olunub, PostgreSQL istifadə edir.
