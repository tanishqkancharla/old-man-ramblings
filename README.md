# Recommended Readings

Mario Zechner’s “recommended reading” posts, updated daily.

Live at [recommendedreadings.com](https://recommendedreadings.com).

## Develop

```bash
npm install
vercel env pull .env.local
npm run dev
```

Built with [TanStack Start](https://tanstack.com/start) and [Maui](https://github.com/tanishqkancharla/maui).

## Architecture

1. **Daily ingest** (Nitro scheduled task → Vercel Cron, 06:00 UTC) fetches FxTwitter search `from:badlogicgames "recommended reading"` and upserts into Neon Postgres.
2. **Homepage** reads from Postgres (seeds on first empty load).
3. **Weekly newsletter** (backend ready; frontend subscribe UI paused) — Mondays 14:00 UTC task emails last 7 days via Resend. Cron schedule is commented until the UI returns.

Env vars:

- `DATABASE_URL` — Neon Postgres (Vercel Marketplace)
- `CRON_SECRET` — secures Nitro/Vercel cron invocations
- `RESEND_API_KEY` — newsletter sending
- `NEWSLETTER_FROM` — optional From header (verify domain in Resend)

## Libretto workflow

Local/debug scrape of the same FxTwitter source:

```bash
npx libretto run src/workflows/mario-recommended-readings.ts --headless --params '{"maxPosts":20}'
```
