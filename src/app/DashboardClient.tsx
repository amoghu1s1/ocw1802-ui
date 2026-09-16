"use client";

import Link from "next/link";
import { course, overallProgress, getUpNext, getFirstIncomplete, entryProgress, entryClips, flattenEntries } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import ProgressBar from "@/components/ProgressBar";
import { SignaturePlot } from "@/components/SignaturePlot";
import CommandPalette from "@/components/CommandPalette";

function kindLabel(kind: string, nClips: number): string {
  if (kind === "problem-set") return "Problem set";
  if (kind === "exam") return "Exam";
  return nClips === 1 ? "Session, 1 clip" : `Session, ${nClips} clips`;
}

function ContinueRow() {
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
      className="block bg-surface border border-border/70 rounded-[10px] px-5 py-5 hover:bg-surface-2/70 hover:border-border transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs text-text-dim">Continue where you left off</p>
        <span className="font-mono text-[11px] text-text-faint">{Math.round(frac * 100)}%</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="font-display text-2xl text-text leading-tight truncate">
            {target.entry.number != null && <span className="text-text-faint mr-2">{target.entry.number}.</span>}
            {target.entry.title}
          </p>
          <p className="text-xs text-text-faint mt-1.5 truncate">
            Unit {course.units.indexOf(target.unit) + 1} · {target.part.shortTitle} · {kindLabel(target.entry.kind, entryClips(target.entry).length)}
          </p>
        </div>
        <span className="font-display text-xl text-text-faint group-hover:text-text transition-colors shrink-0" aria-hidden>
          ↗
        </span>
      </div>
      <ProgressBar value={frac * 100} className="mt-4" />
    </Link>
  );
}

function UpNext() {
  const progress = useProgress();
  const items = getUpNext(progress, 3);
  if (!items.length) return null;
  return (
    <section>
      <h2 className="font-display text-lg text-text mb-2">Next up</h2>
      <ul>
        {items.map(({ part, entry }, i) => (
          <li key={entry.slug}>
            <Link href={`/s/${entry.slug}`} className="group flex items-baseline gap-4 px-2 py-2.5 rounded-[6px] hover:bg-surface-2/60 transition-colors">
              <span className="font-mono text-[11px] text-text-faint w-4 shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-text-dim group-hover:text-text transition-colors truncate">
                  {entry.number != null && <span className="text-text-faint mr-1.5">{entry.number}.</span>}
                  {entry.title}
                </span>
                <span className="block text-[11px] text-text-faint mt-0.5 truncate">
                  {part.shortTitle} · {kindLabel(entry.kind, entryClips(entry).length)}
                </span>
              </span>
              <span className="font-display text-text-faint group-hover:text-text transition-colors shrink-0" aria-hidden>
                ↗
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UnitGrid() {
  const progress = useProgress();
  return (
    <section>
      <h2 className="font-display text-lg text-text mb-3">Course</h2>
      <div className="grid lg:grid-cols-2 gap-x-10 gap-y-8">
        {course.units.map((unit, ui) => {
          const entries = unit.parts.flatMap((p) => p.entries);
          const doneEntries = entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
          return (
            <div key={unit.slug}>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl text-text-faint leading-none w-5 shrink-0">{ui + 1}</span>
                <h3 className="flex-1 min-w-0 text-sm font-semibold text-text truncate">{unit.title.replace(/^\s*\d+\.\s*/, "")}</h3>
                <span className="font-mono text-[11px] text-text-faint shrink-0">
                  {doneEntries}/{entries.length}
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {unit.parts.map((part) => {
                  const frac = part.entries.reduce((a, e) => a + entryProgress(e.slug, progress, e), 0) / Math.max(1, part.entries.length);
                  const doneParts = part.entries.filter((e) => entryProgress(e.slug, progress, e) >= 1).length;
                  return (
                    <li key={part.slug} className="flex items-center gap-3 pl-8">
                      <span className="flex-1 min-w-0 text-xs text-text-dim truncate">{part.shortTitle}</span>
                      <span className="w-20 shrink-0">
                        <ProgressBar value={frac * 100} />
                      </span>
                      <span className="font-mono text-[10px] text-text-faint w-7 text-right shrink-0">{doneParts}/{part.entries.length}</span>
                    </li>
                  );
                })}
              </ul>
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
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-text">Multivariable Calculus</h1>
        <p className="text-sm text-text-dim mt-3">MIT 18.02SC · Fall 2010 · Prof. Denis Auroux</p>
        <p className="text-xs text-text-dim mt-5">
          <span className="font-mono text-text">{completed}</span>
          <span className="text-text-faint"> of </span>
          <span className="font-mono text-text">{total}</span>
          <span className="text-text-faint"> complete, {pct}% of the course</span>
        </p>
        <SignaturePlot className="mt-4 -mr-6" />
      </header>

      <ContinueRow />
      <UpNext />
      <UnitGrid />

      <CommandPalette />
    </div>
  );
}
