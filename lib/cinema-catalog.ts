import type { Chain, City, Zone } from "@/lib/types";

interface KnownCinema {
  chain: Chain;
  city: City;
  name: string;
  slug: string;
  address: string | null;
  zone: Zone | null;
  lat: number | null;
  lng: number | null;
  booking_base_url: string;
}

export const KNOWN_CINEMAS: KnownCinema[] = [
  { chain: "cinesa", city: "madrid", name: "Cinesa La Gavia", slug: "cinesa-la-gavia", address: "CC La Gavia, Vallecas, Madrid", zone: "este", lat: 40.3719, lng: -3.6026, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Manoteras", slug: "cinesa-manoteras", address: "Manoteras, Madrid", zone: "norte", lat: 40.4896, lng: -3.6629, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Mendez Alvaro", slug: "cinesa-mendez-alvaro", address: "Estacion Sur / Mendez Alvaro, Madrid", zone: "sur", lat: 40.3959, lng: -3.6765, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Nassica", slug: "cinesa-nassica", address: "Nassica, Getafe (Madrid)", zone: "sur", lat: 40.2847, lng: -3.7354, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Parquesur", slug: "cinesa-parquesur", address: "Parquesur, Leganes (Madrid)", zone: "sur", lat: 40.3439, lng: -3.7386, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Principe Pio", slug: "cinesa-principe-pio", address: "Principe Pio, Madrid", zone: "centro", lat: 40.4213, lng: -3.7206, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Proyecciones", slug: "cinesa-proyecciones", address: "Calle de Fuencarral, Madrid", zone: "centro", lat: 40.4286, lng: -3.7021, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa Las Rosas", slug: "cinesa-las-rosas", address: "Las Rosas, Madrid", zone: "este", lat: 40.4313, lng: -3.6085, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "madrid", name: "Cinesa La Moraleja", slug: "cinesa-la-moraleja", address: "La Moraleja, Alcobendas (Madrid)", zone: "norte", lat: 40.5259, lng: -3.6403, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "barcelona", name: "Cinesa Diagonal", slug: "cinesa-diagonal", address: "Carrer de Santa Fe de Nou Mexic, Barcelona", zone: null, lat: 41.396388, lng: 2.136407, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "barcelona", name: "Cinesa Diagonal Mar", slug: "cinesa-diagonal-mar", address: "Avinguda Diagonal, 3, Barcelona", zone: null, lat: 41.412974, lng: 2.216343, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "barcelona", name: "Cinesa Barnasud", slug: "cinesa-barnasud", address: "Carrer del Progres, 69, Gava", zone: null, lat: 41.296018, lng: 2.00769, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "valencia", name: "Cinesa Bonaire", slug: "cinesa-bonaire", address: "Autovia del Este, Km 345, Aldaia", zone: null, lat: 39.471327, lng: -0.48936, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "sevilla", name: "Cinesa Camas", slug: "cinesa-camas", address: "Camas Aljarafe, Sevilla", zone: null, lat: 37.392288, lng: -6.029628, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "bilbao", name: "Cinesa Zubiarte", slug: "cinesa-zubiarte", address: "Centro comercial Zubiarte, Bilbao", zone: null, lat: 43.2695, lng: -2.9451, booking_base_url: "https://www.cinesa.es/" },
  { chain: "cinesa", city: "bilbao", name: "Cinesa Max Ocio", slug: "cinesa-max-ocio", address: "Centro comercial Max Ocio, Barakaldo", zone: null, lat: 43.2865, lng: -2.9975, booking_base_url: "https://www.cinesa.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Ideal", slug: "yelmo-ideal", address: "Calle del Doctor Cortezo, Madrid", zone: "centro", lat: 40.4138, lng: -3.703, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Islazul", slug: "yelmo-islazul", address: "CC Islazul, Madrid", zone: "sur", lat: 40.3619, lng: -3.7506, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo La Vaguada", slug: "yelmo-la-vaguada", address: "CC La Vaguada, Madrid", zone: "norte", lat: 40.4799, lng: -3.7087, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Plenilunio", slug: "yelmo-plenilunio", address: "CC Plenilunio, Madrid", zone: "este", lat: 40.4462, lng: -3.5923, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Planetocio", slug: "yelmo-planetocio", address: "Planetocio, Collado Villalba (Madrid)", zone: "oeste", lat: 40.6342, lng: -4.0066, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Rivas H2O", slug: "yelmo-rivas-h2o", address: "H2Ocio, Rivas-Vaciamadrid (Madrid)", zone: "este", lat: 40.3473, lng: -3.5254, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo TresAguas", slug: "yelmo-tres-aguas", address: "TresAguas, Alcorcon (Madrid)", zone: "oeste", lat: 40.3502, lng: -3.8291, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Plaza Norte 2", slug: "yelmo-plaza-norte", address: "Plaza Norte 2, San Sebastian de los Reyes (Madrid)", zone: "norte", lat: 40.5479, lng: -3.6254, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Palafox Luxury", slug: "yelmo-palafox-luxury", address: "Calle de Luchana, Madrid", zone: "centro", lat: 40.4308, lng: -3.7007, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "madrid", name: "Yelmo Premium Parque Corredor", slug: "yelmo-parque-corredor", address: "Parque Corredor, Torrejon de Ardoz", zone: "este", lat: 40.4594, lng: -3.4697, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "barcelona", name: "Yelmo Baricentro", slug: "yelmo-baricentro", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "barcelona", name: "Yelmo Abrera", slug: "yelmo-abrera", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "barcelona", name: "Yelmo Premium Sant Cugat", slug: "yelmo-sant-cugat", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "barcelona", name: "Yelmo Premium Castelldefels", slug: "yelmo-castelldefels", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "barcelona", name: "Yelmo Westfield La Maquinista", slug: "yelmo-la-maquinista", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "valencia", name: "Yelmo Mercado de Campanar", slug: "yelmo-campanar", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "valencia", name: "Yelmo VidaNova Parc", slug: "yelmo-vidanova-parc", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "yelmo", city: "sevilla", name: "Yelmo Premium Lagoh", slug: "yelmo-lagoh", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://yelmocines.es/" },
  { chain: "kinepolis", city: "madrid", name: "Kinepolis Madrid", slug: "kinepolis-madrid", address: "Ciudad de la Imagen, Pozuelo de Alarcon (Madrid)", zone: "oeste", lat: 40.4054, lng: -3.8017, booking_base_url: "https://kinepolis.es/" },
  { chain: "kinepolis", city: "barcelona", name: "Kinepolis Barcelona Splau", slug: "kinepolis-barcelona-splau", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://kinepolis.es/" },
  { chain: "kinepolis", city: "valencia", name: "Kinepolis Valencia", slug: "kinepolis-valencia", address: null, zone: null, lat: null, lng: null, booking_base_url: "https://kinepolis.es/" }
];
