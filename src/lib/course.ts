import courseData from "@/data/course.json";
import type { Course, Entry, Part, ProgressMap, Unit } from "./types";

export const course = courseData as unknown as Course;

export interface FlatEntry {
  unit: Unit;
  part: Part;
  entry: Entry;
  index: number; // course order
}

/** Flatten all entries in course order (unit 1 → end). */
export function flattenEntries(c: Course = course): FlatEntry[] {
  const out: FlatEntry[] = [];
  let index = 0;
  for (const unit of c.units) {
    for (const part of unit.parts) {
      for (const entry of part.entries) {
        out.push({ unit, part, entry, index: index++ });
      }
    }
  }
  return out;
}

export function getEntry(slug: string, c: Course = course): FlatEntry | null {
  return flattenEntries(c).find((x) => x.entry.slug === slug) ?? null;
}

export function getAdjacent(slug: string, c: Course = course): { prev: Entry | null; next: Entry | null } {
  const flat = flattenEntries(c);
  const i = flat.findIndex((x) => x.entry.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? flat[i - 1].entry : null,
    next: i < flat.length - 1 ? flat[i + 1].entry : null,
  };
}

/** True when an entry has at least one video segment. */
export function hasVideo(e: Entry): boolean {
  return e.clips.length > 0 || !!e.recitation;
}

/** All video segments of an entry in play order (clips then recitation). */
export function entryClips(e: Entry) {
  const clips = e.clips.map((c) => ({ ...c }));
  if (e.recitation) clips.push({ ...e.recitation, isRecitation: true });
  return clips;
}

export function clipKey(c: { ytId: string; start: number }): string {
  return `${c.ytId}:${c.start}`;
}

/** An entry is complete if marked, or every segment is ≥95% watched. */
export function isEntryComplete(slug: string, progress: ProgressMap, e?: Entry): boolean {
  const p = progress[slug];
  if (!p) return false;
  if (p.completedAt) return true;
  if (!e) return false;
  const clips = entryClips(e);
  if (clips.length === 0) return false;
  return clips.every((c) => {
    const cp = p.clips[clipKey(c)];
    return cp?.dur && cp.dur > 0 && cp.pos / cp.dur >= 0.95;
  });
}

/** Fraction 0..1 of segments watched (for progress bars). */
export function entryProgress(slug: string, progress: ProgressMap, e: Entry): number {
  const p = progress[slug];
  if (p?.completedAt) return 1;
  const clips = entryClips(e);
  if (clips.length === 0) return p ? 1 : 0; // pdf-only entries: visited = done via mark
  const done = clips.filter((c) => {
    const cp = p?.clips[clipKey(c)];
    return cp?.dur && cp.dur > 0 && cp.pos / cp.dur >= 0.95;
  }).length;
  return done / clips.length;
}

/** The most recently touched incomplete entry (for the Continue card). */
export function getMostRecent(progress: ProgressMap, c: Course = course): FlatEntry | null {
  let best: FlatEntry | null = null;
  let bestTs = "";
  for (const fe of flattenEntries(c)) {
    const p = progress[fe.entry.slug];
    if (!p || p.completedAt) continue;
    const ts = p.touchedAt ?? "";
    if (ts > bestTs) {
      bestTs = ts;
      best = fe;
    }
  }
  return best;
}

/** First N incomplete entries after the most-recent one (leading with it). */
export function getUpNext(progress: ProgressMap, n = 3, c: Course = course): FlatEntry[] {
  const flat = flattenEntries(c);
  const recent = getMostRecent(progress, c);
  const startIdx = recent ? flat.findIndex((x) => x.entry.slug === recent.entry.slug) : -1;
  const result: FlatEntry[] = [];
  if (recent && !isEntryComplete(recent.entry.slug, progress, recent.entry)) result.push(recent);
  for (let i = startIdx + 1; i < flat.length && result.length < n; i++) {
    if (!isEntryComplete(flat[i].entry.slug, progress, flat[i].entry)) result.push(flat[i]);
  }
  for (let i = 0; i < flat.length && result.length < n; i++) {
    if (result.some((r) => r.entry.slug === flat[i].entry.slug)) continue;
    if (!isEntryComplete(flat[i].entry.slug, progress, flat[i].entry)) result.push(flat[i]);
  }
  return result.slice(0, n);
}

export function getFirstIncomplete(progress: ProgressMap, c: Course = course): FlatEntry | null {
  return flattenEntries(c).find((x) => !isEntryComplete(x.entry.slug, progress, x.entry)) ?? null;
}

/** Sidebar-wide completion stats. */
export function overallProgress(progress: ProgressMap, c: Course = course) {
  const flat = flattenEntries(c);
  const completed = flat.filter((x) => isEntryComplete(x.entry.slug, progress, x.entry)).length;
  return { completed, total: flat.length, pct: flat.length ? Math.round((completed / flat.length) * 100) : 0 };
}
