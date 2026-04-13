# Parrot News — initial plan

This document captures the **original product intent**, **MVP scope**, and **follow-up roadmap** for the repository. It is meant for humans and cloud agents orienting on the project.

## Product vision

Build a **single-admin** web application that produces **one daily Swedish-language podcast briefing** at a **learner-friendly level**, sourced from:

- **RSS feeds** (configured in admin)
- **Forwarded newsletter email** (Postmark inbound webhook)

The output is a **real podcast**: script, synthesized audio hosted on **Vercel Blob**, and a **public RSS feed** for podcast clients. Each day also has a **public transcript page** on the web.

## Guiding constraints

- **One operator**: hardcoded admin credentials (JWT cookie), not multi-tenant SaaS.
- **Reliability over cleverness** for news clustering: **heuristic dedupe / clustering / ranking** first; embeddings or LLM-based clustering deferred.
- **Deploy on Vercel** with **Postgres** (e.g. Supabase), optional **OpenAI** for script + TTS when keys are present.

## MVP scope (what “done” meant for v0)

### Content pipeline

1. **Ingest** — `POST /api/jobs/ingest/rss` pulls configured sources; Postmark posts to `POST /api/inbound/email` for newsletters.
2. **Process** — `POST /api/jobs/process/today` clusters and ranks items for “today” in Europe/Oslo.
3. **Script** — `POST /api/jobs/generate/script` (OpenAI) writes the episode script.
4. **Audio** — `POST /api/jobs/generate/audio` (OpenAI TTS + Blob upload).
5. **Publish** — episode surfaces via `GET /podcast/rss.xml` and `/episodes/YYYY-MM-DD`.

### Operator UX

- **`/login`** → **`/admin`**: settings, RSS sources, topics.
- **Manual run** — `POST /api/jobs/generate/today` or the individual job routes (for debugging and backfills).

### Automation

- **Cron**: `vercel.json` schedules a daily hit to **`/api/cron/run-generate`** (UTC). That route chains ingest → process → script → audio with `x-cron-secret` auth.
- **Alternate daily guard**: **`/api/cron/daily`** implements a **06:30 Europe/Oslo window** (DST-safe) if you prefer frequent cron ticks with local-time gating; wire it in `vercel.json` if you adopt that pattern instead of a single daily UTC run.

### Data layer

- **Drizzle ORM** + SQL migrations under `drizzle/`, seed script for default sources.

## Explicit non-goals (MVP)

- Multi-user accounts, roles, or billing.
- Fully automated legal/compliance review of third-party content.
- Timestamp-level transcript sync (depends on provider capabilities later).

## Environment (high level)

Required for a running app: `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL`.

Optional by feature: `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, Postmark webhook token + `NEWSLETTER_FORWARDING_ADDRESS`, `CRON_SECRET` for scheduled jobs.

See `README.md` for concrete setup commands and deployment notes.

## Success criteria for the MVP

- Admin can add sources and run (or schedule) a full day pipeline.
- Listeners can subscribe in a podcast app via the RSS URL and play the episode.
- Readers can open the day’s transcript on the web.

## V2 roadmap (from project notes)

- Stronger **dedupe / clustering** (e.g. embeddings).
- **Manual URL ingestion** and light scraping for one-off stories.
- **Topic diversity and pacing** controls in generation.
- **Timestamped transcripts** when the stack supports it reliably.

## Maintenance note

Operational details and commands may evolve; **`README.md`** should stay the source of truth for runbooks. This file is the **stable narrative plan** for scope and intent.
