"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useYoutube } from "@/hooks/useYoutube";
import { updateClipPos } from "@/lib/progress";
import type { Bookmark, Clip } from "@/lib/types";
import { fmtTime } from "@/lib/search";

interface YouTubePlaylistProps {
  slug: string;
  clips: Clip[]; // includes recitation as last item if present
  bookmarks: Bookmark[];
  onAddBookmark: (bm: Bookmark) => void;
  onRemoveBookmark: (ts: number) => void;
  onSeekRequest: (clipIdx: number, t: number) => void;
  onTimeUpdate: (clipIdx: number, timeSec: number) => void;
  seekTo: { clipIdx: number; t: number; seq: number } | null;
  /** Start playing as soon as the player is ready (used after an explicit user action). */
  autoPlay?: boolean;
}

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

/* Only one video ever plays at a time across all players on the page. */
const livePlayers = new Set<YTPlayer>();

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function YouTubePlaylist({ slug, clips, bookmarks, onAddBookmark, onSeekRequest, onTimeUpdate, seekTo, autoPlay = false }: YouTubePlaylistProps) {
  const [idx, setIdx] = useState(0);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState<number | null>(null);
  const [offline, setOffline] = useState(() => (typeof window !== "undefined" ? !window.navigator.onLine : false));
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef = useRef(0);
  const clipsRef = useRef(clips);
  const autoPlayRef = useRef(autoPlay);
  idxRef.current = idx;
  clipsRef.current = clips;
  autoPlayRef.current = autoPlay;

  /* pause every other player on the page */
  const pauseOthers = useCallback(() => {
    const me = playerRef.current;
    for (const other of livePlayers) {
      if (other === me) continue;
      try {
        other.pauseVideo();
      } catch {}
    }
  }, []);

  const clip = clips[idx];
  const clipEnd = clip && clip.end > clip.start ? clip.end : null;

  const { ready: ytReady } = useYoutube(clip?.ytId ?? null, !offline && !!clip?.ytId);

  /* persist progress */
  const persist = useCallback(() => {
    const c = clipsRef.current[idxRef.current];
    const p = playerRef.current;
    if (!c || !p || typeof p.getCurrentTime !== "function") return;
    try {
      const t = p.getCurrentTime() || 0;
      const d = p.getDuration() || null;
      updateClipPos(slug, `${c.ytId}:${c.start}`, t, d);
      setTime(t);
      setDur(d);
    } catch {}
  }, [slug]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /* save on exit paths */
  useEffect(() => {
    const h = () => persist();
    window.addEventListener("beforeunload", h);
    window.addEventListener("pagehide", h);
    const vis = () => {
      if (document.visibilityState === "hidden") h();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("beforeunload", h);
      window.removeEventListener("pagehide", h);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [persist]);

  /* init / re-init when clip changes */
  useEffect(() => {
    if (!clip || offline || !ytReady) return;
    let mounted = true;
    const elId = `ytp-${clip.ytId}-${clip.start}`;

    const init = () => {
      const YT = window.YT;
      if (!mounted || !YT?.Player) return;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      readyRef.current = false;
      try {
        playerRef.current = new YT.Player(elId, {
          videoId: clip.ytId,
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            start: Math.max(0, Math.floor(clip.start)),
          },
          events: {
            onReady: (e: unknown) => {
              if (!mounted) return;
              readyRef.current = true;
              const p = (e as { target: YTPlayer }).target;
              try {
                /* start= above already positions the clip; only seek if it was ignored */
                const t = typeof p.getCurrentTime === "function" ? p.getCurrentTime() : 0;
                if (clip.start > 0 && Math.abs(t - clip.start) > 2) p.seekTo(clip.start, true);
                setDur(p.getDuration() || null);
                livePlayers.add(p);
                if (autoPlayRef.current) p.playVideo();
              } catch {}
              setError(null);
            },
            onError: (e: unknown) => {
              setError(`YouTube error ${(e as { data?: number })?.data ?? ""}`.trim());
            },
            onStateChange: (e: unknown) => {
              if (!mounted) return;
              const s = (e as { data: number }).data;
              if (s === 1) {
                pauseOthers();
                if (!intervalRef.current) intervalRef.current = setInterval(tick, 500);
              } else {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                persist();
              }
            },
          },
        });
        if (playerRef.current) livePlayers.add(playerRef.current);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    const t = setTimeout(init, 0);
    return () => {
      clearTimeout(t);
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current) {
        livePlayers.delete(playerRef.current);
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.ytId, clip?.start, offline, ytReady]);

  /* segment end handling + time updates */
  const tick = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const t = p.getCurrentTime();
      const c = clipsRef.current[idxRef.current];
      setTime(t);
      onTimeUpdateRef.current(idxRef.current, c && c.end > c.start ? Math.max(0, t - c.start) : t);
      const end = c && c.end > c.start ? c.end : null;
      if (end && t >= end - 0.15) {
        p.pauseVideo();
        persist();
        if (idxRef.current < clipsRef.current.length - 1) {
          setIdx((i) => i + 1);
        }
      }
    } catch {}
  }, [persist]);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  /* external seek */
  useEffect(() => {
    if (!seekTo || !readyRef.current || !playerRef.current) return;
    if (seekTo.clipIdx !== idx) {
      setIdx(seekTo.clipIdx);
      return;
    }
    const c = clips[idx];
    const abs = c && c.end > c.start ? c.start + seekTo.t : seekTo.t;
    try {
      pauseOthers();
      playerRef.current.seekTo(abs, true);
      playerRef.current.playVideo();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo?.seq]);

  /* jump to a clip */
  const goto = (i: number) => {
    if (i < 0 || i >= clips.length) return;
    setIdx(i);
    setTime(0);
  };

  if (!clip || offline) {
    return (
      <div className="w-full aspect-video rounded-[10px] border border-border/70 bg-surface flex flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-sm text-text">{offline ? "Video unavailable offline" : "No video available"}</span>
        <span className="text-xs text-text-faint">{offline ? "Progress is saved locally; PDFs and transcripts still work." : "This page has documents only."}</span>
      </div>
    );
  }

  const clipDur = clipEnd != null && dur ? Math.min(clipEnd, dur) - clip.start : null;
  const relT = clipEnd != null ? Math.max(0, Math.min(time, clipEnd) - clip.start) : time;
  const frac = clipDur ? relT / clipDur : 0;

  return (
    <div className="space-y-2.5 min-w-0">
      <div className="w-full aspect-video rounded-[10px] border border-border/70 overflow-hidden relative bg-surface">
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface p-4 text-center">
            <span className="text-sm text-text">Player error</span>
            <span className="text-xs text-text-faint">{error}</span>
          </div>
        )}
        <div id={`ytp-${clip.ytId}-${clip.start}`} className="w-full h-full" />
      </div>

      {/* clip-relative progress bar with bookmark pins */}
      <div className="relative h-[18px] group/bar">
        <div className="absolute top-1.5 left-0 right-0 h-1 bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full bg-accent/80 transition-all duration-200" style={{ width: `${frac * 100}%` }} />
        </div>
        {bookmarks.map((b) => (
          <button
            key={b.ts}
            type="button"
            title={`${b.label} @ ${fmtTime(b.ts)}`}
            onClick={() => onSeekRequest(idx, b.ts)}
            className="absolute top-0 w-3 h-3 -translate-x-1/2 flex items-center justify-center"
            style={{ left: `${Math.min(100, (b.ts / Math.max(1, clipDur ?? relT ?? 1)) * 100)}%` }}
            aria-label={`Bookmark at ${fmtTime(b.ts)}`}
          >
            <span className="w-1.5 h-2.5 rounded-[2px] bg-accent/80" />
          </button>
        ))}
      </div>

      {/* clip controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goto(idx - 1)}
            disabled={idx === 0}
            className="px-2.5 py-1.5 rounded-[5px] text-xs text-text-dim hover:text-text hover:bg-surface-2/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            ‹ Previous clip
          </button>
          <button
            type="button"
            onClick={() => goto(idx + 1)}
            disabled={idx >= clips.length - 1}
            className="px-2.5 py-1.5 rounded-[5px] text-xs text-text-dim hover:text-text hover:bg-surface-2/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            Next clip ›
          </button>
          <button
            type="button"
            onClick={() => {
              const t = clipEnd != null ? Math.max(0, relT) : time;
              onAddBookmark({ ts: Math.round(t), label: clip.title || `Clip ${idx + 1}` });
            }}
            className="px-2.5 py-1.5 rounded-[5px] text-xs text-text-faint hover:text-text hover:bg-surface-2/70 transition-colors"
            title="Pin this moment"
          >
            Pin moment
          </button>
        </div>
        <span className="font-mono text-[10px] text-text-faint">
          {idx + 1}/{clips.length} · {fmtTime(relT)}{clipDur != null ? ` / ${fmtTime(clipDur)}` : ""}
        </span>
      </div>

      {/* outline */}
      <ol className="space-y-px max-h-44 overflow-auto pr-1">
        {clips.map((c, i) => (
          <li key={`${c.ytId}:${c.start}`}>
            <button
              type="button"
              onClick={() => goto(i)}
              className={`w-full text-left px-2 py-1.5 rounded-[5px] text-xs transition-colors flex items-center gap-2 ${
                i === idx ? "bg-surface-2 text-text" : "text-text-dim hover:text-text hover:bg-surface-2/60"
              }`}
            >
              <span className="font-mono text-[10px] text-text-faint w-10 shrink-0">{i === idx ? fmtTime(relT) : `#${i + 1}`}</span>
              <span className="truncate">{clipLabel(c)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function clipLabel(c: Clip): string {
  const t = c.title.replace(/^Session \d+\s*(clip)?[:.]?\s*/i, "").replace(/^Clip:\s*/i, "").replace(/\s*\(\d+:\d+\)\s*$/, "");
  if (c.isRecitation) return /^recitation video$/i.test(t) || !t ? "Recitation" : `Recitation: ${t}`;
  return t + (c.end > c.start ? ` (${fmtTime(c.end - c.start)})` : "");
}
