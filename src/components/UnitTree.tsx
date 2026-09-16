"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { course, flattenEntries, entryProgress } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import type { Entry } from "@/lib/types";

interface UnitTreeProps {
  collapsed?: boolean;
  onSelect?: () => void;
}

function shortEntryLabel(e: Entry): string {
  return e.kind === "session" ? e.title.replace(/^Session \d+:\s*/, "") : e.title;
}

export default function UnitTree({ collapsed = false, onSelect }: UnitTreeProps) {
  const pathname = usePathname();
  const progress = useProgress();
  const flat = flattenEntries();
  const index = new Map(flat.map((x) => [x.entry.slug, x.index + 1]));

  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (collapsed) {
    return (
      <nav aria-label="Course units" className="space-y-4">
        {course.units.map((unit, ui) => {
          const entries = unit.parts.flatMap((p) => p.entries);
          const doneCount = entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
          const pct = entries.length ? (doneCount / entries.length) * 100 : 0;
          return (
            <div key={unit.slug} className="flex flex-col items-center gap-1.5" title={`Unit ${ui + 1}: ${unit.shortTitle}`}>
              <span className="font-display text-sm text-text-dim leading-none">{ui + 1}</span>
              <div className="relative w-7 h-7">
                <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" className="stroke-border" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="14" fill="none" className="stroke-accent" strokeWidth="2.5" strokeDasharray={`${(pct / 100) * 88} ${88 - (pct / 100) * 88}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] text-text-faint">{doneCount}</span>
              </div>
              <div className="flex flex-col gap-px w-full">
                {entries.map((e) => {
                  const href = `/s/${e.slug}`;
                  const frac = entryProgress(e.slug, progress, e);
                  return (
                    <Link
                      key={e.slug}
                      href={href}
                      onClick={onSelect}
                      title={e.title}
                      className={"block w-full h-1 rounded-full transition-colors " + (pathname === href ? "bg-accent" : frac >= 1 ? "bg-accent/40" : "bg-border/70 hover:bg-text-faint/40")}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Course units" className="space-y-4">
      {course.units.map((unit, ui) => {
        const isOpen = open[unit.slug] ?? true;
        const entries = unit.parts.flatMap((p) => p.entries);
        const doneCount = entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
        return (
          <div key={unit.slug} className="space-y-1">
            <button
              onClick={() => setOpen((o) => ({ ...o, [unit.slug]: !isOpen }))}
              className="w-full flex items-baseline gap-2 px-2 py-1 text-left group"
              aria-expanded={isOpen}
            >
              <span className="font-display text-lg text-text-faint leading-none w-3 shrink-0">{ui + 1}</span>
              <span className="flex-1 min-w-0 text-xs font-semibold text-text-dim group-hover:text-text transition-colors truncate">{unit.shortTitle}</span>
              {doneCount > 0 && (
                <span className="font-mono text-[10px] text-text-faint shrink-0">
                  {doneCount}/{entries.length}
                </span>
              )}
            </button>
            {isOpen && (
              <ul className="space-y-px">
                {unit.parts.map((part) => {
                  if (part.entries.length === 1) {
                    const e = part.entries[0];
                    return (
                      <li key={part.slug}>
                        <EntryRow e={e} href={`/s/${e.slug}`} idx={index.get(e.slug)} frac={entryProgress(e.slug, progress, e)} active={pathname === `/s/${e.slug}`} onSelect={onSelect} />
                      </li>
                    );
                  }
                  const isPartOpen = open[part.slug] ?? true;
                  return (
                    <li key={part.slug}>
                      <button
                        onClick={() => setOpen((o) => ({ ...o, [part.slug]: !isPartOpen }))}
                        className="w-full flex items-baseline gap-2 pl-5 pr-2 py-1 text-left text-[11px] text-text-faint hover:text-text-dim transition-colors"
                        aria-expanded={isPartOpen}
                      >
                        <span className="flex-1 min-w-0 truncate">{part.shortTitle}</span>
                        <span className="font-display shrink-0" aria-hidden>{isPartOpen ? "–" : "+"}</span>
                      </button>
                      {isPartOpen && (
                        <ul className="space-y-px">
                          {part.entries.map((e) => (
                            <li key={e.slug}>
                              <EntryRow e={e} href={`/s/${e.slug}`} idx={index.get(e.slug)} frac={entryProgress(e.slug, progress, e)} active={pathname === `/s/${e.slug}`} onSelect={onSelect} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function EntryRow({ e, href, idx, frac, active, onSelect }: { e: Entry; href: string; idx?: number; frac: number; active: boolean; onSelect?: () => void }) {
  const done = frac >= 1;
  return (
    <Link
      href={href}
      onClick={onSelect}
      title={e.title}
      className={
        "flex items-baseline gap-2 pl-5 pr-2 py-1 rounded-[5px] text-xs transition-colors " +
        (active ? "bg-surface-2 text-text" : done ? "text-text-faint hover:text-text-dim" : "text-text-dim hover:text-text hover:bg-surface-2/60")
      }
    >
      <span className="font-mono text-[10px] text-text-faint w-5 shrink-0 pt-px">{idx}</span>
      <span className="flex-1 min-w-0 truncate leading-snug">{shortEntryLabel(e)}</span>
      {done && <span className="font-display text-[11px] text-text-faint shrink-0" aria-label="Completed">✓</span>}
    </Link>
  );
}
