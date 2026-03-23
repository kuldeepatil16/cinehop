-- CineHop seed data (Madrid)
-- Safe to run multiple times.

-- Cinemas
INSERT INTO cinemas (id, chain, name, slug, address, zone, lat, lng, booking_base_url)
VALUES
  -- Cinesa (Madrid)
  ('11111111-1111-1111-1111-111111111101','cinesa','Cinesa La Gavia','cinesa-la-gavia','CC La Gavia, Vallecas, Madrid','este',40.371900,-3.602600,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111102','cinesa','Cinesa Manoteras','cinesa-manoteras','Manoteras, Madrid','norte',40.489600,-3.662900,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111103','cinesa','Cinesa Méndez Álvaro','cinesa-mendez-alvaro','Estación Sur / Méndez Álvaro, Madrid','sur',40.395900,-3.676500,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111104','cinesa','Cinesa Nassica','cinesa-nassica','Nassica, Getafe (Madrid)','sur',40.284700,-3.735400,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111105','cinesa','Cinesa Parquesur','cinesa-parquesur','Parquesur, Leganés (Madrid)','sur',40.343900,-3.738600,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111106','cinesa','Cinesa Príncipe Pío','cinesa-principe-pio','Príncipe Pío, Madrid','centro',40.421300,-3.720600,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111107','cinesa','Cinesa Proyecciones','cinesa-proyecciones','Calle de Fuencarral, Madrid','centro',40.428600,-3.702100,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111108','cinesa','Cinesa Las Rosas','cinesa-las-rosas','Las Rosas, Madrid','este',40.431300,-3.608500,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111109','cinesa','Cinesa La Moraleja','cinesa-la-moraleja','La Moraleja, Alcobendas (Madrid)','norte',40.525900,-3.640300,'https://www.cinesa.es/'),

  -- Yelmo (Madrid)
  ('22222222-2222-2222-2222-222222222201','yelmo','Yelmo Ideal','yelmo-ideal','Calle del Doctor Cortezo, Madrid','centro',40.413800,-3.703000,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222202','yelmo','Yelmo Islazul','yelmo-islazul','CC Islazul, Madrid','sur',40.361900,-3.750600,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222203','yelmo','Yelmo La Vaguada','yelmo-la-vaguada','CC La Vaguada, Madrid','norte',40.479900,-3.708700,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222204','yelmo','Yelmo Plenilunio','yelmo-plenilunio','CC Plenilunio, Madrid','este',40.446200,-3.592300,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222205','yelmo','Yelmo Planetocio','yelmo-planetocio','Planetocio, Collado Villalba (Madrid)','oeste',40.634200,-4.006600,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222206','yelmo','Yelmo Rivas H2O','yelmo-rivas-h2o','H2Ocio, Rivas-Vaciamadrid (Madrid)','este',40.347300,-3.525400,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222207','yelmo','Yelmo Tres Aguas','yelmo-tres-aguas','TresAguas, Alcorcón (Madrid)','oeste',40.350200,-3.829100,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222208','yelmo','Yelmo Plaza Norte','yelmo-plaza-norte','Plaza Norte 2, San Sebastián de los Reyes (Madrid)','norte',40.547900,-3.625400,'https://yelmocines.es/'),

  -- Kinepolis (Madrid)
  ('33333333-3333-3333-3333-333333333301','kinepolis','Kinepolis Madrid','kinepolis-madrid','Ciudad de la Imagen, Pozuelo de Alarcón (Madrid)','oeste',40.405400,-3.801700,'https://kinepolis.es/')
ON CONFLICT (slug) DO UPDATE SET
  chain = EXCLUDED.chain,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  zone = EXCLUDED.zone,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  booking_base_url = EXCLUDED.booking_base_url;

-- Bring the seed in line with the multi-city schema so all supported city pages
-- have demo cinemas and scraper upserts can resolve their cinema_slug values.
UPDATE cinemas
SET city = 'madrid'
WHERE slug IN (
  'cinesa-la-gavia',
  'cinesa-manoteras',
  'cinesa-mendez-alvaro',
  'cinesa-nassica',
  'cinesa-parquesur',
  'cinesa-principe-pio',
  'cinesa-proyecciones',
  'cinesa-las-rosas',
  'cinesa-la-moraleja',
  'yelmo-ideal',
  'yelmo-islazul',
  'yelmo-la-vaguada',
  'yelmo-plenilunio',
  'yelmo-planetocio',
  'yelmo-rivas-h2o',
  'yelmo-tres-aguas',
  'yelmo-plaza-norte',
  'kinepolis-madrid'
);

INSERT INTO cinemas (id, chain, city, name, slug, address, zone, lat, lng, booking_base_url)
VALUES
  ('11111111-1111-1111-1111-111111111201','cinesa','barcelona','Cinesa Diagonal','cinesa-diagonal','Carrer de Santa Fe de Nou Mexic, Barcelona',NULL,41.396388,2.136407,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111202','cinesa','barcelona','Cinesa Diagonal Mar','cinesa-diagonal-mar','Avinguda Diagonal, 3, Barcelona',NULL,41.412974,2.216343,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111203','cinesa','barcelona','Cinesa Barnasud','cinesa-barnasud','Carrer del Progres, 69, Gava',NULL,41.296018,2.007690,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111204','cinesa','valencia','Cinesa Bonaire','cinesa-bonaire','Autovia del Este, Km 345, Aldaia',NULL,39.471327,-0.489360,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111205','cinesa','sevilla','Cinesa Camas','cinesa-camas','Camas Aljarafe, Sevilla',NULL,37.392288,-6.029628,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111206','cinesa','bilbao','Cinesa Zubiarte','cinesa-zubiarte','Centro comercial Zubiarte, Bilbao',NULL,43.269500,-2.945100,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111207','cinesa','bilbao','Cinesa Max Ocio','cinesa-max-ocio','Centro comercial Max Ocio, Barakaldo',NULL,43.286500,-2.997500,'https://www.cinesa.es/'),
  ('22222222-2222-2222-2222-222222222209','yelmo','madrid','Yelmo Palafox Luxury','yelmo-palafox-luxury','Calle de Luchana, Madrid','centro',40.430800,-3.700700,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222210','yelmo','madrid','Yelmo Premium Parque Corredor','yelmo-parque-corredor','Parque Corredor, Torrejon de Ardoz','este',40.459400,-3.469700,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222301','yelmo','barcelona','Yelmo Premium Castelldefels','yelmo-castelldefels',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222302','yelmo','barcelona','Yelmo Abrera','yelmo-abrera',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222303','yelmo','barcelona','Yelmo Baricentro','yelmo-baricentro',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222304','yelmo','barcelona','Yelmo Westfield La Maquinista','yelmo-la-maquinista',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222305','yelmo','barcelona','Yelmo Premium Sant Cugat','yelmo-sant-cugat',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222306','yelmo','valencia','Yelmo Mercado de Campanar','yelmo-campanar',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222307','yelmo','valencia','Yelmo Vidanova Parc','yelmo-vidanova-parc',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222308','yelmo','sevilla','Yelmo Premium Lagoh','yelmo-lagoh',NULL,NULL,NULL,NULL,'https://yelmocines.es/'),
  ('33333333-3333-3333-3333-333333333302','kinepolis','barcelona','Kinepolis Barcelona Splau','kinepolis-barcelona-splau',NULL,NULL,NULL,NULL,'https://kinepolis.es/'),
  ('33333333-3333-3333-3333-333333333303','kinepolis','valencia','Kinepolis Valencia','kinepolis-valencia',NULL,NULL,NULL,NULL,'https://kinepolis.es/')
ON CONFLICT (slug) DO UPDATE SET
  chain = EXCLUDED.chain,
  city = EXCLUDED.city,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  zone = EXCLUDED.zone,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  booking_base_url = EXCLUDED.booking_base_url;

-- Clean up stale showtimes (>7 days old) before re-seeding
DELETE FROM showtimes WHERE show_date < current_date - INTERVAL '7 days';
-- Remove old demo films that no longer belong in the catalog
DELETE FROM films WHERE slug IN ('dune-parte-dos','oppenheimer','poor-things','barbie','godzilla-x-kong');

-- Films (current 2026 releases showing in Madrid, March 2026)
INSERT INTO films (id, slug, title, title_es, omdb_id, poster_url, backdrop_url, synopsis, synopsis_es, genre, runtime_min, rating, release_date)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','captain-america-brave-new-world','Captain America: Brave New World','Capitán América: Un Mundo Feliz','tt13623954',NULL,NULL,'Sam Wilson, the new Captain America, finds himself in the middle of an international incident and must discover the motive behind a nefarious global plan.',NULL,ARRAY['Action','Adventure','Sci-Fi'],118,6.2,'2026-02-14'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','mickey-17','Mickey 17','Mickey 17','tt13364790',NULL,NULL,'An expendable employee on a human expedition to colonize an ice world is sent on a mission from which he is not expected to return — but survives and returns to find his replacement already in service.',NULL,ARRAY['Comedy','Sci-Fi'],137,7.1,'2026-02-27'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','bridget-jones-mad-about-the-boy','Bridget Jones: Mad About the Boy','Bridget Jones: Loca por el Chico','tt6193408',NULL,NULL,'A widowed Bridget Jones navigates the dating scene in her fifties, balancing single parenthood, work, and an unexpected romance.',NULL,ARRAY['Comedy','Drama','Romance'],123,6.8,'2026-02-13'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','novocaine','Novocaine','Novocaine','tt14823696',NULL,NULL,'A man with a rare condition that prevents him from feeling pain uses his unique ability to rescue his kidnapped girlfriend.',NULL,ARRAY['Action','Comedy','Thriller'],110,7.0,'2026-03-14'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5','the-alto-knights','The Alto Knights','Los Caballeros del Alto','tt14258812',NULL,NULL,'The true story of two of the most powerful Mafia bosses in American history, Frank Costello and Vito Genovese, as their decades-long friendship turns into a bloody rivalry.',NULL,ARRAY['Crime','Drama'],115,6.5,'2026-03-20')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  title_es = EXCLUDED.title_es,
  omdb_id = EXCLUDED.omdb_id,
  poster_url = EXCLUDED.poster_url,
  backdrop_url = EXCLUDED.backdrop_url,
  synopsis = EXCLUDED.synopsis,
  synopsis_es = EXCLUDED.synopsis_es,
  genre = EXCLUDED.genre,
  runtime_min = EXCLUDED.runtime_min,
  rating = EXCLUDED.rating,
  release_date = EXCLUDED.release_date,
  updated_at = now();

-- Showtimes (today + tomorrow, enough volume for UI/demo)
-- Note: booking_url is a best-effort seed; real deep links come from scrapers.
WITH dates AS (
  SELECT current_date AS d UNION ALL SELECT (current_date + INTERVAL '1 day')::date AS d
)
INSERT INTO showtimes (film_id, cinema_id, show_date, show_time, format, language, price_eur, booking_url, source_hash, last_seen_at)
SELECT
  f.id,
  c.id,
  dt.d,
  t.show_time::time,
  t.format,
  t.language,
  t.price_eur,
  c.booking_base_url,
  md5(c.id::text || f.slug || dt.d::text || t.show_time || t.format),
  now()
FROM dates dt
CROSS JOIN LATERAL (
  VALUES
    ('16:10','VOSE','en',9.20),
    ('18:30','Doblada','es',8.50),
    ('20:45','IMAX','es',12.90),
    ('22:15','VO','en',9.90),
    ('23:00','VOSI','hi',10.20)
) AS t(show_time, format, language, price_eur)
JOIN films f ON f.slug IN ('captain-america-brave-new-world','mickey-17','bridget-jones-mad-about-the-boy','novocaine','the-alto-knights')
JOIN cinemas c ON c.slug IN (
  'cinesa-principe-pio',
  'cinesa-proyecciones',
  'yelmo-ideal',
  'yelmo-plenilunio',
  'kinepolis-madrid',
  'cinesa-diagonal',
  'yelmo-baricentro',
  'kinepolis-barcelona-splau',
  'cinesa-bonaire',
  'yelmo-campanar',
  'kinepolis-valencia',
  'cinesa-camas',
  'yelmo-lagoh',
  'cinesa-zubiarte'
)
WHERE
  -- Reduce the Cartesian product to a demo-sized set while preserving at least
  -- some seeded data in every supported city.
  get_byte(decode(substring(md5(f.slug || c.slug || dt.d::text), 1, 2), 'hex'), 0) % 3 = 0
ON CONFLICT (cinema_id, film_id, show_date, show_time, format) DO UPDATE SET
  price_eur = EXCLUDED.price_eur,
  booking_url = EXCLUDED.booking_url,
  source_hash = EXCLUDED.source_hash,
  last_seen_at = now();
