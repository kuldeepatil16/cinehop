-- Migration 002: staleness cleanup function and scrape_logs read policy
-- Safe to run multiple times (uses CREATE OR REPLACE / DO blocks).

-- Public read access for scrape_logs so the /api/cron/scrape health endpoint
-- can surface chain health without requiring the service role key.
drop policy if exists "public read scrape_logs" on scrape_logs;
create policy "public read scrape_logs" on scrape_logs for select using (true);

-- cleanup_stale_showtimes()
-- Removes showtimes in two passes:
--   1. Hard-delete any session older than 7 days (well past any useful window).
--   2. Hard-delete future/today sessions that have not been refreshed in 9 hours
--      (3 scrape cycles at the 3h cadence), meaning the cinema has likely removed them.
-- Call this at the end of every scrape run OR from a Supabase pg_cron job.
create or replace function cleanup_stale_showtimes()
returns void
language plpgsql
security definer
as $$
begin
  -- Pass 1: hard-delete sessions more than 7 days in the past
  delete from showtimes
  where show_date < current_date - interval '7 days';

  -- Pass 2: hard-delete sessions that haven't been seen for 9 hours
  -- (applies to today and future dates so cancelled sessions disappear promptly)
  delete from showtimes
  where last_seen_at < now() - interval '9 hours'
    and show_date >= current_date;
end;
$$;

-- Allow the service role to call the function
revoke all on function cleanup_stale_showtimes() from public;
grant execute on function cleanup_stale_showtimes() to service_role;

-- Index to make the staleness threshold query in buildShowtimesQuery fast
create index if not exists idx_showtimes_last_seen_date
  on showtimes(show_date, last_seen_at);
