## Parrot News

Production-ready MVP for a **single-admin** web app that generates one daily **Swedish (learner-level) podcast briefing** from RSS feeds and forwarded newsletter emails.

### What’s implemented
- **Next.js App Router + TypeScript + Tailwind**
- **Hardcoded single-admin auth** (cookie/JWT)
- **Postgres schema + migrations + seed** (Drizzle)
- **RSS ingestion** (`POST /api/jobs/ingest/rss`)
- **Newsletter ingestion (Postmark inbound webhook)** (`POST /api/inbound/email`)
- **Heuristic processing** (dedupe-ish clustering + ranking) (`POST /api/jobs/process/today`)
- **Script generation** (OpenAI) (`POST /api/jobs/generate/script`)
- **Audio generation** (OpenAI TTS) + **Vercel Blob storage** (`POST /api/jobs/generate/audio`)
- **Podcast RSS feed** (`GET /podcast/rss.xml`)
- **Public episode transcript pages** (`/episodes/:date`)
- **Cron scaffolding** (DST-safe window check) (`GET /api/cron/daily`)

### MVP UX
- `/login` → `/admin` (settings dashboard, sources/topics management, **Generate pipeline today**, episode archive)
- public feed at `/podcast/rss.xml`
- transcript per episode at `/episodes/YYYY-MM-DD`

## Getting Started

### 1) Environment variables

Copy `.env.example` to `.env.local` and fill it in. At minimum you need `AUTH_SECRET` (32+ chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `DATABASE_URL`. For a full generated episode you also need `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN`.

### 2) Database (local)

Start a local Postgres (Docker) and run migrations + seed:

```bash
docker run -d --name parrot-news-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=parrot_news \
  -p 54329:5432 postgres:16

npm run db:migrate
npm run db:seed
```

Set `DATABASE_URL` to:

```bash
postgres://postgres:postgres@localhost:54329/parrot_news
```

### 3) Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000` and log in.

## Production deployment (Vercel + Supabase + Postmark)

### Supabase Postgres
- Create a Supabase project and get its connection string.
- Set `DATABASE_URL` in Vercel for Preview/Production.

### Postmark inbound
- Create a Postmark Server.
- Configure **Inbound Webhook** pointing to:
  - `POST https://<your-domain>/api/inbound/email`
- Add header:
  - `x-parrot-token: <POSTMARK_INBOUND_TOKEN>`
- Set `NEWSLETTER_FORWARDING_ADDRESS` for display in the admin UI.

### Vercel Blob (audio hosting)
- Create a Blob store and set `BLOB_READ_WRITE_TOKEN`.

### Cron (06:30 Europe/Oslo, DST-safe)
- `vercel.json` schedules **two** daily GETs to `/api/cron/daily` (`30 4 * * *` and `30 5 * * *` UTC). Exactly one lands at **06:30 Oslo** across CET vs CEST; the other is outside the window and no-ops.
- The handler **only runs generation between 06:30–06:44 Oslo time**.
- Set `CRON_SECRET` in Vercel: the platform sends `Authorization: Bearer <CRON_SECRET>`. Internal job calls use the same header (legacy `x-cron-secret` is still accepted).

## Manual generation

As admin, use **Generate pipeline today** on `/admin`, or call the API directly (requires OpenAI + Blob configured):
- `POST /api/jobs/generate/today`

Or step-by-step:
- `POST /api/jobs/ingest/rss`
- `POST /api/jobs/process/today`
- `POST /api/jobs/generate/script`
- `POST /api/jobs/generate/audio`

## First green run checklist

Use this once per environment (local then production) to confirm the full path works before relying on cron.

1. **Database** — Set `DATABASE_URL`, run `npm run db:migrate` and `npm run db:seed` (or apply migrations in Supabase and seed from your machine against that URL).
2. **Auth** — Set `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Start the app, open `/login`, sign in, confirm you reach `/admin`.
3. **Sources** — Under **Sources**, confirm at least one RSS feed is enabled (seed adds several). Optionally add/remove feeds.
4. **AI + audio** — Set `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN`. Without both, script or audio steps will fail.
5. **Generate** — On **Settings**, click **Generate pipeline today** (or `curl -X POST` with your admin session cookie). Wait until it finishes (can take a few minutes).
6. **Verify** — On **Episodes**, confirm a row for today with status `published`. Open **Page** for that date: audio plays and transcript shows. Open `/podcast/rss.xml` and confirm the item appears in a podcast client.
7. **Cron (production)** — Set `CRON_SECRET` in Vercel, deploy, confirm `vercel.json` crons are listed under the project. Optionally trigger **Run** on a cron job in the dashboard and check function logs for `/api/cron/daily` (expect `skipped: true` with `outside_window` unless you are inside 06:30–06:44 Europe/Oslo).
8. **Newsletters (optional)** — Configure Postmark inbound to `POST https://<domain>/api/inbound/email` with header `x-parrot-token: <POSTMARK_INBOUND_TOKEN>`, set `NEWSLETTER_FORWARDING_ADDRESS` for display in admin.

## Tests

```bash
npm test
```

## Notes / tradeoffs
- Clustering/ranking is heuristic-first for reliability; embeddings/LLM clustering can come later.
- Script generation + TTS require `OPENAI_API_KEY`.
- Publishing playable podcast episodes requires `BLOB_READ_WRITE_TOKEN`.
- If script generation succeeds but audio fails, today’s episode is marked `failed` and the next **Generate pipeline today** or cron run **skips ingest/script** and retries **audio only** (same calendar day).
- Podcast RSS `enclosure` `length` is the stored MP3 byte size when available (after a successful audio upload).

## V2 roadmap
- Better dedupe/clustering (embeddings)
- Manual URL ingestion + light scraping
- Smarter topic diversity and pacing controls
- Timestamped transcripts when supported by provider
