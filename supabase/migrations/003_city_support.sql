alter table cinemas
  add column if not exists city text check (city in ('madrid', 'barcelona', 'valencia', 'sevilla', 'bilbao'));

update cinemas
set city = 'madrid'
where slug in (
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

insert into cinemas (id, chain, city, name, slug, address, zone, lat, lng, booking_base_url)
values
  ('11111111-1111-1111-1111-111111111201','cinesa','barcelona','Cinesa Diagonal','cinesa-diagonal','Carrer de Santa Fe de Nou Mexic, Barcelona',null,41.396388,2.136407,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111202','cinesa','barcelona','Cinesa Diagonal Mar','cinesa-diagonal-mar','Avinguda Diagonal, 3, Barcelona',null,41.412974,2.216343,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111203','cinesa','barcelona','Cinesa Barnasud','cinesa-barnasud','Carrer del Progres, 69, Gava',null,41.296018,2.007690,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111204','cinesa','valencia','Cinesa Bonaire','cinesa-bonaire','Autovia del Este, Km 345, Aldaia',null,39.471327,-0.489360,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111205','cinesa','sevilla','Cinesa Camas','cinesa-camas','Camas Aljarafe, Sevilla',null,37.392288,-6.029628,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111206','cinesa','bilbao','Cinesa Zubiarte','cinesa-zubiarte','Centro comercial Zubiarte, Bilbao',null,43.269500,-2.945100,'https://www.cinesa.es/'),
  ('11111111-1111-1111-1111-111111111207','cinesa','bilbao','Cinesa Max Ocio','cinesa-max-ocio','Centro comercial Max Ocio, Barakaldo',null,43.286500,-2.997500,'https://www.cinesa.es/'),
  ('22222222-2222-2222-2222-222222222301','yelmo','barcelona','Yelmo Premium Castelldefels','yelmo-castelldefels',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222302','yelmo','barcelona','Yelmo Abrera','yelmo-abrera',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222303','yelmo','barcelona','Yelmo Baricentro','yelmo-baricentro',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222304','yelmo','barcelona','Yelmo Westfield La Maquinista','yelmo-la-maquinista',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222305','yelmo','barcelona','Yelmo Premium Sant Cugat','yelmo-sant-cugat',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222306','yelmo','valencia','Yelmo Mercado de Campanar','yelmo-campanar',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222307','yelmo','valencia','Yelmo Vidanova Parc','yelmo-vidanova-parc',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222308','yelmo','sevilla','Yelmo Premium Lagoh','yelmo-lagoh',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222309','yelmo','bilbao','Yelmo Megapark','yelmo-megapark',null,null,null,null,'https://yelmocines.es/'),
  ('22222222-2222-2222-2222-222222222310','yelmo','bilbao','Yelmo Artea','yelmo-artea',null,null,null,null,'https://yelmocines.es/'),
  ('33333333-3333-3333-3333-333333333302','kinepolis','barcelona','Kinepolis Barcelona Splau','kinepolis-barcelona-splau',null,null,null,null,'https://kinepolis.es/'),
  ('33333333-3333-3333-3333-333333333303','kinepolis','valencia','Kinepolis Valencia','kinepolis-valencia',null,null,null,null,'https://kinepolis.es/')
on conflict (slug) do update set
  chain = excluded.chain,
  city = excluded.city,
  name = excluded.name,
  address = excluded.address,
  zone = excluded.zone,
  lat = excluded.lat,
  lng = excluded.lng,
  booking_base_url = excluded.booking_base_url;
