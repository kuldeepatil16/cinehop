# CineHop

CineHop is a Madrid cinema showtime aggregator built for the pain points surfaced in the research: VOSE discovery is front and center, each session links directly into the chain booking flow, and prices stay visible before users click away to Cinesa, Yelmo, or Kinepolis
The current app is Spain-focused (Madrid, Barcelona, etc.) and the screenshots show BookMyShow (India) we want the same design pattern - movie cards with posters, ratings, and showtimes listed below or alongside. Always check https://in.bookmyshow.com/explore/home/pune, the internet and this website on how we can make this cinehop website better.
The real question is whether we're capturing all available movies across all cinemas and days, or if we're limited by the current cinema-by-cinema iteration approach. Looking at how BookMyShow structures it—showing all movies first, then revealing which cinemas have them—I think what's needed is ensuring the scrapers comprehensively cover all cinemas and that the data aggregation surfaces every movie that's actually playing.

## Stack

- Next.js 14 App Router with strict TypeScript
- Tailwind CSS plus the homepage design tokens from `cinehop-homepage.html`
- Supabase Postgres with the Supabase JS client
- Playwright scrapers for JS-rendered cinema sites
- OMDb free API for film enrichment
- Vercel Analytics for high-level traffic instrumentation

## Local Setup

1. Install Node.js 20+.
2. Copy `.env.local.example` to `.env.local`.
3. Create a Supabase project.
4. Run every SQL file in `supabase/migrations/` in order: `001_init.sql`, `002_staleness.sql`, `003_city_support.sql`, `004_multi_city_cinemas.sql`, `005_staleness_24h.sql`.
5. Run the SQL in [supabase/seed.sql](/d:/Coding/cinehop/supabase/seed.sql) in the same editor.
6. Fill `.env.local` with your Supabase URL, anon key, service role key, OMDb key, and a random `CRON_SECRET`.
7. Install dependencies with `npm install`.
8. Start the app with `npm run dev`.
9. Open `http://localhost:3000`.

The seeded films and showtimes make the UI work immediately, even before you run scrapers.

## Supabase Setup

1. Create a new Supabase project on the free tier.
2. Open the SQL editor.
3. Run every file in `supabase/migrations/` in order.
4. Run [supabase/seed.sql](/d:/Coding/cinehop/supabase/seed.sql).
5. Copy the project URL, anon key, and service role key into `.env.local`.

RLS is enabled in the migration. Public reads are allowed on films, cinemas, and showtimes. Writes are service-role only.

## OMDb Setup

1. Request a free API key from `https://www.omdbapi.com/apikey.aspx`.
2. Put it into `OMDB_API_KEY` in `.env.local`.

OMDb does not provide backdrop images. The app falls back to poster-led hero layouts and chain-sourced artwork where available.

## Running Scrapers

- Run all chains: `npm run scrape`
- Run only Cinesa: `npm run scrape:cinesa`
- Run only Yelmo: `npm run scrape:yelmo`
- Run only Kinepolis: `npm run scrape:kinepolis`

The scrapers write directly to Supabase using `SUPABASE_SERVICE_ROLE_KEY`.

## Scheduling

### Recommended production scheduler

Use GitHub Actions cron for a public OSS repo. It is free, works well with Playwright, and avoids the browser/runtime limits of Vercel Hobby serverless.

Recommended cron command:

```bash
npm run scrape
```

### Included Vercel cron

[vercel.json](/d:/Coding/cinehop/vercel.json) includes the requested 2-hour cron hitting `/api/cron/scrape`. That endpoint works in local and Playwright-capable runtimes, but Vercel Hobby serverless is not the reliable place to run Chromium-heavy scrapers in production.

### Railway-style alternative

If you prefer a separate runtime, run the same `npm run scrape` command on Railway or any low-cost container host and point it at the same Supabase project.

## Deployment

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the same environment variables from `.env.local`.
4. Deploy.

For production scraping, keep the frontend on Vercel and run the Playwright scraper job outside Vercel serverless.

## Metric That Matters

The core business metric is outbound booking clicks stored in `click_events`.

Query it with:

```sql
select cinema_chain, count(*)
from click_events
group by cinema_chain
order by count(*) desc;
```

If you want a per-film cut:

```sql
select film_slug, count(*)
from click_events
group by film_slug
order by count(*) desc;
```

## Useful Commands

```bash
npm install
npm run dev
npm run typecheck
npm run scrape
```

## Notes

- The project intentionally removed TMDB usage to stay on a free metadata stack.
- Cinesa currently exposes useful browser-session JSON responses, Yelmo renders bookable links in the DOM, and Kinepolis is the most bot-sensitive target, so scraper failures are logged per-chain and do not stop the other chains.
- Next.js 14 was kept because it was a hard requirement. Current `npm audit` advisories recommend moving beyond 14.x for full upstream remediation, but this repo stays on 14.x to match the requested framework version.


## Find Values
Array.from(document.querySelectorAll('#ddlCinema option')).map(o => ({ value: o.value, label: o.textContent.trim() }))
 The city-cinema dropdown values (e.g. "castelldefels", "abrera") are best guesses based on their URL/name pattern. The scraper logs the actual dropdown values it finds, so when the GitHub Actions runs you'll see in the logs whether the values match. If they don't, the log will print something like [yelmo] Dropdown value "castelldefels" not found — skipping. At that point you'd correct the values.
