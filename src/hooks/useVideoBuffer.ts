import { useRef, useState, useCallback, useEffect } from "react";

interface BufferConfig {
  /** Min buffer ahead in seconds (fast connection) */
  minBuffer: number;
  /** Max buffer ahead in seconds (slow connection) */
  maxBuffer: number;
  /** How often to check buffer health (ms) */
  checkInterval: number;
}

interface BufferState {
  /** Seconds of video buffered ahead of current time */
  bufferAhead: number;
  /** Whether the buffer is healthy (enough data ahead) */
  isBufferHealthy: boolean;
  /** Current estimated bandwidth in Mbps */
  estimatedBandwidth: number;
  /** Current adaptive buffer target in seconds */
  bufferTarget: number;
  /** Total bytes loaded */
  bytesLoaded: number;
}

const DEFAULT_CONFIG: BufferConfig = {
  minBuffer: 10,
  maxBuffer: 30,
  checkInterval: 1000,
};

/**
 * Advanced buffering hook for the video player.
 * - Adaptive buffer sizing based on connection speed
 * - Progressive buffer health monitoring
 * - Bandwidth estimation
 */
export function useVideoBuffer(
  videoRef: React.RefObject<HTMLVideoElement>,
  config: Partial<BufferConfig> = {}
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<BufferState>({
    bufferAhead: 0,
    isBufferHealthy: true,
    estimatedBandwidth: 0,
    bufferTarget: cfg.minBuffer,
    bytesLoaded: 0,
  });

  const lastBytesRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const bandwidthSamples = useRef<number[]>([]);

  const getBufferAhead = useCallback((): number => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return 0;

    const current = video.currentTime;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= current && video.buffered.end(i) >= current) {
        return video.buffered.end(i) - current;
      }
    }
    return 0;
  }, [videoRef]);

  const estimateBandwidth = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const now = Date.now();
    const elapsed = (now - lastTimeRef.current) / 1000;
    if (elapsed < 0.5) return;

    // Use buffered bytes as a rough proxy
    let totalBuffered = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      totalBuffered += video.buffered.end(i) - video.buffered.start(i);
    }

    // Rough estimate: ~500KB per second of video at medium quality
    const estimatedBytes = totalBuffered * 500 * 1024;
    const byteDelta = Math.max(0, estimatedBytes - lastBytesRef.current);
    
    if (byteDelta > 0 && elapsed > 0) {
      const bps = (byteDelta * 8) / elapsed;
      const mbps = bps / 1_000_000;
      
      bandwidthSamples.current.push(mbps);
      if (bandwidthSamples.current.length > 10) {
        bandwidthSamples.current.shift();
      }
    }

    lastBytesRef.current = estimatedBytes;
    lastTimeRef.current = now;
  }, [videoRef]);

  const getAdaptiveBufferTarget = useCallback((): number => {
    const samples = bandwidthSamples.current;
    if (samples.length < 2) return cfg.minBuffer;

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    
    // Fast connection (>5 Mbps) → smaller buffer (saves bandwidth)
    // Slow connection (<1 Mbps) → larger buffer (protects against stalls)
    if (avg > 5) return cfg.minBuffer;
    if (avg > 2) return Math.round((cfg.minBuffer + cfg.maxBuffer) / 2);
    return cfg.maxBuffer;
  }, [cfg.minBuffer, cfg.maxBuffer]);

  // Periodic buffer health check
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;

      estimateBandwidth();
      const ahead = getBufferAhead();
      const target = getAdaptiveBufferTarget();
      const avgBandwidth = bandwidthSamples.current.length > 0
        ? bandwidthSamples.current.reduce((a, b) => a + b, 0) / bandwidthSamples.current.length
        : 0;

      setState({
        bufferAhead: Math.round(ahead * 10) / 10,
        isBufferHealthy: ahead >= Math.min(5, target / 2),
        estimatedBandwidth: Math.round(avgBandwidth * 100) / 100,
        bufferTarget: target,
        bytesLoaded: lastBytesRef.current,
      });
    }, cfg.checkInterval);

    return () => clearInterval(interval);
  }, [videoRef, cfg.checkInterval, estimateBandwidth, getBufferAhead, getAdaptiveBufferTarget]);

  return state;
}
