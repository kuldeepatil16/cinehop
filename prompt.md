You are a senior full-stack architect and principal engineer.
You are building CineHop — a cinema showtime aggregator for Madrid, Spain.
The MVP covers 3 chains: Cinesa, Yelmo, and Kinepolis.
The homepage design (cinehop-homepage.html) is already built and attached.
The market research report (report.md) is attached for context.

Your job is to build the complete, fully functioning production-ready
codebase from scratch in a single session. No placeholders. No TODOs.
No "you can add this later." Every file must work.

────────────────────────────────────────
TECH STACK — NON-NEGOTIABLE
────────────────────────────────────────

Framework:     Next.js 14 (App Router, TypeScript strict mode)
Styling:       Tailwind CSS + the design tokens from cinehop-homepage.html
               (paper #f5f2ec, ink #0e0e0e, accent #e8391d, Bebas Neue + DM Sans)
Database:      Supabase (Postgres) — free tier
ORM:           Supabase JS client (no Prisma, keep deps minimal)
Scraping:      Playwright (headless Chromium) — NOT Puppeteer, NOT Cheerio alone
               because all 3 chain sites render JavaScript
Scheduling:    Vercel Cron Jobs (free tier, runs scrapers every 2 hours)
Movie data:    TMDB API (free, for posters, synopsis, ratings, runtime)
Hosting:       Vercel (free tier)
Analytics:     Vercel Analytics (free) — track outbound booking clicks
               This is the ONE metric that matters: outbound clicks per user

────────────────────────────────────────
ARCHITECTURE OVERVIEW
────────────────────────────────────────

/cinehop
  /app                        ← Next.js App Router
    /page.tsx                 ← Homepage (convert cinehop-homepage.html)
    /film/[slug]/page.tsx     ← Film detail page with all sessions
    /api
      /cron/scrape/route.ts   ← Called by Vercel Cron, triggers all scrapers
      /films/route.ts         ← GET all films with sessions for today
      /films/[slug]/route.ts  ← GET single film with full session data
      /track/route.ts         ← POST outbound click tracking

  /scrapers
    /index.ts                 ← Orchestrator: runs all 3, normalises, upserts
    /cinesa.ts                ← Cinesa scraper
    /yelmo.ts                 ← Yelmo scraper
    /kinepolis.ts             ← Kinepolis scraper
    /normalise.ts             ← Shared normalisation logic
    /tmdb.ts                  ← TMDB enrichment

  /lib
    /supabase.ts              ← Supabase client (server + browser)
    /types.ts                 ← All TypeScript interfaces
    /constants.ts             ← Chain URLs, city config, TMDB base URL

  /components
    /FilmCard.tsx
    /FilmGrid.tsx
    /FilterBar.tsx
    /SearchBar.tsx
    /SessionModal.tsx
    /TimeButton.tsx
    /StatBar.tsx
    /Ticker.tsx
    /ChainBadge.tsx

  /vercel.json                ← Cron schedule definition
  /supabase/migrations/       ← SQL migration files

────────────────────────────────────────
DATABASE SCHEMA — BUILD EXACTLY THIS
────────────────────────────────────────

Run these migrations in Supabase SQL editor.
Generate the migration files too so they are version-controlled.

-- FILMS table
-- One row per film. Enriched from TMDB.
CREATE TABLE films (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,      -- url-safe: "dune-messiah"
  title         text NOT NULL,
  title_es      text,                      -- Spanish title if different
  tmdb_id       integer UNIQUE,
  poster_url    text,
  backdrop_url  text,
  synopsis      text,
  synopsis_es   text,
  genre         text[],
  runtime_min   integer,
  rating        numeric(3,1),
  release_date  date,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- CINEMAS table
-- One row per physical cinema location.
CREATE TABLE cinemas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain         text NOT NULL CHECK (chain IN ('cinesa','yelmo','kinepolis')),
  name          text NOT NULL,             -- "Cinesa La Gavia"
  slug          text UNIQUE NOT NULL,      -- "cinesa-la-gavia"
  address       text,
  zone          text,                      -- "este", "norte", etc.
  lat           numeric(9,6),
  lng           numeric(9,6),
  booking_base_url text,                   -- Base URL for this cinema's booking
  created_at    timestamptz DEFAULT now()
);

-- SHOWTIMES table
-- One row per individual screening session.
-- This is the core table. Scraped every 2 hours.
CREATE TABLE showtimes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id       uuid REFERENCES films(id) ON DELETE CASCADE,
  cinema_id     uuid REFERENCES cinemas(id) ON DELETE CASCADE,
  show_date     date NOT NULL,
  show_time     time NOT NULL,
  format        text NOT NULL,             -- 'VOSE','VO','VOSI','Doblada','IMAX','4DX','3D','ScreenX'
  language      text,                      -- 'es','en','fr', etc.
  is_vose       boolean GENERATED ALWAYS AS (format IN ('VOSE','VO','VOSI')) STORED,
  price_eur     numeric(5,2),
  booking_url   text,                      -- Deep link to exact session booking page
  source_hash   text,                      -- MD5 of raw scraped data, detect changes
  last_seen_at  timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (cinema_id, film_id, show_date, show_time, format)
);

