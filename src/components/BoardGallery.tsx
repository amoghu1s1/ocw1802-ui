"use client";

import { useEffect, useState } from "react";
import type { BoardImage } from "@/lib/types";

export function BoardGallery({ boards }: { boards: BoardImage[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open == null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => Math.min(boards.length - 1, (i ?? 0) + 1));
      if (e.key === "ArrowLeft") setOpen((i) => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, boards.length]);

  if (!boards.length) return null;

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-text-faint mb-2">Board Notes</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {boards.map((b, i) => (
          <button
            key={b.localPath}
            type="button"
            onClick={() => setOpen(i)}
            className="shrink-0 w-40 aspect-[16/10] bg-surface border border-border rounded-[6px] overflow-hidden hover:border-text-dim transition-colors"
            title={`Enlarge board ${i + 1}`}
            aria-label={`Enlarge board ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.localPath} alt={b.title} loading="lazy" className="w-full h-full object-cover object-top" />
          </button>
        ))}
      </div>

      {open != null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Board note viewer">
          <button type="button" onClick={() => setOpen(null)} className="absolute top-4 right-4 p-2 text-text-dim hover:text-text text-2xl" aria-label="Close">
            ×
          </button>
          {open > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open - 1);
              }}
              className="absolute left-4 p-3 text-text-dim hover:text-text text-3xl"
              aria-label="Previous board"
            >
              ‹
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={boards[open].localPath} alt={boards[open].title} className="max-h-full max-w-full object-contain rounded-[8px]" onClick={(e) => e.stopPropagation()} />
          {open < boards.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open + 1);
              }}
              className="absolute right-4 p-3 text-text-dim hover:text-text text-3xl"
              aria-label="Next board"
            >
              ›
            </button>
          )}
          <span className="absolute bottom-4 font-mono text-[10px] text-text-dim">
            {open + 1} / {boards.length}
          </span>
        </div>
      )}
    </div>
  );
}
