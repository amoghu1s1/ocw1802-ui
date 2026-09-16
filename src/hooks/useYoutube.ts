"use client";

import { useEffect, useState } from "react";

let apiPromise: Promise<typeof window.YT> | null = null;

function loadApi(): Promise<typeof window.YT> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("youtube-iframe-api") as HTMLScriptElement | null;
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("Failed to load YouTube iframe API"));
      document.body.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YT not available"));
    };
    setTimeout(() => {
      if (window.YT?.Player) resolve(window.YT);
    }, 3000);
  });

  return apiPromise;
}

export function useYoutube(ytId: string | null, enabled: boolean) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ytId || !enabled) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    loadApi()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ytId, enabled]);

  return { ready, error };
}
