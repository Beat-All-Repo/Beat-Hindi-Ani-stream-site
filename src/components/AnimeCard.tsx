import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";
import { AnimeItem, getAnimeName, getAnimeCover, getAnimeGenres, getAnimeScore, getAnimeStatus } from "@/lib/api";

interface Props {
  anime: AnimeItem;
  index?: number;
}

export default function AnimeCard({ anime, index = 0 }: Props) {
  const name = getAnimeName(anime);
  const cover = getAnimeCover(anime);
  const score = getAnimeScore(anime);
  const genres = getAnimeGenres(anime).slice(0, 2);
  const status = getAnimeStatus(anime);

  return (
    <Link
      to={`/anime/${encodeURIComponent(anime.anime_name)}`}
      className="group relative flex-shrink-0 w-[160px] sm:w-[180px] animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden card-hover">
        {cover ? (
          <img src={cover} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <Play className="text-muted-foreground" size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1">
            <Play size={12} className="text-primary fill-primary" />
            <span className="text-xs font-medium text-primary">Watch</span>
          </div>
        </div>
        {score && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5">
            <Star size={9} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-bold">{(score / 10).toFixed(1)}</span>
          </div>
        )}
        {status === "RELEASING" && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
            AIRING
          </div>
        )}
      </div>
      <h3 className="mt-2 text-xs sm:text-sm font-medium leading-tight line-clamp-2">{name}</h3>
      {genres.length > 0 && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{genres.join(" · ")}</p>
      )}
    </Link>
  );
}
