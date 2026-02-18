import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAnimeInfo, AnimeDetail as AnimeDetailType, getAnimeName, getAnimeCover, getAnimeBanner, getAnimeGenres, getAnimeScore } from "@/lib/api";
import { addToWatchlist, removeFromWatchlist, isInWatchlist, getLastWatched } from "@/lib/storage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Play, Star, Calendar, Clock, Tv, Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function AnimeDetailPage() {
  const { name } = useParams();
  const [data, setData] = useState<AnimeDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSeason, setActiveSeason] = useState(0);
  const [showAllChars, setShowAllChars] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const decodedName = name ? decodeURIComponent(name) : "";

  useEffect(() => {
    if (!decodedName) return;
    setLoading(true);
    setError("");
    setInWatchlist(isInWatchlist(decodedName));
    fetchAnimeInfo(decodedName)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [decodedName]);

  const toggleWatchlist = () => {
    if (!data) return;
    const title = getAnimeName(data);
    if (inWatchlist) {
      removeFromWatchlist(data.anime_name);
      setInWatchlist(false);
      toast.info("Removed from watchlist");
    } else {
      addToWatchlist({
        animeName: data.anime_name,
        title,
        cover: getAnimeCover(data),
        genres: getAnimeGenres(data),
        score: getAnimeScore(data),
        addedAt: Date.now(),
      });
      setInWatchlist(true);
      toast.success("Added to watchlist!");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16 h-[60vh] shimmer" />
      <div className="container mt-4 space-y-4">
        <div className="flex gap-6">
          <div className="w-40 sm:w-52 aspect-[2/3] shimmer rounded-lg" />
          <div className="flex-1 space-y-3 pt-4">
            <div className="h-8 w-3/4 shimmer rounded" />
            <div className="h-4 w-1/2 shimmer rounded" />
            <div className="h-4 w-full shimmer rounded" />
            <div className="h-4 w-full shimmer rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 text-center space-y-4">
        <p className="text-xl text-primary font-display font-bold">Failed to load anime</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Link to="/" className="inline-block bg-secondary px-5 py-2 rounded-lg text-sm border border-border">Go Home</Link>
      </div>
    </div>
  );

  const title = getAnimeName(data);
  const banner = getAnimeBanner(data);
  const cover = getAnimeCover(data);
  const genres = getAnimeGenres(data);
  const score = getAnimeScore(data);
  const desc = (data.description || data.meta?.description || "").replace(/<[^>]*>/g, "");
  const seasons = data.episodes?.seasons || [];
  const currentEps = seasons[activeSeason]?.episodes || [];
  const characters = data.characters || data.meta?.characters || [];
  const displayChars = showAllChars ? characters : characters.slice(0, 12);
  const studios = data.studios || data.meta?.studios || [];
  const status = data.status || data.meta?.status;
  const type = data.type || data.meta?.type;
  const totalEps = data.totalEpisodes || data.meta?.totalEpisodes;
  const duration = data.episodeDuration || data.meta?.episodeDuration;
  const startYear = data.startDate?.year || data.meta?.startDate?.year;
  const trailer = data.trailer?.url || data.meta?.trailer?.url;
  const lastWatched = getLastWatched(data.anime_name);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Banner */}
      <div className="relative h-[50vh] sm:h-[60vh]">
        {banner ? (
          <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        <div className="absolute inset-0 gradient-overlay" />
        <div className="absolute inset-0 gradient-overlay-left" />
      </div>

      {/* Info section */}
      <div className="container relative -mt-48 z-10 pb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {cover && (
            <div className="flex-shrink-0">
              <img src={cover} alt={title} className="w-40 sm:w-52 rounded-xl shadow-2xl neon-border" />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-4">
            <h1 className="font-display font-black text-3xl sm:text-4xl mb-2 drop-shadow-lg">{title}</h1>
            {data.meta?.title?.romaji && data.meta.title.romaji !== title && (
              <p className="text-muted-foreground text-sm mb-3">{data.meta.title.romaji}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              {score && (
                <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                  <Star size={14} className="fill-yellow-400" /> {(score / 10).toFixed(1)}
                </span>
              )}
              {status && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">{status}</span>}
              {type && <span className="flex items-center gap-1 text-muted-foreground"><Tv size={14} /> {type}</span>}
              {totalEps && <span className="text-muted-foreground">{totalEps} eps</span>}
              {duration && <span className="flex items-center gap-1 text-muted-foreground"><Clock size={14} /> {duration}min</span>}
              {startYear && <span className="flex items-center gap-1 text-muted-foreground"><Calendar size={14} /> {startYear}</span>}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {genres.map(g => (
                <Link key={g} to={`/genre/${g}`} className="text-xs bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-full transition-colors">{g}</Link>
              ))}
            </div>

            {studios.length > 0 && (
              <p className="text-sm text-muted-foreground mb-3">Studio: <span className="text-foreground">{studios.join(", ")}</span></p>
            )}

            {desc && (
              <div className="mb-5">
                <p className={`text-sm text-foreground/80 leading-relaxed ${showFullDesc ? "" : "line-clamp-4"}`}>{desc}</p>
                {desc.length > 300 && (
                  <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-primary hover:underline mt-1">
                    {showFullDesc ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to={lastWatched ? `/watch/${encodeURIComponent(data.anime_name)}/${lastWatched.episode}` : `/watch/${encodeURIComponent(data.anime_name)}/1`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-all hover:shadow-[0_0_20px_hsl(var(--primary)_/_0.4)] text-sm"
              >
                <Play size={18} className="fill-current" />
                {lastWatched ? `Continue EP ${lastWatched.episode}` : "Watch Episode 1"}
              </Link>

              <button
                onClick={toggleWatchlist}
                className={`inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-lg border transition-all text-sm ${
                  inWatchlist ? "bg-neon/10 border-neon text-neon" : "bg-secondary border-border hover:border-primary/50"
                }`}
              >
                {inWatchlist ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                {inWatchlist ? "In Watchlist" : "Watchlist"}
              </button>

              <button onClick={handleShare} className="p-3 bg-secondary border border-border rounded-lg hover:border-primary/50 transition-colors" title="Copy link">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Seasons & Episodes */}
        {seasons.length > 0 && (
          <section className="mt-10">
            {seasons.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
                {seasons.map((s, i) => (
                  <button
                    key={s.season}
                    onClick={() => setActiveSeason(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      i === activeSeason ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    Season {s.season}
                  </button>
                ))}
              </div>
            )}
            <h2 className="font-display font-bold text-xl mb-3">Episodes ({currentEps.length})</h2>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {currentEps.map(ep => (
                <Link
                  key={ep.episode_no}
                  to={`/watch/${encodeURIComponent(data.anime_name)}/${ep.episode_no}`}
                  className={`flex items-center justify-center h-11 rounded-lg text-sm font-medium transition-all border ${
                    lastWatched?.episode === ep.episode_no
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-secondary hover:bg-primary/10 hover:border-primary/50 border-border"
                  }`}
                >
                  {ep.episode_no}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Trailer */}
        {trailer && (
          <section className="mt-10">
            <h2 className="font-display font-bold text-xl mb-3">Trailer</h2>
            <div className="aspect-video max-w-2xl rounded-xl overflow-hidden neon-border">
              <iframe
                src={trailer.replace("watch?v=", "embed/")}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
                title="Trailer"
              />
            </div>
          </section>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display font-bold text-xl mb-3">Characters</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {displayChars.map(c => (
                <div key={c.name} className="text-center group">
                  {c.image && <img src={c.image} alt={c.name} className="w-full aspect-square object-cover rounded-lg mb-1.5 group-hover:ring-2 ring-primary/50 transition-all" loading="lazy" />}
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.role}</p>
                </div>
              ))}
            </div>
            {characters.length > 12 && (
              <button onClick={() => setShowAllChars(!showAllChars)} className="mt-3 text-sm text-primary hover:underline">
                {showAllChars ? "Show Less" : `Show All (${characters.length})`}
              </button>
            )}
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