-- CLICK_EVENTS table
-- Track every outbound booking click. This is your business metric.
CREATE TABLE click_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id   uuid REFERENCES showtimes(id),
  cinema_chain  text,
  film_slug     text,
  session_format text,
  user_ip       text,                      -- hashed, GDPR-safe
  user_agent    text,
  referrer      text,
  clicked_at    timestamptz DEFAULT now()
);

-- SCRAPE_LOGS table
-- Know when scrapers run, what they found, what failed.
CREATE TABLE scrape_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain         text NOT NULL,
  status        text NOT NULL CHECK (status IN ('success','partial','failed')),
  sessions_found    integer DEFAULT 0,
  sessions_new      integer DEFAULT 0,
  sessions_updated  integer DEFAULT 0,
  error_message text,
  duration_ms   integer,
  ran_at        timestamptz DEFAULT now()
);

-- INDEXES for performance
CREATE INDEX idx_showtimes_date        ON showtimes(show_date);
CREATE INDEX idx_showtimes_is_vose     ON showtimes(is_vose) WHERE is_vose = true;
CREATE INDEX idx_showtimes_film        ON showtimes(film_id);
CREATE INDEX idx_showtimes_cinema      ON showtimes(cinema_id);
CREATE INDEX idx_showtimes_last_seen   ON showtimes(last_seen_at);

-- ROW LEVEL SECURITY (Supabase requires this)
ALTER TABLE films         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinemas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE showtimes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs    ENABLE ROW LEVEL SECURITY;

-- Public read access for films, cinemas, showtimes
CREATE POLICY "public read films"     ON films     FOR SELECT USING (true);
CREATE POLICY "public read cinemas"   ON cinemas   FOR SELECT USING (true);
CREATE POLICY "public read showtimes" ON showtimes FOR SELECT USING (true);

-- Service role only for writes (scrapers use service key)
CREATE POLICY "service write films"     ON films     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write cinemas"   ON cinemas   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write showtimes" ON showtimes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write clicks"    ON click_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write logs"      ON scrape_logs  FOR ALL USING (auth.role() = 'service_role');

────────────────────────────────────────
SCRAPER SPECIFICATIONS — BUILD EXACTLY THIS
────────────────────────────────────────

Each scraper must:
1. Use Playwright with headless Chromium
2. Handle bot detection gracefully (set real user-agent, random delay 1–3s)
3. Scrape TODAY and TOMORROW minimum (7 days if pagination is simple)
4. Extract: film title, cinema name, date, time, format, price, booking URL
5. Compute source_hash = MD5(cinema_id + film_title + date + time + format)
6. Upsert into showtimes table (ON CONFLICT DO UPDATE SET last_seen_at)
7. After scraping, call TMDB to enrich any new films
8. Log result to scrape_logs table regardless of success or failure
9. Never crash silently — catch all errors, log them, continue

