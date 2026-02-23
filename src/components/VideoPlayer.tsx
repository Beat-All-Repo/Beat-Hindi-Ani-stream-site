import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack, Loader2, FastForward, Rewind } from "lucide-react";
import { useVideoBuffer } from "@/hooks/useVideoBuffer";

interface Props {
  src: string;
  title?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onTimeUpdate?: (time: number, duration: number) => void;
  initialTime?: number;
  skipIntroAt?: [number, number]; // [start, end]
  skipOutroAt?: [number, number];
}

export default function VideoPlayer({ src, title, onPrev, onNext, onTimeUpdate, initialTime, skipIntroAt, skipOutroAt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const video = videoRef.current;

  // Advanced adaptive buffering
  const bufferState = useVideoBuffer(videoRef);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
  }, [src]);

  // Seek to initial time when video loads
  useEffect(() => {
    if (initialTime && video && duration > 0) {
      video.currentTime = initialTime;
    }
  }, [initialTime, duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (v.paused) { v.play(); } else { v.pause(); }
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case "arrowup":
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          break;
        case "arrowdown":
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
        case "n":
          if (onNext) { e.preventDefault(); onNext(); }
          break;
        case "p":
          if (onPrev) { e.preventDefault(); onPrev(); }
          break;
        case ">":
          e.preventDefault();
          const newUp = Math.min(3, playbackRate + 0.25);
          v.playbackRate = newUp;
          setPlaybackRate(newUp);
          break;
        case "<":
          e.preventDefault();
          const newDown = Math.max(0.25, playbackRate - 0.25);
          v.playbackRate = newDown;
          setPlaybackRate(newDown);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playbackRate, onNext, onPrev]);

  // Fullscreen change
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = useCallback(() => {
    if (!video) return;
    if (video.paused) { video.play(); } else { video.pause(); }
  }, [video]);

  const seek = (seconds: number) => {
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handleTimeUpdate = () => {
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
    onTimeUpdate?.(video.currentTime, video.duration);

    // Skip intro/outro visibility
    if (skipIntroAt) {
      setShowSkipIntro(video.currentTime >= skipIntroAt[0] && video.currentTime < skipIntroAt[1]);
    }
    if (skipOutroAt) {
      setShowSkipOutro(video.currentTime >= skipOutroAt[0] && video.currentTime < skipOutroAt[1]);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!video || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(e.clientX - rect.left);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Double-tap to seek on mobile
  const lastTap = useRef<{ time: number; side: string }>({ time: 0, side: "" });
  const [ripple, setRipple] = useState<{ side: string; key: number } | null>(null);

  const handleTap = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.changedTouches[0].clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();
    if (now - lastTap.current.time < 300 && lastTap.current.side === side) {
      seek(side === "right" ? 10 : -10);
      setRipple({ side, key: now });
      setTimeout(() => setRipple(null), 600);
    }
    lastTap.current = { time: now, side };
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-background rounded-lg overflow-hidden aspect-video group cursor-pointer select-none"
      onMouseMove={showControlsTemporarily}
      onTouchStart={handleTap}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { if (videoRef.current) { setDuration(videoRef.current.duration); setLoading(false); } }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        muted={muted}
        playsInline
        preload="auto"
      />

      {/* Loading spinner when paused or buffering */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 pointer-events-none">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
          </div>
        </div>
      )}

      {/* Ripple effect for double-tap */}
      {ripple && (
        <div className={`absolute top-0 ${ripple.side === "left" ? "left-0" : "right-0"} w-1/2 h-full flex items-center justify-center pointer-events-none`}>
          <div className="w-20 h-20 bg-foreground/10 rounded-full animate-ping" />
          <div className="absolute flex items-center gap-1 text-foreground/90">
            {ripple.side === "left" ? <Rewind size={20} /> : <FastForward size={20} />}
            <span className="text-sm font-bold">10s</span>
          </div>
        </div>
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && (
        <button
          onClick={(e) => { e.stopPropagation(); if (video && skipIntroAt) video.currentTime = skipIntroAt[1]; }}
          className="absolute bottom-24 right-4 bg-foreground/90 text-background font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-foreground transition-colors z-20 animate-fade-in"
        >
          Skip Intro →
        </button>
      )}

      {/* Skip Outro Button */}
      {showSkipOutro && (
        <button
          onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}
          className="absolute bottom-24 right-4 bg-foreground/90 text-background font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-foreground transition-colors z-20 animate-fade-in"
        >
          Skip Outro → Next
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-background/70 to-transparent p-4 flex items-center justify-between">
          {title && <p className="text-sm font-medium truncate">{title}</p>}
          {playbackRate !== 1 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{playbackRate}x</span>
          )}
          {/* Buffer health indicator */}
          {!bufferState.isBufferHealthy && playing && (
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded animate-pulse">
              Buffering…
            </span>
          )}
        </div>

        {/* Center play/pause */}
        <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="pointer-events-auto bg-background/30 backdrop-blur-sm rounded-full p-3 hover:bg-background/50 transition-colors">
            <SkipBack size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="pointer-events-auto bg-primary/90 rounded-full p-5 hover:bg-primary transition-all hover:scale-110">
            {playing ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="pointer-events-auto bg-background/30 backdrop-blur-sm rounded-full p-3 hover:bg-background/50 transition-colors">
            <SkipForward size={22} />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent px-4 pb-3 pt-8 space-y-2">
          {/* Progress bar with hover preview */}
          <div
            ref={progressRef}
            className="relative h-1 hover:h-2 bg-foreground/15 rounded-full cursor-pointer group/bar transition-all"
            onClick={handleSeek}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Buffered */}
            <div className="absolute h-full bg-foreground/20 rounded-full" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
            {/* Progress */}
            <div className="absolute h-full bg-primary rounded-full transition-[width]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-[0_0_8px_hsl(var(--primary))]" />
            </div>
            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-10 bg-card border border-border rounded px-2 py-1 text-xs font-mono pointer-events-none transform -translate-x-1/2 shadow-lg"
                style={{ left: `${hoverX}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2 sm:gap-3">
              {onPrev && <button onClick={onPrev} className="hover:text-primary transition-colors p-1"><SkipBack size={18} /></button>}
              <button onClick={togglePlay} className="hover:text-primary transition-colors p-1">
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              {onNext && <button onClick={onNext} className="hover:text-primary transition-colors p-1"><SkipForward size={18} /></button>}

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-1 group/vol">
                <button onClick={() => { if (video) { video.muted = !video.muted; setMuted(!muted); } }} className="hover:text-primary transition-colors p-1">
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={e => { const v = parseFloat(e.target.value); if (video) { video.volume = v; video.muted = v === 0; } setVolume(v); setMuted(v === 0); }}
                  className="w-0 group-hover/vol:w-20 transition-all accent-primary cursor-pointer"
                />
              </div>

              <span className="text-xs text-foreground/60 font-mono hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Speed */}
              <select
                value={playbackRate}
                onChange={e => { const r = parseFloat(e.target.value); if (video) video.playbackRate = r; setPlaybackRate(r); }}
                className="bg-transparent text-xs border border-border rounded px-1.5 py-1 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                  <option key={r} value={r} className="bg-card">{r}x</option>
                ))}
              </select>

              <button onClick={toggleFullscreen} className="hover:text-primary transition-colors p-1">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
