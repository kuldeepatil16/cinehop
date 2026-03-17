create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create table if not exists films (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_es text,
  omdb_id text unique,
  poster_url text,
  backdrop_url text,
  synopsis text,
  synopsis_es text,
  genre text[],
  runtime_min integer,
  rating numeric(3,1),
  release_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cinemas (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (chain in ('cinesa', 'yelmo', 'kinepolis')),
  name text not null,
  slug text unique not null,
  address text,
  zone text check (zone in ('centro', 'norte', 'sur', 'este', 'oeste')),
  lat numeric(9,6),
  lng numeric(9,6),
  booking_base_url text,
  created_at timestamptz default now()
);

create table if not exists showtimes (
  id uuid primary key default gen_random_uuid(),
  film_id uuid references films(id) on delete cascade,
  cinema_id uuid references cinemas(id) on delete cascade,
  show_date date not null,
  show_time time not null,
  format text not null,
  language text,
  is_vose boolean generated always as (format in ('VOSE', 'VO', 'VOSI')) stored,
  price_eur numeric(5,2),
  booking_url text,
  source_hash text,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (cinema_id, film_id, show_date, show_time, format)
);

create table if not exists click_events (
  id uuid primary key default gen_random_uuid(),
  showtime_id uuid references showtimes(id),
  cinema_chain text,
  film_slug text,
  session_format text,
  user_ip text,
  user_agent text,
  referrer text,
  clicked_at timestamptz default now()
);

create table if not exists scrape_logs (
  id uuid primary key default gen_random_uuid(),
  chain text not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  sessions_found integer default 0,
  sessions_new integer default 0,
  sessions_updated integer default 0,
  error_message text,
  duration_ms integer,
  ran_at timestamptz default now()
);

create index if not exists idx_showtimes_date on showtimes(show_date);
create index if not exists idx_showtimes_is_vose on showtimes(is_vose) where is_vose = true;
create index if not exists idx_showtimes_film on showtimes(film_id);
create index if not exists idx_showtimes_cinema on showtimes(cinema_id);
create index if not exists idx_showtimes_last_seen on showtimes(last_seen_at);
create index if not exists idx_showtimes_chain_date on showtimes(show_date, cinema_id, film_id);
create index if not exists idx_films_slug on films(slug);
create index if not exists idx_films_title_trgm on films using gin (title gin_trgm_ops);
create index if not exists idx_films_title_es_trgm on films using gin (coalesce(title_es, '') gin_trgm_ops);
create index if not exists idx_cinemas_name_trgm on cinemas using gin (name gin_trgm_ops);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists films_updated_at on films;
create trigger films_updated_at
before update on films
for each row execute function update_updated_at();

alter table films enable row level security;
alter table cinemas enable row level security;
alter table showtimes enable row level security;
alter table click_events enable row level security;
alter table scrape_logs enable row level security;

drop policy if exists "public read films" on films;
create policy "public read films" on films for select using (true);

drop policy if exists "public read cinemas" on cinemas;
create policy "public read cinemas" on cinemas for select using (true);

drop policy if exists "public read showtimes" on showtimes;
create policy "public read showtimes" on showtimes for select using (true);

drop policy if exists "service write films" on films;
create policy "service write films" on films for all using (auth.role() = 'service_role');

drop policy if exists "service write cinemas" on cinemas;
create policy "service write cinemas" on cinemas for all using (auth.role() = 'service_role');

drop policy if exists "service write showtimes" on showtimes;
create policy "service write showtimes" on showtimes for all using (auth.role() = 'service_role');

drop policy if exists "service write clicks" on click_events;
create policy "service write clicks" on click_events for all using (auth.role() = 'service_role');

drop policy if exists "service write logs" on scrape_logs;
create policy "service write logs" on scrape_logs for all using (auth.role() = 'service_role');
