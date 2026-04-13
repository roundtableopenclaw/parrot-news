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
- `/login` → `/admin` (settings dashboard, sources/topics management)
- public feed at `/podcast/rss.xml`
- transcript per episode at `/episodes/YYYY-MM-DD`

## Getting Started

### 1) Environment variables

Copy `.env.example` to `.env.local` and fill it in.

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

As admin, you can trigger the pipeline (requires OpenAI + Blob configured):
- `POST /api/jobs/generate/today`

Or step-by-step:
- `POST /api/jobs/ingest/rss`
- `POST /api/jobs/process/today`
- `POST /api/jobs/generate/script`
- `POST /api/jobs/generate/audio`

## Tests

```bash
npm test
```

## Notes / tradeoffs
- Clustering/ranking is heuristic-first for reliability; embeddings/LLM clustering can come later.
- Script generation + TTS require `OPENAI_API_KEY`.
- Publishing playable podcast episodes requires `BLOB_READ_WRITE_TOKEN`.

## V2 roadmap
- Better dedupe/clustering (embeddings)
- Manual URL ingestion + light scraping
- Smarter topic diversity and pacing controls
- Timestamped transcripts when supported by provider
