import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, X, User, LogOut, Shield, Crown, HelpCircle } from "lucide-react";
import { searchAnime, AnimeItem, getAnimeName } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await searchAnime(val);
        setResults(r.slice(0, 8));
      } catch { setResults([]); }
    }, 300);
  };

  const submit = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setShowSearch(false);
      setResults([]);
    }
  };

  const genres = ["Action", "Romance", "Fantasy", "Adventure", "Comedy", "Drama", "Sci-Fi", "Horror"];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md shadow-lg shadow-primary/5" : "bg-gradient-to-b from-background/80 to-transparent"}`}>
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Beat AniStream" className="h-10 w-10 rounded-lg" />
          <span className="font-display font-bold text-xl text-glow-red hidden sm:block">Beat AniStream</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Home</Link>
          <div className="relative group">
            <button className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Genres</button>
            <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg p-3 grid grid-cols-2 gap-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl">
              {genres.map(g => (
                <Link key={g} to={`/genre/${g}`} className="text-sm px-3 py-1.5 rounded hover:bg-primary/20 hover:text-primary transition-colors">{g}</Link>
              ))}
            </div>
          </div>
          <Link to="/search" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Browse</Link>
          <a href="https://t.me/Beat_Anime_Discussion" target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"><HelpCircle size={14} /> Help</a>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <div className={`flex items-center transition-all ${showSearch ? "w-64" : "w-8"}`}>
              {showSearch && (
                <input
                  autoFocus
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="Search anime..."
                  className="w-full bg-secondary/80 text-sm rounded-lg pl-3 pr-8 py-2 outline-none border border-border focus:border-primary/50 transition-colors"
                />
              )}
              <button onClick={() => { setShowSearch(!showSearch); if (showSearch) { setQuery(""); setResults([]); } }} className={`${showSearch ? "absolute right-2" : ""} text-foreground/70 hover:text-primary transition-colors`}>
                {showSearch ? <X size={16} /> : <Search size={20} />}
              </button>
            </div>
            {results.length > 0 && showSearch && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                {results.map(r => (
                  <Link
                    key={r.anime_name}
                    to={`/anime/${encodeURIComponent(r.anime_name)}`}
                    onClick={() => { setShowSearch(false); setResults([]); setQuery(""); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors"
                  >
                    {(r.image?.cover || r.meta?.image?.cover) && <img src={r.image?.cover || r.meta?.image?.cover} className="w-10 h-14 object-cover rounded" alt="" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getAnimeName(r)}</p>
                      <p className="text-xs text-muted-foreground">{(r.genres || r.meta?.genres)?.slice(0, 3).join(", ")}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* User menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 hover:border-primary/50 transition-colors"
              >
                {profile?.is_premium && <Crown size={14} className="text-yellow-400" />}
                <User size={16} />
                <span className="text-xs font-medium hidden sm:block max-w-[80px] truncate">{profile?.display_name || "User"}</span>
              </button>
              {userMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-medium truncate">{profile?.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">{profile?.is_premium ? "★ Premium" : "Free"}</p>
                  </div>
                  {isAdmin && (
                    <Link to="/owner" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 transition-colors">
                      <Shield size={14} /> Owner Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(); setUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg font-medium transition-colors">
              Login
            </Link>
          )}

          <button className="md:hidden text-foreground/70" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-card/95 backdrop-blur-md border-t border-border p-4 space-y-2">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded hover:bg-primary/10 text-sm">Home</Link>
          <Link to="/search" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded hover:bg-primary/10 text-sm">Browse</Link>
          <a href="https://t.me/Beat_Anime_Discussion" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-primary/10 text-sm"><HelpCircle size={14} /> Help & Support</a>
          {genres.map(g => (
            <Link key={g} to={`/genre/${g}`} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded hover:bg-primary/10 text-sm">{g}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
