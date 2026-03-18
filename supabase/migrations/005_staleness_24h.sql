-- Migration 005: extend staleness window from 9h to 24h
--
-- 9h was too aggressive: a single missed scrape run (due to flaky CI,
-- GitHub Actions queue delay, etc.) caused valid future sessions to be
-- deleted after just 3 missed cycles. 24h = 8 missed cycles, which gives
-- far more headroom while still clearing genuinely cancelled sessions
-- within one calendar day.

create or replace function cleanup_stale_showtimes()
returns void
language plpgsql
security definer
as $$
begin
  -- Pass 1: hard-delete sessions more than 7 days in the past
  delete from showtimes
  where show_date < current_date - interval '7 days';

  -- Pass 2: hard-delete sessions not refreshed in 24 hours
  -- (8 scrape cycles at the 3h cadence — gives ample slack for CI delays)
  delete from showtimes
  where last_seen_at < now() - interval '24 hours'
    and show_date >= current_date;
end;
$$;

-- Permissions unchanged — service_role only
revoke all on function cleanup_stale_showtimes() from public;
grant execute on function cleanup_stale_showtimes() to service_role;
