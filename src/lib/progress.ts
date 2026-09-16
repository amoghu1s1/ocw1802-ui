"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { ProgressMap, ProgressEntry } from "./types";

export const PROGRESS_KEY = "ocw1802.progress.v1";
export const EVT = "ocw1802:progress";

const isBrowser = () => typeof window !== "undefined";

export function loadProgress(): ProgressMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function saveProgress(map: ProgressMap) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* quota errors ignored */
  }
}

export function blankEntry(): ProgressEntry {
  return { completedAt: null, clips: {}, quiz: {} };
}

function touch(map: ProgressMap, slug: string): ProgressEntry {
  return map[slug] ?? (map[slug] = blankEntry());
}

/** Save a clip position (and duration when known). */
export function updateClipPos(slug: string, key: string, pos: number, dur: number | null) {
  const map = loadProgress();
  const e = map[slug] ?? blankEntry();
  const prev = e.clips[key] ?? { pos: 0, dur: null };
  const max = dur ?? prev.dur ?? Infinity;
  e.clips[key] = { pos: Math.min(Math.max(0, pos), Math.max(0, max - 5)), dur: dur ?? prev.dur };
  e.touchedAt = new Date().toISOString();
  map[slug] = e;
  saveProgress(map);
}

export function getClipPos(map: ProgressMap, slug: string, key: string) {
  return map[slug]?.clips[key];
}

export function setCompleted(slug: string, completed: boolean) {
  const map = loadProgress();
  const e = map[slug] ?? blankEntry();
  e.completedAt = completed ? e.completedAt || new Date().toISOString() : null;
  map[slug] = e;
  saveProgress(map);
}

export function setQuizResult(slug: string, problemId: string, result: "correct" | "wrong" | "self-correct" | "self-wrong") {
  const map = loadProgress();
  const e = map[slug] ?? blankEntry();
  e.quiz[problemId] = result;
  e.touchedAt = new Date().toISOString();
  map[slug] = e;
  saveProgress(map);
}

export function clearProgress() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PROGRESS_KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Live progress map that syncs across tabs + in-app writes. */
export function useProgress(): ProgressMap {
  const [map, setMap] = useState<ProgressMap>({});
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setMap(loadProgress());
    const sync = () => setMap(loadProgress());
    window.addEventListener("storage", sync);
    window.addEventListener(EVT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVT, sync);
    };
  }, []);

  return map;
}
