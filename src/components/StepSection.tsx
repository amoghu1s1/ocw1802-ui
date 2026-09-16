"use client";

import type { ReactNode } from "react";

export interface StepMeta {
  id: string;
  label: string;
  meta?: string;
  done?: boolean;
}

/** A numbered step in the session progression (OCW-style vertical flow). */
export function StepSection({
  id,
  n,
  title,
  hint,
  done = false,
  children,
}: {
  id: string;
  n: number;
  title: string;
  hint?: string;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="flex items-center gap-3">
        <span
          className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center font-mono text-[11px] transition-colors ${
            done ? "border-accent/50 bg-accent-dim text-accent" : "border-border bg-surface text-text-dim"
          }`}
        >
          {done ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            n
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-text tracking-tight leading-tight">{title}</h2>
          {hint && <p className="text-[10px] font-mono text-text-faint mt-0.5">{hint}</p>}
        </div>
      </header>
      <div className="ml-[13px] border-l border-border pl-4 pt-3 pb-7">{children}</div>
    </section>
  );
}

/** Sticky rail listing the steps of this page, with completion ticks. */
export function StepNav({ items, className = "" }: { items: StepMeta[]; className?: string }) {
  const doneN = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneN / items.length) * 100) : 0;
  return (
    <nav className={`bg-surface border border-border rounded-[8px] p-3 ${className}`} aria-label="Steps in this session">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-text-faint">In this session</h3>
        <span className="text-[10px] font-mono text-text-faint">
          {doneN}/{items.length} done
        </span>
      </div>
      <div className="h-1 bg-surface-2 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-accent/70 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className="space-y-0.5">
        {items.map((it, i) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs text-text-dim hover:text-text hover:bg-surface-2 transition-colors"
            >
              <span
                className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center text-[9px] font-mono ${
                  it.done ? "border-accent/50 text-accent" : "border-border text-text-faint"
                }`}
              >
                {it.done ? "✓" : i + 1}
              </span>
              <span className="truncate">{it.label}</span>
              {it.meta && <span className="ml-auto text-[10px] font-mono text-text-faint shrink-0">{it.meta}</span>}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Collapsible transcript block used under a video step. */
export function TranscriptToggle({
  open,
  onToggle,
  children,
  label = "transcript",
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`px-2.5 py-1.5 rounded-[6px] border text-xs transition-colors flex items-center gap-1.5 ${
          open ? "border-accent/40 text-accent bg-accent-dim" : "border-border text-text-dim hover:text-text hover:border-text-dim"
        }`}
      >
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? "Hide" : "Show"} {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
