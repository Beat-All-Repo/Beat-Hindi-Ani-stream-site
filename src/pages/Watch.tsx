import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchAnimeInfo, AnimeDetail, getAnimeName, getAnimeCover, getAnimeBanner, getAnimeGenres, fetchAnimeList } from "@/lib/api";
import { saveWatchProgress, addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import Footer from "@/components/Footer";
import AnimeCard from "@/components/AnimeCard";
import { Download, ChevronRight, ExternalLink, Star, Tv, Clock, Bookmark, BookmarkCheck, Share2, ChevronDown, ChevronUp, Film, Play } from "lucide-react";
import { toast } from "sonner";
import { useSecurityHardening } from "@/hooks/useSecurityHardening";

interface QualityData {
  episode_no: number;
  season: string;
  quality: string;
  content_type: string;
  file_size: string;
  created_at: string;
  stream_url: string;
  download_url?: string;
  servers: { name: string; stream_url: string; stream_type: string }[];
  archive_url?: string;
  pixeldrain_url?: string;
  streamtape_url?: string | null;
  gofile_url?: string;
  links: {
    can_download: boolean;
    can_stream: boolean;
    download_url?: string;
    page_url?: string;
    priority: number;
    site: string;
    stream_type: string | null;
    stream_url: string | null;
  }[];
}

interface EpisodeData {
  episode_no: string;
  qualities: QualityData[];
}

interface SeasonData {
  season: string;
  episodes: EpisodeData[];
}

export default function WatchPage() {
  useSecurityHardening();
  const { name, episode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [animeData, setAnimeData] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSeason, setActiveSeason] = useState(0);
  const [activeQuality, setActiveQuality] = useState<string>("");
  const [activeServer, setActiveServer] = useState<string>("Archive.org");
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentDownloadUrl, setCurrentDownloadUrl] = useState<string | undefined>();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const decodedName = name ? decodeURIComponent(name) : "";
  const epRaw = episode || "1";
  const epNum = parseInt(epRaw);

  useEffect(() => {
    if (!decodedName) return;
    setLoading(true);
    setError("");
    fetchAnimeInfo(decodedName)
      .then(info => {
        setAnimeData(info);
        setInWatchlist(isInWatchlist(decodedName));
        const seasons = info.episodes?.seasons || [];
        for (let i = 0; i < seasons.length; i++) {
          const found = (seasons[i].episodes as any[]).find(
            (e: any) => String(parseInt(String(e.episode_no))) === String(epNum) || String(e.episode_no) === String(epRaw)
          );
          if (found) {
            setActiveSeason(i);
            const quals: QualityData[] = (found.qualities || []) as QualityData[];
            const best = quals.find(q => q.quality === "1080p") || quals[0];
            if (best) {
              setActiveQuality(best.quality);
              const archiveServer = best.servers?.find((s: any) => s.name === "Archive.org");
              setCurrentUrl(archiveServer?.stream_url || best.stream_url);
              setCurrentDownloadUrl(best.download_url);
              setActiveServer(archiveServer ? "Archive.org" : (best.servers?.[0]?.name || "Archive.org"));
            }
            break;
          }
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [decodedName, epNum]);

  const title = animeData ? getAnimeName(animeData) : decodedName;
  const cover = animeData ? getAnimeCover(animeData) : undefined;
  const banner = animeData ? getAnimeBanner(animeData) : undefined;
  const genres = animeData ? getAnimeGenres(animeData) : [];

  const seasons: SeasonData[] = (animeData?.episodes?.seasons || []) as unknown as SeasonData[];
  const currentSeasonEps: EpisodeData[] = seasons[activeSeason]?.episodes || [];
  const currentEpData: EpisodeData | undefined = currentSeasonEps.find(
    e => String(parseInt(e.episode_no)) === String(epNum) || e.episode_no === epRaw
  );
  const qualities: QualityData[] = (currentEpData?.qualities || []) as unknown as QualityData[];
  const activeQualityData = qualities.find(q => q.quality === activeQuality) || qualities[0];
  const servers = activeQualityData?.servers || [];

  const switchQuality = (q: string) => {
    const qual = qualities.find(x => x.quality === q);
    if (!qual) return;
    setActiveQuality(q);
    const srv = qual.servers?.find((s: any) => s.name === activeServer);
    setCurrentUrl(srv?.stream_url || qual.stream_url);
    setCurrentDownloadUrl(qual.download_url);
  };

  const switchServer = (serverName: string) => {
    setActiveServer(serverName);
    const srv = activeQualityData?.servers?.find((s: any) => s.name === serverName);
    if (srv) setCurrentUrl(srv.stream_url);
  };

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    if (dur > 0 && time > 5) {
      saveWatchProgress({
        animeName: decodedName,
        episode: epNum,
        timestamp: time,
        duration: dur,
        cover: animeData?.meta?.image?.banner || animeData?.meta?.image?.cover,
        title,
        updatedAt: Date.now(),
      });
    }
  }, [decodedName, epNum, animeData, title]);

  const goPrev = () => {
    const prevIdx = currentSeasonEps.findIndex(e => String(parseInt(e.episode_no)) === String(epNum)) - 1;
    if (prevIdx >= 0) navigate(`/watch/${name}/${currentSeasonEps[prevIdx].episode_no}`);
  };

  const goNext = () => {
    const currIdx = currentSeasonEps.findIndex(e => String(parseInt(e.episode_no)) === String(epNum));
    if (currIdx < currentSeasonEps.length - 1) {
      navigate(`/watch/${name}/${currentSeasonEps[currIdx + 1].episode_no}`);
    } else if (activeSeason < seasons.length - 1) {
      const nextSeason = seasons[activeSeason + 1];
      if (nextSeason?.episodes?.[0]) {
        setActiveSeason(activeSeason + 1);
        navigate(`/watch/${name}/${nextSeason.episodes[0].episode_no}`);
      }
    }
  };

  const toggleWatchlist = () => {
    if (!animeData) return;
    if (inWatchlist) {
      removeFromWatchlist(decodedName);
      setInWatchlist(false);
      toast.info("Removed from watchlist");
    } else {
      addToWatchlist({ animeName: decodedName, title, cover, genres, addedAt: Date.now() });
      setInWatchlist(true);
      toast.success("Added to watchlist!");
    }
  };

  const meta = animeData?.meta;
  const desc = (animeData?.description || meta?.description || "").replace(/<[^>]*>/g, "");
  const score = animeData?.averageScore || meta?.averageScore;
  const status = animeData?.status || meta?.status;
  const type = animeData?.type || meta?.type;
  const totalEps = animeData?.totalEpisodes || meta?.totalEpisodes;
  const duration = animeData?.episodeDuration || meta?.episodeDuration;
  const studios: any[] = animeData?.studios || meta?.studios || [];
  const relations: any[] = meta?.relations || [];
  const characters: any[] = animeData?.characters || meta?.characters || [];

  const relatedAnime = relations.filter(r => r.type === "ANIME" || r.format === "TV" || r.format === "MOVIE" || r.format === "OVA" || r.format === "ONA");
  const sequels = relations.filter(r => r.relationType === "SEQUEL");
  const prequels = relations.filter(r => r.relationType === "PREQUEL");
  const ovas = relations.filter(r => r.format === "OVA");
  const movies = relations.filter(r => r.format === "MOVIE");

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-screen-2xl mx-auto px-4">
        <div className="pt-4">
          <div className="aspect-video shimmer rounded-xl" />
          <div className="mt-4 space-y-2">
            <div className="h-6 w-64 shimmer rounded" />
            <div className="h-4 w-48 shimmer rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 text-center space-y-4">
        <p className="text-primary text-lg font-display font-bold">Failed to load episode</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm">Retry</button>
          <Link to={`/anime/${name}`} className="bg-secondary text-foreground px-5 py-2 rounded-lg text-sm border border-border">Back to Anime</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background no-select">
      <Navbar />
      <div className="pt-16 pb-10">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground py-3 overflow-x-auto hide-scrollbar">
            <Link to="/" className="hover:text-primary transition-colors shrink-0">Home</Link>
            <ChevronRight size={12} className="shrink-0" />
            <Link to={`/anime/${name}`} className="hover:text-primary transition-colors truncate max-w-[150px]">{title}</Link>
            <ChevronRight size={12} className="shrink-0" />
            <span className="text-foreground shrink-0">EP {epNum}</span>
          </div>

          {/* Video Player */}
          <div className="rounded-xl overflow-hidden bg-black">
            {currentUrl ? (
              <VideoPlayer
                src={currentUrl}
                title={`${title} - Episode ${epNum}`}
                onPrev={epNum > 1 ? goPrev : undefined}
                onNext={goNext}
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-card">
                <p className="text-muted-foreground">No stream available</p>
              </div>
            )}
          </div>

          {/* Title + actions */}
          <div className="flex items-start justify-between gap-4 mt-4">
            <div>
              <h1 className="font-display font-bold text-base sm:text-xl leading-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Season {seasons[activeSeason]?.season || "1"} · Episode {epNum} · Hindi Dubbed</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={toggleWatchlist}
                className={`p-2.5 rounded-lg border text-sm transition-all ${inWatchlist ? "bg-neon/10 border-neon text-neon" : "bg-secondary border-border hover:border-primary/50"}`}
              >
                {inWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }} className="p-2.5 rounded-lg border border-border bg-secondary hover:border-primary/50 transition-colors">
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Server + Quality + Info Panel */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3 mt-4">
            {/* Language */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Language</p>
              <span className="inline-block px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground border border-primary">🇮🇳 Hindi Dubbed</span>
            </div>

            {/* Server Selection */}
            {servers.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Servers</p>
                <div className="flex flex-wrap gap-2">
                  {servers.map(s => (
                    <button
                      key={s.name}
                      onClick={() => switchServer(s.name)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        activeServer === s.name
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)_/_0.4)]"
                          : "bg-secondary border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {s.name === "Archive.org" ? "🏛️ Archive.org" : s.name === "PixelDrain" ? "💧 PixelDrain" : s.name === "StreamTape" ? "📺 StreamTape" : s.name}
                      {s.name === "Archive.org" && <span className="ml-1 text-[10px] opacity-60">Primary</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Selection */}
            {qualities.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Quality</p>
                <div className="flex flex-wrap gap-2">
                  {qualities.map(q => (
                    <button
                      key={q.quality}
                      onClick={() => switchQuality(q.quality)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        activeQuality === q.quality
                          ? "bg-neon/20 text-neon border-neon/60 shadow-[0_0_10px_hsl(var(--neon)_/_0.3)]"
                          : "bg-secondary border-border hover:border-neon/30 text-foreground"
                      }`}
                    >
                      {q.quality}
                      {q.file_size && <span className="ml-1 opacity-50 text-[10px]">{q.file_size}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Download */}
            {currentDownloadUrl && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Download</p>
                <a href={currentDownloadUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-sm px-4 py-2 rounded-lg transition-colors">
                  <Download size={14} /> Download EP {epNum} ({activeQuality})
                </a>
              </div>
            )}
          </div>

          {/* EPISODE SELECTION - Right below quality/server panel */}
          {seasons.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden mt-4">
              {/* Season tabs */}
              {seasons.length > 1 && (
                <div className="flex overflow-x-auto hide-scrollbar border-b border-border">
                  {seasons.map((s, i) => (
                    <button
                      key={s.season}
                      onClick={() => setActiveSeason(i)}
                      className={`px-5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                        i === activeSeason
                          ? "border-primary text-primary bg-primary/5"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Season {parseInt(s.season)}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm">
                  Episodes <span className="text-muted-foreground font-normal">({currentSeasonEps.length})</span>
                </h3>
                <div className="flex gap-2">
                  <button onClick={goPrev} disabled={epNum <= 1}
                    className="text-xs px-3 py-1.5 bg-secondary border border-border rounded-lg disabled:opacity-40 hover:border-primary/50 transition-colors">
                    ← Prev
                  </button>
                  <button onClick={goNext}
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Next →
                  </button>
                </div>
              </div>

              <div className="p-3 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1.5">
                  {currentSeasonEps.map(ep => {
                    const epNo = parseInt(ep.episode_no);
                    const isActive = epNo === epNum;
                    return (
                      <Link
                        key={ep.episode_no}
                        to={`/watch/${name}/${ep.episode_no}`}
                        title={`Episode ${epNo}`}
                        className={`flex items-center justify-center h-10 rounded-lg text-xs font-semibold transition-all border ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_hsl(var(--primary)_/_0.4)]"
                            : "bg-secondary/50 hover:bg-primary/10 hover:border-primary/40 border-border text-foreground"
                        }`}
                      >
                        {epNo}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Anime Info + Related */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            {/* Anime Info Panel */}
            {animeData && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex gap-4 p-4">
                  {cover && <img src={cover} alt={title} className="w-20 sm:w-28 aspect-[2/3] object-cover rounded-lg shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-bold text-base mb-1 truncate">{title}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                      {score && <span className="flex items-center gap-1 text-neon"><Star size={11} className="fill-neon" /> {(score / 10).toFixed(1)}</span>}
                      {status && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">{status}</span>}
                      {type && <span className="flex items-center gap-1"><Tv size={11} /> {type}</span>}
                      {totalEps && <span>{totalEps} eps</span>}
                      {duration && <span className="flex items-center gap-1"><Clock size={11} /> {duration}m</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {genres.slice(0, 4).map(g => (
                        <Link key={g} to={`/genre/${g}`} className="text-[10px] bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full">{g}</Link>
                      ))}
                    </div>
                    {studios.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Studio: <span className="text-foreground">{studios.map((s: any) => typeof s === "string" ? s : s.name).join(", ")}</span>
                      </p>
                    )}
                  </div>
                </div>
                {desc && (
                  <div className="px-4 pb-4">
                    <p className={`text-xs text-foreground/70 leading-relaxed ${showFullDesc ? "" : "line-clamp-3"}`}>{desc}</p>
                    {desc.length > 200 && (
                      <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                        {showFullDesc ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Relations: Only show playable (anime type) */}
            {relatedAnime.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Related</h3>
                {sequels.length > 0 && <RelationGroup title="Sequel" items={sequels} />}
                {prequels.length > 0 && <RelationGroup title="Prequel" items={prequels} />}
                {ovas.length > 0 && <RelationGroup title="OVA" items={ovas} />}
                {movies.length > 0 && <RelationGroup title="Movie" items={movies} />}
                {relations.filter(r => !["SEQUEL","PREQUEL"].includes(r.relationType) && !["OVA","MOVIE"].includes(r.format) && r.type === "ANIME").map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    {r.image && <img src={r.image} alt={r.title} className="w-10 h-14 object-cover rounded" />}
                    <div>
                      <p className="text-xs font-medium">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">{r.relationType} · {r.format}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Characters */}
          {characters.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4 mt-4">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Characters</h3>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                {characters.slice(0, 12).map((c: any) => (
                  <div key={c.id || c.name} className="text-center">
                    {c.image && <img src={c.image} alt={c.name} className="w-full aspect-square object-cover rounded-lg mb-1" loading="lazy" />}
                    <p className="text-[10px] font-medium truncate">{c.name}</p>
                    <p className="text-[9px] text-muted-foreground">{c.role === "MAIN" ? "Main" : "Sub"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <RecommendationsSection currentAnimeName={decodedName} />

        </div>
      </div>
      <Footer />
    </div>
  );
}

function RelationGroup({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <Film size={10} /> {title}
      </p>
      <div className="space-y-2">
        {items.map(r => (
          <div key={r.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2">
            {r.image && <img src={r.image} alt={r.title} className="w-9 h-12 object-cover rounded shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{r.title}</p>
              <p className="text-[10px] text-muted-foreground">{r.format} · {r.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsSection({ currentAnimeName }: { currentAnimeName: string }) {
  const [animeList, setAnimeList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchAnimeList()
      .then(list => {
        setAnimeList(list.filter(a => a.anime_name !== currentAnimeName));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [currentAnimeName]);

  if (!loaded || animeList.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <Play size={18} className="text-primary" /> More Anime
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {animeList.map(anime => (
          <AnimeCard key={anime.anime_name} anime={anime} />
        ))}
      </div>
    </section>
  );
}
