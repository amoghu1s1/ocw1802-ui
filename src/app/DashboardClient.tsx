"use client";

import Link from "next/link";
import { course, overallProgress, getUpNext, getFirstIncomplete, entryProgress, flattenEntries } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import ProgressBar from "@/components/ProgressBar";
import CommandPalette from "@/components/CommandPalette";

function ContinueCard() {
  const progress = useProgress();
  const flat = flattenEntries();
  const recent = flat.filter((x) => {
    const p = progress[x.entry.slug];
    return p && !p.completedAt && (Object.keys(p.clips).length > 0 || Object.keys(p.quiz).length > 0);
  });
  const target = recent[0] ?? getFirstIncomplete(progress);
  if (!target) return null;
  const frac = entryProgress(target.entry.slug, progress, target.entry);
  return (
    <Link
      href={`/s/${target.entry.slug}`}
      className="block bg-surface border border-border rounded-[8px] p-5 hover:border-text-dim transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">Continue</span>
        <span className="text-[10px] font-mono text-text-faint">
          Unit {course.units.indexOf(target.unit) + 1} · {target.part.shortTitle}
        </span>
      </div>
      <h2 className="text-lg font-bold text-text group-hover:text-white transition-colors">
        {target.entry.number != null && <span className="font-mono text-accent mr-2">{target.entry.number}.</span>}
        {target.entry.title}
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={frac * 100} className="flex-1" />
        <span className="text-[10px] font-mono text-text-faint">{Math.round(frac * 100)}%</span>
      </div>
    </Link>
  );
}

function UpNext() {
  const progress = useProgress();
  const items = getUpNext(progress, 3);
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-text-faint">Up Next</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {items.map(({ part, entry }) => (
          <Link
            key={entry.slug}
            href={`/s/${entry.slug}`}
            className="bg-surface border border-border rounded-[8px] p-4 hover:border-text-dim transition-colors group flex flex-col gap-1"
          >
            <span className="text-[10px] font-mono text-text-faint truncate">{part.shortTitle}</span>
            <span className="text-xs font-medium text-text group-hover:text-white line-clamp-2 leading-snug">
              {entry.number != null && <span className="font-mono text-accent mr-1.5">{entry.number}.</span>}
              {entry.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function UnitGrid() {
  const progress = useProgress();
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-text-faint">Units</h3>
      <div className="grid md:grid-cols-2 gap-3">
        {course.units.map((unit, ui) => {
          const entries = unit.parts.flatMap((p) => p.entries);
          const done = entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
          const pct = entries.length ? Math.round((done / entries.length) * 100) : 0;
          return (
            <div key={unit.slug} className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-text">
                  <span className="font-mono text-accent mr-2">{ui + 1}.</span>
                  {unit.title.replace(/^\s*\d+\.\s*/, "")}
                </h4>
                <span className="text-[10px] font-mono text-text-faint shrink-0">{done}/{entries.length}</span>
              </div>
              <ProgressBar value={pct} />
              <div className="space-y-1.5">
                {unit.parts.map((part) => (
                  <div key={part.slug} className="flex items-center justify-between text-xs">
                    <span className="text-text-dim truncate pr-2">{part.shortTitle}</span>
                    <div className="flex-1 max-w-[120px]">
                      <ProgressBar
                        value={
                          100 *
                          (part.entries.reduce((a, e) => a + entryProgress(e.slug, progress, e), 0) / Math.max(1, part.entries.length))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const progress = useProgress();
  const { completed, total, pct } = overallProgress(progress);
  return (
    <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Multivariable Calculus</h1>
          <p className="text-xs text-text-dim mt-1 font-mono">18.02SC · Fall 2010 · Prof. Denis Auroux</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-accent">{pct}%</div>
          <p className="text-[10px] text-text-faint font-mono">{completed} / {total} completed</p>
        </div>
      </header>

      <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <ContinueCard />
      <UpNext />
      <UnitGrid />

      <CommandPalette />
    </div>
  );
}
