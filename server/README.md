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

The app reads `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:4000`).
For a physical device use your machine's LAN IP, e.g. create a `.env` in the
repo root:

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:4000
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
