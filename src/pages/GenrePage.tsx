import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchAnimeList, AnimeItem, getAnimeGenres } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import Footer from "@/components/Footer";
import SkeletonCard from "@/components/SkeletonCard";

export default function GenrePage() {
  const { genre } = useParams();
  const [anime, setAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnimeList().then(setAnime).catch(() => setAnime([])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!genre) return anime;
    return anime.filter(a => getAnimeGenres(a).some(g => g.toLowerCase() === genre.toLowerCase()));
  }, [anime, genre]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-10 container">
        <h1 className="font-display font-bold text-3xl mb-6">{genre} Anime</h1>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No anime found in this genre</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} anime found</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map((a, i) => <AnimeCard key={a.anime_name} anime={a} index={i} />)}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
