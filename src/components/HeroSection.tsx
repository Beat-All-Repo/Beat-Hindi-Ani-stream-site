import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Info, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimeItem, getAnimeName, getAnimeBanner, getAnimeGenres, getAnimeScore } from "@/lib/api";

interface Props {
  anime: AnimeItem[];
}

export default function HeroSection({ anime }: Props) {
  const featured = anime.filter(a => getAnimeBanner(a)).slice(0, 6);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % featured.length), 6000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!featured.length) return null;

  const item = featured[current];
  const name = getAnimeName(item);
  const banner = getAnimeBanner(item);
  const score = getAnimeScore(item);
  const genres = getAnimeGenres(item);
  const desc = (item.meta?.description || (item as any).description || "").replace(/<[^>]*>/g, "").slice(0, 220);

  return (
    <section className="relative h-[70vh] sm:h-[80vh] overflow-hidden">
      {banner && (
        <img
          src={banner}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          key={current}
        />
      )}
      <div className="absolute inset-0 gradient-overlay" />
      <div className="absolute inset-0 gradient-overlay-left" />
      <div className="absolute inset-0 bg-background/20" />

      <div className="relative h-full container flex flex-col justify-end pb-20 sm:pb-24">
        <div className="max-w-2xl animate-slide-in" key={current}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {genres.slice(0, 3).map(g => (
              <span key={g} className="text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-full px-3 py-1">{g}</span>
            ))}
            {score && (
              <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
                <Star size={14} className="fill-yellow-400" />
                {(score / 10).toFixed(1)}
              </span>
            )}
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl leading-tight mb-3 text-glow-red drop-shadow-2xl">{name}</h1>
          {desc && <p className="text-sm sm:text-base text-foreground/75 leading-relaxed mb-6 line-clamp-3 drop-shadow-md">{desc}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to={`/watch/${encodeURIComponent(item.anime_name)}/1`}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-7 py-3 rounded-lg transition-all hover:shadow-[0_0_25px_hsl(var(--primary)_/_0.5)] text-sm sm:text-base"
            >
              <Play size={18} className="fill-current" /> Watch Now
            </Link>
            <Link
              to={`/anime/${encodeURIComponent(item.anime_name)}`}
              className="flex items-center gap-2 bg-secondary/80 hover:bg-secondary text-foreground font-semibold px-6 py-3 rounded-lg transition-colors border border-border/60 backdrop-blur-sm text-sm sm:text-base"
            >
              <Info size={18} /> More Info
            </Link>
          </div>
        </div>

        {featured.length > 1 && (
          <div className="absolute bottom-8 right-4 sm:right-8 flex items-center gap-3">
            <button onClick={() => setCurrent(c => (c - 1 + featured.length) % featured.length)} className="bg-secondary/60 hover:bg-secondary rounded-full p-2 transition-colors backdrop-blur-sm">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1.5">
              {featured.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "bg-primary w-6" : "bg-foreground/30 w-1.5"}`} />
              ))}
            </div>
            <button onClick={() => setCurrent(c => (c + 1) % featured.length)} className="bg-secondary/60 hover:bg-secondary rounded-full p-2 transition-colors backdrop-blur-sm">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
