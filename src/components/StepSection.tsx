"use client";

import type { ReactNode } from "react";

export interface StepMeta {
  id: string;
  label: string;
  meta?: string;
  done?: boolean;
}

/** One numbered part of a page, textbook style: numeral in the gutter, title, content. */
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
      <div className="flex gap-4 sm:gap-5">
        <span className="font-display text-lg leading-none text-text-faint w-5 shrink-0 pt-0.5" aria-hidden>
          {n}
        </span>
        <div className="flex-1 min-w-0">
          <header className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className="text-[15px] font-semibold text-text">{title}</h2>
            {done && (
              <span className="font-display text-sm text-text-faint" title="Done">
                ✓
              </span>
            )}
            {hint && <span className="text-[11px] text-text-faint">{hint}</span>}
          </header>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Quiet contents list for the page, with a completion line. */
export function StepNav({ items, className = "" }: { items: StepMeta[]; className?: string }) {
  const doneN = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneN / items.length) * 100) : 0;
  return (
    <nav className={`rounded-[10px] border border-border/70 bg-surface/70 p-4 ${className}`} aria-label="Contents">
      <h2 className="font-display text-base text-text">Contents</h2>
      <p className="text-xs text-text-dim mt-1.5">
        <span className="font-mono text-text">{doneN}</span>
        <span className="text-text-faint"> of </span>
        <span className="font-mono text-text">{items.length}</span>
        <span className="text-text-faint"> done</span>
      </p>
      <div className="mt-2">
        <div className="h-1 rounded-full overflow-hidden bg-surface-2">
          <div className="h-full bg-accent/80 transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ol className="mt-3 space-y-px">
        {items.map((it, i) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className="group flex items-baseline gap-2.5 -mx-2 px-2 py-1.5 rounded-[5px] text-xs hover:bg-surface-2/70 transition-colors">
              <span className={`font-mono text-[10px] w-3.5 shrink-0 ${it.done ? "text-text-faint" : "text-text-dim"}`}>{it.done ? "✓" : i + 1}</span>
              <span className={`flex-1 min-w-0 truncate ${it.done ? "text-text-faint" : "text-text-dim group-hover:text-text"} transition-colors`}>{it.label}</span>
              {it.meta && <span className="text-[10px] text-text-faint shrink-0">{it.meta}</span>}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Disclosure control used above a transcript. */
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
        className="inline-flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-[5px] text-xs text-text-dim hover:text-text hover:bg-surface-2/70 transition-colors"
      >
        <span className="font-display text-sm leading-none w-3 text-center" aria-hidden>
          {open ? "–" : "+"}
        </span>
        {open ? "Hide" : "Show"} {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
