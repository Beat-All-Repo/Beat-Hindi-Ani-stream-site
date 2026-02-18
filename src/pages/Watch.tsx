import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchEpisode, fetchAnimeInfo, EpisodeInfo, AnimeDetail, getAnimeName, getDownloadUrl } from "@/lib/api";
import { saveWatchProgress } from "@/lib/storage";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import Footer from "@/components/Footer";
import { Download, Server, MonitorPlay, ChevronRight, Languages, ExternalLink } from "lucide-react";

export default function WatchPage() {
  const { name, episode } = useParams();
  const navigate = useNavigate();
  const [epData, setEpData] = useState<EpisodeInfo | null>(null);
  const [animeData, setAnimeData] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeServer, setActiveServer] = useState(0);
  const [activeQuality, setActiveQuality] = useState<string>("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [language, setLanguage] = useState("English");

  const decodedName = name ? decodeURIComponent(name) : "";
  const epNum = parseInt(episode || "1");
  // Raw episode string for API (preserves zero-padding like "01")
  const epRaw = episode || "1";

  useEffect(() => {
    if (!decodedName || !epNum) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetchEpisode(decodedName, epRaw),
      fetchAnimeInfo(decodedName),
    ])
      .then(([ep, info]) => {
        setEpData(ep);
        setAnimeData(info);
        setCurrentUrl(ep.stream_url);
        if (ep.qualities?.length) setActiveQuality(ep.qualities[0].quality);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [decodedName, epNum]);

  const title = animeData ? getAnimeName({ anime_name: animeData.anime_name, meta: animeData.meta }) : decodedName;

  // Save watch progress
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

  const switchServer = (index: number) => {
    if (!epData?.servers?.[index]) return;
    setActiveServer(index);
    setCurrentUrl(epData.servers[index].stream_url);
  };

  const switchQuality = (q: string) => {
    const qual = epData?.qualities?.find(x => x.quality === q);
    if (qual) { setActiveQuality(q); setCurrentUrl(qual.stream_url); }
  };

  const seasons = animeData?.episodes?.seasons || [];
  const allEps = seasons.flatMap(s => s.episodes);

  const goPrev = () => epNum > 1 && navigate(`/watch/${name}/${epNum - 1}`);
  const goNext = () => {
    const maxEp = allEps.length || (animeData?.meta?.totalEpisodes || 999);
    if (epNum < maxEp) navigate(`/watch/${name}/${epNum + 1}`);
  };

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 container">
        <div className="aspect-video shimmer rounded-lg" />
        <div className="mt-4 h-6 w-64 shimmer rounded" />
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen">
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
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-10">
        <div className="container">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4 overflow-x-auto hide-scrollbar">
            <Link to="/" className="hover:text-primary transition-colors shrink-0">Home</Link>
            <ChevronRight size={14} className="shrink-0" />
            <Link to={`/anime/${name}`} className="hover:text-primary transition-colors truncate">{title}</Link>
            <ChevronRight size={14} className="shrink-0" />
            <span className="text-foreground shrink-0">EP {epNum}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div>
              {/* Player */}
              {currentUrl ? (
                <VideoPlayer
                  src={currentUrl}
                  title={`${title} - Episode ${epNum}`}
                  onPrev={epNum > 1 ? goPrev : undefined}
                  onNext={goNext}
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No stream available</p>
                </div>
              )}

              {/* Controls */}
              <div className="mt-4 space-y-4">
                <h1 className="font-display font-bold text-lg sm:text-xl">{title} - Episode {epNum}</h1>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Servers */}
                  {epData?.servers && epData.servers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Server size={14} className="text-muted-foreground" />
                      {epData.servers.map((s, i) => (
                        <button
                          key={s.name}
                          onClick={() => switchServer(i)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            i === activeServer ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/50"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quality */}
                  {epData?.qualities && epData.qualities.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <MonitorPlay size={14} className="text-muted-foreground" />
                      {epData.qualities.map(q => (
                        <button
                          key={q.quality}
                          onClick={() => switchQuality(q.quality)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            q.quality === activeQuality ? "bg-neon/20 text-neon border-neon/50" : "bg-secondary border-border hover:border-neon/30"
                          }`}
                        >
                          {q.quality}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Language */}
                  <div className="flex items-center gap-2">
                    <Languages size={14} className="text-muted-foreground" />
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Japanese">Japanese (Sub)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* Download */}
                  {epData?.download_url && (
                    <a
                      href={getDownloadUrl(epData.download_url)}
                      download
                      className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      <Download size={16} /> Download
                    </a>
                  )}

                  <a
                    href="https://t.me/Beat_Anime_Discussion"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-sm px-4 py-2 rounded-lg transition-colors text-neon"
                  >
                    <ExternalLink size={16} /> Discuss on Telegram
                  </a>
                </div>
              </div>
            </div>

            {/* Episode sidebar */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm">Episodes ({allEps.length})</h3>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {allEps.map(ep => (
                  <Link
                    key={ep.episode_no}
                    to={`/watch/${name}/${ep.episode_no}`}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      ep.episode_no === epNum ? "bg-primary/10 text-primary border-l-2 border-primary" : "hover:bg-secondary/80 border-l-2 border-transparent"
                    }`}
                  >
                    <span className="font-mono text-xs w-8 text-center shrink-0">{ep.episode_no}</span>
                    <span className="truncate">Episode {ep.episode_no}</span>
                  </Link>
                ))}
                {allEps.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground text-center">No episodes loaded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
