import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList, searchAnime, AnimeItem, getAnimeGenres } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import Footer from "@/components/Footer";
import SkeletonCard from "@/components/SkeletonCard";
import { Search } from "lucide-react";

const ALL_GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller", "Mystery", "Mecha"];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [input, setInput] = useState(query);
  const [anime, setAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenres, setActiveGenres] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    if (query) {
      searchAnime(query).then(setAnime).catch(() => setAnime([])).finally(() => setLoading(false));
    } else {
      fetchAnimeList().then(setAnime).catch(() => setAnime([])).finally(() => setLoading(false));
    }
  }, [query]);

  const filtered = useMemo(() => {
    if (!activeGenres.length) return anime;
    return anime.filter(a => activeGenres.some(g => getAnimeGenres(a).includes(g)));
  }, [anime, activeGenres]);

  const toggleGenre = (g: string) => {
    setActiveGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const doSearch = () => {
    if (input.trim()) setParams({ q: input });
    else setParams({});
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-10 container">
        <h1 className="font-display font-bold text-3xl mb-6">{query ? `Results for "${query}"` : "Browse All Anime"}</h1>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Search anime..."
              className="w-full bg-secondary rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none border border-border focus:border-primary/50 transition-colors"
            />
          </div>
          <button onClick={doSearch} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Search
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {ALL_GENRES.map(g => (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeGenres.includes(g) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No anime found</p>
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
