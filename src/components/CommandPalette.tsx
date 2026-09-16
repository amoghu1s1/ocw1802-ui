"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildSearchIndex, searchResults, fmtTime, type SearchResult } from "@/lib/search";
import { useNotes } from "@/lib/notes";
import { course, flattenEntries } from "@/lib/course";

interface Hit {
  label: string;
  sub: string;
  href: string;
  kind: string;
  t?: number;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const notes = useNotes();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const results = useMemo((): SearchResult[] => {
    if (!open) return [];
    const index = buildSearchIndex();
    const hits = q.trim() ? searchResults(index, q, 7) : [];
    return hits;
  }, [q, open]);

  const noteHits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    const out: { label: string; href: string; snippet: string }[] = [];
    const flat = new Map(flattenEntries().map((x) => [x.entry.slug, x.entry.title]));
    for (const [slug, doc] of Object.entries(notes)) {
      for (const n of doc.items) {
        if (n.text.toLowerCase().includes(query)) {
          out.push({ label: n.text.slice(0, 60), href: `/s/${slug}`, snippet: flat.get(slug) ?? slug });
          if (out.length >= 4) return out;
        }
      }
    }
    return out;
  }, [q, notes, open]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const actions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [{ label: "Dashboard", sub: "Go to course overview", href: "/", kind: "nav" }];
    const flat = flattenEntries();
    return flat
      .filter((x) => x.entry.title.toLowerCase().includes(query) || x.part.title.toLowerCase().includes(query))
      .slice(0, 5)
      .map((x) => ({ label: x.entry.title, sub: x.part.shortTitle, href: `/s/${x.entry.slug}`, kind: "nav" }));
  }, [q, open]);

  const items = [
    ...actions,
    ...results.map((r) => ({
      label: r.display,
      sub: r.kind === "transcript" ? `${r.title}${r.t != null ? ` · ${fmtTime(r.t)}` : ""}` : r.parent,
      href: r.t != null ? `/s/${r.slug}?c=${r.clipIdx ?? 0}&t=${Math.round(r.t)}` : `/s/${r.slug}`,
      kind: r.kind,
    })),
    ...noteHits.map((n) => ({ label: n.label, sub: "your note", href: n.href, kind: "note" })),
  ];

  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl bg-surface-2 border border-border rounded-[10px] shadow-palette overflow-hidden">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(items.length - 1, s + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            }
            if (e.key === "Enter" && items[sel]) {
              e.preventDefault();
              go(items[sel].href);
            }
          }}
          placeholder="Search sessions, transcripts, notes…"
          className="w-full bg-transparent px-4 py-3.5 text-sm text-text placeholder:text-text-faint outline-none border-b border-border"
        />
        <ul className="max-h-[380px] overflow-auto py-1">
          {items.length === 0 && <li className="px-4 py-3 text-xs text-text-faint">No matches.</li>}
          {items.map((it, i) => (
            <li key={`${it.href}-${i}`}>
              <button
                type="button"
                onClick={() => go(it.href)}
                onMouseEnter={() => setSel(i)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${i === sel ? "bg-surface text-text" : "text-text-dim"}`}
              >
                <span
                  className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-[4px] shrink-0 ${
                    it.kind === "transcript" ? "bg-accent-dim text-accent" : it.kind === "note" ? "bg-amber-500/15 text-amber-300" : "bg-border/60 text-text-faint"
                  }`}
                >
                  {it.kind === "transcript" ? "quote" : it.kind === "note" ? "note" : "go"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium truncate">{it.label}</span>
                  <span className="block text-[10px] text-text-faint truncate">{it.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 py-2 border-t border-border flex gap-3 text-[10px] font-mono text-text-faint">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
