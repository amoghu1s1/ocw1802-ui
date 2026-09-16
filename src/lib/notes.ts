"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { NoteItem, NotesDoc, NotesMap } from "./types";

const KEY = "ocw1802.notes.v1";
export const EVT = "ocw1802:notes";

const isBrowser = () => typeof window !== "undefined";

export function loadNotes(): NotesMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NotesMap) : {};
  } catch {
    return {};
  }
}

function saveAll(map: NotesMap) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function loadDoc(slug: string): NotesDoc {
  return loadNotes()[slug] ?? { items: [], updatedAt: new Date().toISOString() };
}

/** Update one entry's note list. */
export function setDoc(slug: string, items: NoteItem[]) {
  const map = loadNotes();
  map[slug] = { items, updatedAt: new Date().toISOString() };
  saveAll(map);
}

export function clearNotes() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function getNotes(): NotesMap {
  return loadNotes();
}

/** Live notes map synced across components. */
export function useNotes(): NotesMap {
  const [map, setMap] = useState<NotesMap>({});
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setMap(loadNotes());
    const sync = () => setMap(loadNotes());
    window.addEventListener("storage", sync);
    window.addEventListener(EVT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVT, sync);
    };
  }, []);
  return map;
}

export function useNoteDoc(slug: string): { doc: NotesDoc; update: (items: NoteItem[]) => void } {
  const map = useNotes();
  const update = useCallback((items: NoteItem[]) => setDoc(slug, items), [slug]);
  return { doc: map[slug] ?? { items: [], updatedAt: "" }, update };
}

export function newNote(text = "", ts: number | null = null): NoteItem {
  return { id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ts, text, updatedAt: new Date().toISOString() };
}
