"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { Bookmark, BookmarksMap } from "./types";

const KEY = "ocw1802.bookmarks.v1";
export const EVT = "ocw1802:bookmarks";

const isBrowser = () => typeof window !== "undefined";

export function loadBookmarks(): BookmarksMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BookmarksMap) : {};
  } catch {
    return {};
  }
}

function saveAll(map: BookmarksMap) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function getBookmarks(slug: string): Bookmark[] {
  return loadBookmarks()[slug] ?? [];
}

export function addBookmark(slug: string, bm: Bookmark) {
  const map = loadBookmarks();
  const list = map[slug] ?? [];
  list.push(bm);
  list.sort((a, b) => a.ts - b.ts);
  map[slug] = list;
  saveAll(map);
}

export function removeBookmark(slug: string, ts: number) {
  const map = loadBookmarks();
  map[slug] = (map[slug] ?? []).filter((b) => b.ts !== ts);
  if (map[slug].length === 0) delete map[slug];
  saveAll(map);
}

export function clearBookmarks() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useBookmarks(slug: string): Bookmark[] {
  const [map, setMap] = useState<BookmarksMap>({});
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setMap(loadBookmarks());
    const sync = () => setMap(loadBookmarks());
    window.addEventListener("storage", sync);
    window.addEventListener(EVT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVT, sync);
    };
  }, []);
  return map[slug] ?? [];
}