-- CINESA
Target: https://www.cinesa.es/cines/
Pattern: Navigate to each Madrid cinema page.
         Cinemas to cover (seed these in cinemas table):
         Cinesa La Gavia, Cinesa Manoteras, Cinesa Méndez Álvaro,
         Cinesa Nassica, Cinesa Parquesur, Cinesa Príncipe Pío,
         Cinesa Proyecciones, Cinesa Las Rosas, Cinesa La Moraleja
Format detection: Look for "VOSE", "VO", "IMAX", "4DX", "3D" in session labels
Booking URL: Extract the direct href of each time slot button

-- YELMO
Target: https://yelmocines.es/cartelera/madrid
Pattern: Single page with all Madrid sessions. Scroll and extract.
         Cinemas to cover:
         Yelmo Ideal, Yelmo Islazul, Yelmo La Vaguada, Yelmo Plenilunio,
         Yelmo Planetocio, Yelmo Rivas H2O, Yelmo Tres Aguas, Yelmo Plaza Norte
Format detection: Parse session type tags — VOSE, VO, Doblada, IMAX, MacroXE
Booking URL: Extract href from each session button

-- KINEPOLIS
Target: https://kinepolis.es/carteleras/madrid
Pattern: Navigate to cartelera page for Madrid.
         Cinemas to cover: Kinepolis Madrid
Format detection: VOSE, VOSI, 3D, Dolby Atmos, 4DX, ScreenX
Booking URL: Extract href from each time button

────────────────────────────────────────
NORMALISATION RULES — APPLY IN normalise.ts
────────────────────────────────────────

All 3 chains use different format labels. Normalise to:
  "VOSE"     → any of: "V.O.S.E.", "VOSE", "VO Sub", "Subtitulada"
  "VO"       → any of: "V.O.", "VO", "Versión Original"
  "VOSI"     → any of: "VOSI", "VO Int."
  "Doblada"  → any of: "Doblada", "Español", "Cast.", default if no label
  "IMAX"     → "IMAX", "IMAX 3D"
  "4DX"      → "4DX", "4D", "4DX3D"
  "3D"       → "3D", "3-D"
  "ScreenX"  → "ScreenX", "Screen X"
  "Dolby"    → "Dolby Atmos", "Dolby Cinema"
  "MacroXE"  → "MacroXE", "Macro XE"

is_vose should be TRUE for: VOSE, VO, VOSI
language should be:
  "en" for VOSE/VO/VOSI when original film is English
  "es" for Doblada

Film title matching:
  Strip accents, lowercase, trim for fuzzy matching across chains
  "DUNE: PART TWO" == "Dune: Parte Dos" == "Dune 2" → same film_id
  Use TMDB search as source of truth for canonical title + id

────────────────────────────────────────
API ROUTES — BUILD EXACTLY THIS
────────────────────────────────────────

GET /api/films
  Query params:
    date       = "today" | "tomorrow" | "YYYY-MM-DD"  (default: today)
    vose       = "true" | "false"
    format     = "IMAX" | "4DX" | "3D" | "VOSE" etc.
    chain      = "cinesa" | "yelmo" | "kinepolis"
    zone       = "centro" | "norte" | "sur" | "este" | "oeste"
    q          = search string (matches title, cinema name)
    price_max  = number in euros
  Response: Array of films, each with their matching sessions for the date
  Performance: Query must complete in < 300ms. Use JOIN, not N+1.
  Cache: cache-control: s-maxage=300 (5 min Vercel edge cache)

GET /api/films/[slug]
  Response: Full film object + ALL upcoming sessions grouped by cinema
  Cache: s-maxage=300

POST /api/track
  Body: { showtime_id, cinema_chain, film_slug, session_format }
  Action: Insert into click_events (hash IP, store user_agent + referrer)
  Response: { ok: true }
  This fires on every "Book tickets" button click
  Do NOT block the redirect on this — fire and forget from the client

GET /api/cron/scrape
  Protected by: Authorization: Bearer ${CRON_SECRET} header check
  Action: Run all 3 scrapers sequentially. Return summary JSON.
  Timeout: Set Vercel function timeout to 300s (max on free tier)

