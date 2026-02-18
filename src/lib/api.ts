// Proxy through edge function to bypass CORS
const PROXY_BASE = `https://epgzewpcdqmqpnyvpfzu.supabase.co/functions/v1/anime-proxy`;

export interface AnimeImage {
  cover?: string;
  banner?: string;
  color?: string;
  medium?: string;
}

export interface AnimeTitle {
  english?: string;
  romaji?: string;
  native?: string;
  userPreferred?: string;
}

export interface AnimeMeta {
  title?: AnimeTitle;
  image?: AnimeImage;
  genres?: string[];
  averageScore?: number;
  status?: string;
  type?: string;
  totalEpisodes?: number;
  description?: string;
  season?: string;
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number };
  episodeDuration?: number;
  isAdult?: boolean;
  synonyms?: string[];
  popularity?: number;
  trailer?: { url?: string };
  studios?: string[];
  characters?: { name: string; image: string; role: string }[];
  relations?: any[];
  anilistId?: number;
  malId?: number;
  nextAiringEpisode?: any;
}

// The API returns flat items (no meta nesting)
export interface AnimeItem {
  anime_name: string;
  anilistId?: number;
  malId?: number;
  title?: AnimeTitle;
  image?: AnimeImage;
  genres?: string[];
  averageScore?: number;
  status?: string;
  type?: string;
  episode_count?: number;
  last_updated?: string;
  // Also support nested meta format for compatibility
  meta?: AnimeMeta;
}

export interface EpisodeQuality {
  quality: string;
  stream_url: string;
  download_url?: string;
}

export interface EpisodeInfo {
  anime_name: string;
  episode_no: number;
  stream_url: string;
  download_url?: string;
  servers?: { name: string; priority: number; stream_url: string }[];
  qualities?: EpisodeQuality[];
}

export interface AnimeDetail {
  anime_name: string;
  title?: AnimeTitle;
  image?: AnimeImage;
  genres?: string[];
  averageScore?: number;
  status?: string;
  type?: string;
  description?: string;
  studios?: string[];
  characters?: { name: string; image: string; role: string }[];
  trailer?: { url?: string };
  startDate?: { year?: number };
  episodeDuration?: number;
  totalEpisodes?: number;
  meta?: AnimeMeta;
  episodes?: {
    total_seasons: number;
    total_episodes: number;
    seasons: {
      season: string;
      episodes: { episode_no: number; qualities?: EpisodeQuality[] }[];
    }[];
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error("API returned unsuccessful");
  return data;
}

export async function fetchAnimeList(meta = true): Promise<AnimeItem[]> {
  const data = await apiFetch<{ anime: AnimeItem[] }>(`/api/anime/list${meta ? "" : "?meta=false"}`);
  return data.anime || [];
}

export async function fetchAnimeInfo(name: string, season?: number): Promise<AnimeDetail> {
  const encoded = encodeURIComponent(name);
  const seasonParam = season ? `&season=${season}` : "";
  return apiFetch<AnimeDetail>(`/api/anime/info?name=${encoded}${seasonParam}`);
}

export async function fetchEpisode(name: string, episode: number | string, quality?: string): Promise<EpisodeInfo> {
  const encoded = encodeURIComponent(name);
  const qParam = quality ? `&quality=${quality}` : "";
  // Try raw episode (handles "01" zero-padded), fallback to integer
  const epStr = typeof episode === "string" ? episode : String(episode).padStart(2, "0");
  return apiFetch<EpisodeInfo>(`/api/anime/episode?name=${encoded}&episode=${epStr}${qParam}`);
}

export async function fetchQualities(name: string, episode: number): Promise<EpisodeQuality[]> {
  const encoded = encodeURIComponent(name);
  const data = await apiFetch<{ qualities: EpisodeQuality[] }>(`/api/anime/qualities?name=${encoded}&episode=${episode}`);
  return data.qualities || [];
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const data = await apiFetch<{ results: AnimeItem[] }>(`/api/anime/search?q=${encodeURIComponent(query)}`);
  return data.results || [];
}

export function getDownloadUrl(gofileUrl: string): string {
  return `https://beat-anime-hind-hub-api.onrender.com/api/anime/download?url=${encodeURIComponent(gofileUrl)}`;
}

// Unified getters that work with both flat and nested meta format
export function getAnimeName(item: AnimeItem | AnimeDetail): string {
  const t = (item as AnimeItem).title || (item as AnimeItem).meta?.title;
  return t?.english || t?.romaji || t?.userPreferred || item.anime_name;
}

export function getAnimeCover(item: AnimeItem | AnimeDetail): string | undefined {
  const img = (item as AnimeItem).image || (item as AnimeItem).meta?.image;
  return img?.cover;
}

export function getAnimeBanner(item: AnimeItem | AnimeDetail): string | undefined {
  const img = (item as AnimeItem).image || (item as AnimeItem).meta?.image;
  return img?.banner;
}

export function getAnimeGenres(item: AnimeItem | AnimeDetail): string[] {
  return (item as AnimeItem).genres || (item as AnimeItem).meta?.genres || [];
}

export function getAnimeScore(item: AnimeItem | AnimeDetail): number | undefined {
  return (item as AnimeItem).averageScore || (item as AnimeItem).meta?.averageScore;
}

export function getAnimeStatus(item: AnimeItem | AnimeDetail): string | undefined {
  return (item as AnimeItem).status || (item as AnimeItem).meta?.status;
}
