export type Chain = "cinesa" | "yelmo" | "kinepolis";

export type Zone = "centro" | "norte" | "sur" | "este" | "oeste";

export type ShowFormat =
  | "VOSE"
  | "VO"
  | "VOSI"
  | "Doblada"
  | "IMAX"
  | "4DX"
  | "3D"
  | "ScreenX"
  | "Dolby"
  | "MacroXE";

export type ScrapeStatus = "success" | "partial" | "failed";

export interface Film {
  id: string;
  slug: string;
  title: string;
  title_es: string | null;
  omdb_id: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  synopsis: string | null;
  synopsis_es: string | null;
  genre: string[] | null;
  runtime_min: number | null;
  rating: number | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cinema {
  id: string;
  chain: Chain;
  name: string;
  slug: string;
  address: string | null;
  zone: Zone | null;
  lat: number | null;
  lng: number | null;
  booking_base_url: string | null;
  created_at: string;
}

export interface Showtime {
  id: string;
  film_id: string;
  cinema_id: string;
  show_date: string;
  show_time: string;
  format: ShowFormat;
  language: string | null;
  is_vose: boolean;
  price_eur: number | null;
  booking_url: string | null;
  source_hash: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface ClickEvent {
  id: string;
  showtime_id: string | null;
  cinema_chain: Chain | null;
  film_slug: string | null;
  session_format: ShowFormat | null;
  user_ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  clicked_at: string;
}

export interface ScrapeLog {
  id: string;
  chain: Chain;
  status: ScrapeStatus;
  sessions_found: number;
  sessions_new: number;
  sessions_updated: number;
  error_message: string | null;
  duration_ms: number | null;
  ran_at: string;
}

export interface Database {
  public: {
    Tables: {
      films: {
        Row: Film;
        Insert: Omit<Film, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Film, "id">>;
        Relationships: [];
      };
      cinemas: {
        Row: Cinema;
        Insert: Omit<Cinema, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Cinema, "id">>;
        Relationships: [];
      };
      showtimes: {
        Row: Showtime;
        Insert: Omit<Showtime, "id" | "is_vose" | "last_seen_at" | "created_at"> & {
          id?: string;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Showtime, "id" | "is_vose">>;
        Relationships: [
          {
            foreignKeyName: "showtimes_film_id_fkey";
            columns: ["film_id"];
            isOneToOne: false;
            referencedRelation: "films";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "showtimes_cinema_id_fkey";
            columns: ["cinema_id"];
            isOneToOne: false;
            referencedRelation: "cinemas";
            referencedColumns: ["id"];
          }
        ];
      };
      click_events: {
        Row: ClickEvent;
        Insert: Omit<ClickEvent, "id" | "clicked_at"> & {
          id?: string;
          clicked_at?: string;
        };
        Update: Partial<Omit<ClickEvent, "id">>;
        Relationships: [
          {
            foreignKeyName: "click_events_showtime_id_fkey";
            columns: ["showtime_id"];
            isOneToOne: false;
            referencedRelation: "showtimes";
            referencedColumns: ["id"];
          }
        ];
      };
      scrape_logs: {
        Row: ScrapeLog;
        Insert: Omit<ScrapeLog, "id" | "ran_at"> & {
          id?: string;
          ran_at?: string;
        };
        Update: Partial<Omit<ScrapeLog, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface ShowtimeWithCinema extends Showtime {
  cinema: Cinema;
}

export interface FilmWithShowtimes extends Film {
  showtimes: ShowtimeWithCinema[];
}

export interface FilmCardData extends Film {
  showtimes: ShowtimeWithCinema[];
  formats: ShowFormat[];
  chains: Chain[];
  minPrice: number | null;
  totalSessions: number;
}

export interface FilmDetailCinemaGroup {
  cinema: Cinema;
  showtimes: Showtime[];
}

export interface FilmDetailChainGroup {
  chain: Chain;
  cinemas: FilmDetailCinemaGroup[];
}

export interface FilmDetailDateGroup {
  date: string;
  chains: FilmDetailChainGroup[];
}

export interface FilmDetailData extends Film {
  upcoming_sessions: FilmDetailDateGroup[];
  total_sessions: number;
}

export interface FilmsApiParams {
  date?: string;
  vose?: string;
  format?: ShowFormat;
  chain?: Chain;
  zone?: Zone;
  q?: string;
  price_max?: string;
  language?: string;
}

export interface FilmsApiResponse {
  films: FilmCardData[];
  stats: {
    film_count: number;
    session_count: number;
    vose_count: number;
  };
  date: string;
}

export interface FilmApiResponse {
  film: FilmDetailData;
}

export interface TrackPayload {
  showtime_id: string;
  cinema_chain: Chain;
  film_slug: string;
  session_format: ShowFormat;
}

export interface TrackResponse {
  ok: true;
}

export interface ApiError {
  error: string;
}

export interface RawShowtime {
  film_title: string;
  film_title_es?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  cinema_name: string;
  cinema_slug: string;
  chain: Chain;
  show_date: string;
  show_time: string;
  raw_format: string;
  raw_language?: string | null;
  price_eur: number | null;
  booking_url: string | null;
}

export interface NormalisedShowtime {
  film_title: string;
  film_title_es: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  cinema_slug: string;
  chain: Chain;
  show_date: string;
  show_time: string;
  format: ShowFormat;
  language: string | null;
  is_vose: boolean;
  price_eur: number | null;
  booking_url: string | null;
  source_hash: string;
}

export interface EnrichedFilmData {
  title: string;
  title_es: string | null;
  omdb_id: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  synopsis: string | null;
  synopsis_es: string | null;
  genre: string[] | null;
  runtime_min: number | null;
  rating: number | null;
  release_date: string | null;
}

export interface ScrapedFilmCandidate {
  title: string;
  title_es: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
}

export interface ScrapeResult {
  chain: Chain;
  status: ScrapeStatus;
  sessions_found: number;
  sessions_new: number;
  sessions_updated: number;
  error_message?: string;
  duration_ms: number;
}

export interface ScrapeResponse {
  results: ScrapeResult[];
  total_duration_ms: number;
  ran_at: string;
}

export interface ChainScrapePayload {
  chain: Chain;
  rawShowtimes: RawShowtime[];
}

export interface OmdbSearchItem {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export interface OmdbSearchResponse {
  Search?: OmdbSearchItem[];
  totalResults?: string;
  Response: "True" | "False";
  Error?: string;
}

export interface OmdbMovieResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Plot: string;
  Poster: string;
  imdbRating: string;
  imdbID: string;
  Response: "True" | "False";
  Error?: string;
}