────────────────────────────────────────
FRONTEND REQUIREMENTS — CONVERT THE HTML
────────────────────────────────────────

Convert cinehop-homepage.html to Next.js components exactly preserving:
- All fonts (Bebas Neue, DM Sans, DM Mono from Google Fonts)
- All CSS variables (paper, ink, accent, gold colours)
- All animations (fadeUp, pulse, ticker, blink)
- The grain overlay texture
- The sticky nav
- The live date strip
- The search + filter bar
- The stats bar (film count, session count, VOSE count)
- The film grid
- The session modal (click any film card)
- The ticker tape
- The footer with chain badges

Additional pages to build:
/film/[slug] — Film detail page
  - Large backdrop image from TMDB
  - Full synopsis
  - All sessions grouped by: Date → Chain → Cinema → Times
  - Each time slot is a <a> that fires /api/track then opens booking URL
  - Breadcrumb: Home → Film Title
  - SEO: <title>{film} showtimes Madrid | CineHop</title>
  - og:image, og:description for social sharing

Homepage SEO:
  <title>CineHop — Películas en Madrid hoy | Cartelera de cine</title>
  <meta description="Encuentra todas las sesiones de cine en Madrid — Cinesa, Yelmo y Kinepolis. Filtros VOSE, IMAX, 4DX y precios. Sin sorpresas.">

────────────────────────────────────────
ENVIRONMENT VARIABLES NEEDED
────────────────────────────────────────

Create .env.local.example with exactly these:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       ← server-only, for scrapers
TMDB_API_KEY=                    ← from themoviedb.org, free
CRON_SECRET=                     ← random string, protects /api/cron/scrape

────────────────────────────────────────
VERCEL CRON — vercel.json
────────────────────────────────────────

{
  "crons": [{
    "path": "/api/cron/scrape",
    "schedule": "0 */2 * * *"
  }]
}

This runs every 2 hours. Free tier allows 2 cron jobs.
The scraper must complete within 300 seconds.
If Playwright is too heavy for Vercel free serverless (it is),
use a separate lightweight scraper approach:
  → Run scrapers locally or on a free Railway.app instance
  → POST results to /api/ingest (service-role protected)
  → /api/cron/scrape becomes a trigger endpoint only
Document this clearly in README.md

────────────────────────────────────────
SEED DATA — MUST BE INCLUDED
────────────────────────────────────────

Create /supabase/seed.sql with:
- All Madrid cinema locations for all 3 chains
  with name, slug, address, zone, lat/lng, booking_base_url
- 3–5 sample films with TMDB ids for local development
- 20–30 sample showtimes so the UI works without running scrapers

────────────────────────────────────────
README.md — WRITE THIS TOO
────────────────────────────────────────

Include:
1. Project overview (1 paragraph)
2. Local development setup (step by step, assume zero context)
3. Supabase setup (create project, run migrations, set RLS)
4. TMDB API key setup
5. How to run scrapers manually: npm run scrape
6. How to run scrapers on a schedule (Vercel cron vs Railway option)
7. Deployment to Vercel
8. The one metric to watch: outbound clicks in click_events table
9. How to query it: SELECT chain, COUNT(*) FROM click_events GROUP BY chain

────────────────────────────────────────
QUALITY STANDARDS — NON-NEGOTIABLE
────────────────────────────────────────

TypeScript:
  - strict: true in tsconfig.json
  - No `any` types anywhere
  - All Supabase query results typed with generated types or manual interfaces
  - All API responses typed

Error handling:
  - Every scraper wrapped in try/catch, errors logged to scrape_logs
  - Every API route returns proper HTTP status codes
  - 404 for unknown film slugs
  - 500 with safe error message (no stack traces to client)
  - Scraper failure for one chain must NOT block the other two

Performance:
  - Homepage must score > 85 on Lighthouse mobile
  - No layout shift from font loading (use font-display: swap)
  - Film grid uses CSS grid, no JS layout libraries
  - Images lazy-loaded with next/image
  - API responses cached at edge with s-maxage headers

