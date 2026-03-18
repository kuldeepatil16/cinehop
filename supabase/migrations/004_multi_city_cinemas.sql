-- Migration 004: Ensure all multi-city cinemas exist and city column is populated.
-- Safe to re-run (uses ON CONFLICT DO UPDATE / IF NOT EXISTS).

-- Ensure city column exists with the correct check constraint
alter table cinemas
  add column if not exists city text check (city in ('madrid', 'barcelona', 'valencia', 'sevilla', 'bilbao'));

-- Stamp existing Madrid cinemas that might have city = NULL
update cinemas
set city = 'madrid'
where city is null
  and slug in (
    'cinesa-la-gavia', 'cinesa-manoteras', 'cinesa-mendez-alvaro', 'cinesa-nassica',
    'cinesa-parquesur', 'cinesa-principe-pio', 'cinesa-proyecciones',
    'cinesa-las-rosas', 'cinesa-la-moraleja',
    'yelmo-ideal', 'yelmo-islazul', 'yelmo-la-vaguada', 'yelmo-plenilunio',
    'yelmo-planetocio', 'yelmo-rivas-h2o', 'yelmo-tres-aguas', 'yelmo-plaza-norte',
    'kinepolis-madrid'
  );

-- Barcelona — Cinesa
insert into cinemas (chain, city, name, slug, address, lat, lng, booking_base_url)
values
  ('cinesa','barcelona','Cinesa Diagonal','cinesa-diagonal','Carrer de Santa Fe de Nou Mexic, Barcelona',41.396388,2.136407,'https://www.cinesa.es/'),
  ('cinesa','barcelona','Cinesa Diagonal Mar','cinesa-diagonal-mar','Avinguda Diagonal, 3, Barcelona',41.412974,2.216343,'https://www.cinesa.es/'),
  ('cinesa','barcelona','Cinesa Barnasud','cinesa-barnasud','Carrer del Progres, 69, Gava',41.296018,2.007690,'https://www.cinesa.es/')
on conflict (slug) do update set
  city = excluded.city, name = excluded.name,
  address = excluded.address, lat = excluded.lat, lng = excluded.lng;

-- Valencia — Cinesa
insert into cinemas (chain, city, name, slug, address, lat, lng, booking_base_url)
values
  ('cinesa','valencia','Cinesa Bonaire','cinesa-bonaire','Autovia del Este, Km 345, Aldaia',39.471327,-0.489360,'https://www.cinesa.es/')
on conflict (slug) do update set
  city = excluded.city, name = excluded.name,
  address = excluded.address, lat = excluded.lat, lng = excluded.lng;

-- Sevilla — Cinesa
insert into cinemas (chain, city, name, slug, address, lat, lng, booking_base_url)
values
  ('cinesa','sevilla','Cinesa Camas','cinesa-camas','Camas Aljarafe, Sevilla',37.392288,-6.029628,'https://www.cinesa.es/')
on conflict (slug) do update set
  city = excluded.city, name = excluded.name,
  address = excluded.address, lat = excluded.lat, lng = excluded.lng;

-- Bilbao — Cinesa
insert into cinemas (chain, city, name, slug, address, lat, lng, booking_base_url)
values
  ('cinesa','bilbao','Cinesa Zubiarte','cinesa-zubiarte','Centro comercial Zubiarte, Bilbao',43.269500,-2.945100,'https://www.cinesa.es/'),
  ('cinesa','bilbao','Cinesa Max Ocio','cinesa-max-ocio','Centro comercial Max Ocio, Barakaldo',43.286500,-2.997500,'https://www.cinesa.es/')
on conflict (slug) do update set
  city = excluded.city, name = excluded.name,
  address = excluded.address, lat = excluded.lat, lng = excluded.lng;

-- Barcelona — Yelmo
insert into cinemas (chain, city, name, slug, booking_base_url)
values
  ('yelmo','barcelona','Yelmo Premium Castelldefels','yelmo-castelldefels','https://yelmocines.es/'),
  ('yelmo','barcelona','Yelmo Abrera','yelmo-abrera','https://yelmocines.es/'),
  ('yelmo','barcelona','Yelmo Baricentro','yelmo-baricentro','https://yelmocines.es/'),
  ('yelmo','barcelona','Yelmo Westfield La Maquinista','yelmo-la-maquinista','https://yelmocines.es/'),
  ('yelmo','barcelona','Yelmo Premium Sant Cugat','yelmo-sant-cugat','https://yelmocines.es/')
on conflict (slug) do update set city = excluded.city, name = excluded.name;

-- Valencia — Yelmo
insert into cinemas (chain, city, name, slug, booking_base_url)
values
  ('yelmo','valencia','Yelmo Mercado de Campanar','yelmo-campanar','https://yelmocines.es/'),
  ('yelmo','valencia','Yelmo Vidanova Parc','yelmo-vidanova-parc','https://yelmocines.es/')
on conflict (slug) do update set city = excluded.city, name = excluded.name;

-- Sevilla — Yelmo
insert into cinemas (chain, city, name, slug, booking_base_url)
values
  ('yelmo','sevilla','Yelmo Premium Lagoh','yelmo-lagoh','https://yelmocines.es/')
on conflict (slug) do update set city = excluded.city, name = excluded.name;

-- Bilbao — Yelmo
insert into cinemas (chain, city, name, slug, booking_base_url)
values
  ('yelmo','bilbao','Yelmo Megapark','yelmo-megapark','https://yelmocines.es/'),
  ('yelmo','bilbao','Yelmo Artea','yelmo-artea','https://yelmocines.es/')
on conflict (slug) do update set city = excluded.city, name = excluded.name;

-- Barcelona — Kinepolis
insert into cinemas (chain, city, name, slug, booking_base_url)
values
  ('kinepolis','barcelona','Kinepolis Barcelona Splau','kinepolis-barcelona-splau','https://kinepolis.es/')
on conflict (slug) do update set city = excluded.city, name = excluded.name;

-- Valencia — Kinepolis
insert into cinemas (chain, city, name, slug, booking_base_url)
values
  ('kinepolis','valencia','Kinepolis Valencia','kinepolis-valencia','https://kinepolis.es/')
on conflict (slug) do update set city = excluded.city, name = excluded.name;
