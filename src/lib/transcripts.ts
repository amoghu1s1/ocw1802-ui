"use client";

import type { TranscriptLine } from "@/lib/types";
import { allTranscripts } from "./search";

const cache = new Map<string, TranscriptLine[]>();

/** Full-video transcript lines for a ytId. */
export function fullLines(ytId: string): TranscriptLine[] {
  return allTranscripts[ytId] ?? [];
}

/** Transcript lines for a clip segment, times rebased to 0. */
export function clipLines(clip: { ytId: string; start: number; end: number }): TranscriptLine[] {
  const key = `${clip.ytId}:${clip.start}:${clip.end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const lines = fullLines(clip.ytId);
  const seg = clip.end > clip.start ? lines.filter((l) => l.t >= clip.start && l.t < clip.end) : lines;
  const out = seg.map((l) => ({ t: l.t - clip.start, text: l.text }));
  cache.set(key, out);
  return out;
}

/** True when the video has captions we could use. */
export function hasTranscript(ytId: string): boolean {
  return Boolean(allTranscripts[ytId]);
}