SEO — this is how free users find you:
  - Every film page has canonical URL
  - Structured data: Schema.org Event markup for each showtime
  - Sitemap at /sitemap.xml generated from films table
  - robots.txt allowing all crawlers

GDPR (you are in the EU — this is not optional):
  - No cookies without consent
  - IP addresses hashed with SHA-256 before storing in click_events
  - Privacy policy page at /privacidad
  - Cookie banner component (minimal, no third-party scripts)

Google AdSense preparation (for later):
  - Leave a clearly marked <div id="ad-slot-top"> on homepage
  - Leave a <div id="ad-slot-sidebar"> on film detail page
  - These are empty now — AdSense will fill them later
  - Do not add any ad scripts yet

────────────────────────────────────────
WHAT TO BUILD FIRST — EXACT ORDER
────────────────────────────────────────

Do not deviate from this order:

1. /lib/types.ts                     ← All interfaces first
2. /supabase/migrations/001_init.sql ← Full schema
3. /supabase/seed.sql                ← Seed data
4. /lib/supabase.ts                  ← Client setup
5. /lib/constants.ts                 ← URLs, config
6. /scrapers/normalise.ts            ← Normalisation logic
7. /scrapers/tmdb.ts                 ← TMDB enrichment
8. /scrapers/cinesa.ts               ← Cinesa scraper
9. /scrapers/yelmo.ts                ← Yelmo scraper
10. /scrapers/kinepolis.ts           ← Kinepolis scraper
11. /scrapers/index.ts               ← Orchestrator
12. /app/api/cron/scrape/route.ts    ← Cron endpoint
13. /app/api/films/route.ts          ← Films API
14. /app/api/films/[slug]/route.ts   ← Film detail API
15. /app/api/track/route.ts          ← Click tracking
16. /components/* (all)              ← UI components
17. /app/page.tsx                    ← Homepage
18. /app/film/[slug]/page.tsx        ← Film detail page
19. /vercel.json                     ← Cron config
20. .env.local.example               ← Env template
21. README.md                        ← Setup guide

────────────────────────────────────────
CONSTRAINTS
────────────────────────────────────────
- Zero paid services. Everything on free tiers. 
- ALL APIs free, make new apis if you cant find anything on internet.
- Supabase free: 500MB DB, 2GB bandwidth, 50MB file storage
- Vercel free: 100GB bandwidth, Hobby plan functions
- OMDB free: 40 requests/10s rate limit — add delay between enrichment calls
- Do not add: auth, user accounts, payments, seat maps, push notifications
- Do not add: React Query, Redux, Zustand, or any state management library
  Use Next.js built-in data fetching (Server Components) + useState only
- Do not use CSS-in-JS. Tailwind only, with the custom tokens from the HTML.
- Package.json scripts must include:
    "scrape": "npx tsx scrapers/index.ts"
    "scrape:cinesa": "npx tsx scrapers/cinesa.ts"
    "scrape:yelmo": "npx tsx scrapers/yelmo.ts"
    "scrape:kinepolis": "npx tsx scrapers/kinepolis.ts"

────────────────────────────────────────
ATTACHMENTS IN THIS CONVERSATION
────────────────────────────────────────

- cinehop-homepage.html  → Convert this to Next.js components exactly (D:\Coding\cinehop\cinehop-homepage.html)
- D:\Coding\cinehop\Spanish cinema market research report.md → Market research. Read it. Understand why VOSE
                           must be the most prominent filter. Understand
                           why deep links (not homepage links) matter.
                           Understand why price transparency matters.
                           Do not deviate from these user insights.

────────────────────────────────────────
FINAL INSTRUCTION
────────────────────────────────────────

Build everything. No stubs. No placeholders.
If something cannot be fully implemented (e.g. Playwright won't work
in a serverless function), explain why and provide the working alternative.
Every file must be production-ready and immediately runnable.
When done, output a summary of every file created and the exact.
Use only free stuff and free apis, we build open source and monetize on that.
TMDB is not free, find alternate free solutions.
commands to run to get it working locally in under 10 minutes.