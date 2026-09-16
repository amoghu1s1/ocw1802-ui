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

function shortEntryTitle(e: Entry): string {
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
      <nav aria-label="Course units" className="space-y-3">
        {course.units.map((unit, ui) => {
          const entries = unit.parts.flatMap((p) => p.entries);
          const doneCount = entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
          const pct = entries.length ? (doneCount / entries.length) * 100 : 0;
          return (
            <div key={unit.slug} className="flex flex-col items-center gap-1" title={`Unit ${ui + 1}: ${unit.shortTitle}`}>
              <span className="text-[10px] font-mono font-bold text-text-dim">{ui + 1}</span>
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" className="stroke-border" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" className="stroke-accent" strokeWidth="3" strokeDasharray={`${(pct / 100) * 88} ${88 - (pct / 100) * 88}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono text-text-faint">{doneCount}</span>
              </div>
              <div className="flex flex-col gap-px w-full">
                {entries.map((e) => {
                  const href = `/s/${e.slug}`;
                  const done = entryProgress(e.slug, progress, e) >= 1;
                  return (
                    <Link
                      key={e.slug}
                      href={href}
                      onClick={onSelect}
                      title={e.title}
                      className={"block w-full h-1 rounded-full transition-colors " + (pathname === href ? "bg-accent" : done ? "bg-accent/50" : "bg-border/80 hover:bg-text-faint/50")}
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
    <nav aria-label="Course units" className="space-y-3">
      {course.units.map((unit, ui) => {
        const isOpen = open[unit.slug] ?? true;
        const entries = unit.parts.flatMap((p) => p.entries);
        const doneCount = entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
        return (
          <div key={unit.slug} className="space-y-1">
            <button
              onClick={() => setOpen((o) => ({ ...o, [unit.slug]: !o[unit.slug] }))}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-text-dim hover:text-text hover:bg-surface-2 rounded-[6px] transition-colors text-left group"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-1.5 truncate pr-2">
                <svg className={"w-3.5 h-3.5 shrink-0 transition-transform " + (isOpen ? "rotate-90" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="truncate">Unit {ui + 1}: {unit.shortTitle}</span>
              </div>
              <span className="text-[10px] font-mono text-text-faint shrink-0">{doneCount}/{entries.length}</span>
            </button>
            {isOpen && (
              <ul className="pl-3.5 space-y-0.5 border-l border-border/60 ml-2.5">
                {unit.parts.map((part) => {
                  // single-entry parts render flat
                  if (part.entries.length === 1) {
                    const e = part.entries[0];
                    const href = `/s/${e.slug}`;
                    const frac = entryProgress(e.slug, progress, e);
                    return (
                      <li key={part.slug}>
                        <Link
                          href={href}
                          onClick={onSelect}
                          className={"flex items-start justify-between gap-2 px-2 py-1.5 rounded-[6px] text-xs transition-colors group " + (pathname === href ? "bg-accent-dim text-text font-medium" : "text-text-dim hover:text-text hover:bg-surface-2")}
                        >
                          <span className="line-clamp-2 leading-tight flex items-start gap-1.5">
                            {e.number != null && <span className="font-mono text-text-faint mt-px">{index.get(e.slug)}.</span>}
                            {shortEntryLabel(e)}
                          </span>
                          <StatusDot frac={frac} />
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li key={part.slug} className="pt-1">
                      <button
                        onClick={() => setOpen((o) => ({ ...o, [part.slug]: !(o[part.slug] ?? true) }))}
                        className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-medium text-text-dim hover:text-text transition-colors text-left"
                        aria-expanded={partOpen(part.slug, open)}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <svg className={"w-3 h-3 shrink-0 transition-transform " + (partOpen(part.slug, open) ? "rotate-90" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          {part.shortTitle}
                        </span>
                      </button>
                      {partOpen(part.slug, open) && (
                        <ul className="ml-2.5 pl-2 border-l border-border/50 space-y-0.5">
                          {part.entries.map((e) => {
                            const href = `/s/${e.slug}`;
                            const frac = entryProgress(e.slug, progress, e);
                            return (
                              <li key={e.slug}>
                                <Link
                                  href={href}
                                  onClick={onSelect}
                                  className={"flex items-start justify-between gap-2 px-2 py-1.5 rounded-[6px] text-xs transition-colors group " + (pathname === href ? "bg-accent-dim text-text font-medium" : "text-text-dim hover:text-text hover:bg-surface-2")}
                                >
                                  <span className="line-clamp-2 leading-tight flex items-start gap-1.5">
                                    {e.number != null && <span className="font-mono text-text-faint mt-px">{index.get(e.slug)}.</span>}
                                    {shortEntryLabel(e)}
                                  </span>
                                  <StatusDot frac={frac} />
                                </Link>
                              </li>
                            );
                          })}
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

function shortEntryLabel(e: { kind: string; title: string; number: number | null }): string {
  if (e.kind === "session") return e.title.replace(/^Session \d+:\s*/, "");
  return e.title;
}

function partOpen(slug: string, open: Record<string, boolean>): boolean {
  return open[slug] ?? true;
}

function StatusDot({ frac }: { frac: number }) {
  if (frac >= 1)
    return (
      <svg className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  if (frac > 0) return <div className="w-3.5 h-3.5 rounded-full border border-accent/70 bg-accent/30 shrink-0 mt-0.5" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-text-faint/40 group-hover:border-text-dim shrink-0 mt-0.5" />;
}
