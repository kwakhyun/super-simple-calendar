# Simple Calendar — Auth Server

Node.js + Express + TypeScript backend. Structure and auth flows follow the
Jurnee server (raw SQL on `better-sqlite3`, JWT with revocation, bcrypt,
Resend email, Zod validation, helmet + rate limiting).

## Setup

```bash
cd server
npm install
cp .env.example .env      # then edit values
npm run dev               # http://localhost:4000 (tsx watch)
```

The SQLite file and schema are created automatically on startup
(`./data/calendar.db`). `npm run db:migrate` runs migrations manually.
`npm run build && npm start` runs the compiled server.

## Endpoints (`/auth`)

| Method | Path                   | Auth | Purpose                                  |
| ------ | ---------------------- | ---- | ---------------------------------------- |
| POST   | `/register`            | —    | Email signup → sends 6-digit code        |
| POST   | `/login`               | —    | Email login (403 if email not verified)  |
| POST   | `/verify-email`        | JWT  | Confirm 6-digit code                     |
| POST   | `/resend-verification` | JWT  | Re-send the code                         |
| POST   | `/social`              | —    | Google / Apple / Kakao token → JWT       |
| GET    | `/kakao/start`         | —    | Kakao web login (opened in a browser)    |
| GET    | `/kakao/callback`      | —    | Kakao redirect → deep links JWT to app   |
| GET    | `/me`                  | JWT  | Current user                             |
| POST   | `/logout`              | JWT  | Revoke the token                         |

`GET /health` is a liveness probe.

## Fly.io deployment

The server now follows the same deployment shape as Jurnee:

- `Dockerfile` builds TypeScript in a Node 22 build stage, prunes dev
  dependencies, then runs `dist/index.js` in a slim runtime image.
- `fly.toml` deploys the API on port `4000`, keeps one machine running, mounts
  SQLite storage at `/data`, and checks `GET /health`.
- `.dockerignore` excludes local env files, `node_modules`, `dist`, and local
  SQLite data from the deployment context.

Typical setup:

```bash
cd server
fly launch --copy-config
fly volumes create calendar_data --region nrt --size 1
fly secrets set \
  JWT_SECRET="$(openssl rand -base64 48)" \
  RESEND_API_KEY="re_xxxxxxxx" \
  EMAIL_FROM="Simple Calendar <verify@your-domain.com>" \
  SERVER_URL="https://super-simple-calendar-api.fly.dev"
fly deploy
```

Set OAuth secrets the same way when those providers are enabled:
`KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, and `APPLE_BUNDLE_ID`.

## Environment variables

See `.env.example`. Notes:

- **`JWT_SECRET`** — required (≥16 chars) in production; a dev fallback is used otherwise.
- **Email** — without `RESEND_API_KEY` the verification code is logged to the
  server console (`📧 [DEV] 인증 코드 → …`), so the whole flow works locally
  with no email provider. Set `RESEND_API_KEY` + `EMAIL_FROM` for real delivery
  ([resend.com](https://resend.com)).
- **Google** — no server secret. The app sends a Google access token; the
  server verifies it via Google's userinfo endpoint.
- **Apple** — set `APPLE_BUNDLE_ID` (default `com.torinana.supersimplecalendar`).
  The server verifies the identity token against Apple's public keys.
- **Kakao** — set `KAKAO_REST_API_KEY` (and `KAKAO_CLIENT_SECRET` if enabled in
  the Kakao console). Register the redirect URI `${SERVER_URL}/auth/kakao/callback`
  in the Kakao Developers console. `APP_SCHEME` must match the app's scheme
  (`supersimplecalendar`).

## Connecting the mobile app

The app reads `EXPO_PUBLIC_API_URL` and defaults to the Fly.io production API:
`https://super-simple-calendar-api.fly.dev`. The repo root `.env` and
`eas.json` development/preview/production build profiles use that same URL.
To point a local debug session at another server, override the value in your
local `.env`.

```
EXPO_PUBLIC_API_URL=https://super-simple-calendar-api.fly.dev
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
```

The Google buttons appear only when a Google client ID is configured; the
Apple button appears only on iOS 13+ devices. Kakao always works (server-side
web flow), provided the server has Kakao keys.

> OAuth provider apps (Google Cloud, Apple Developer, Kakao Developers) must be
> registered separately and their credentials supplied via env — the code is
> wired, the accounts are not.
