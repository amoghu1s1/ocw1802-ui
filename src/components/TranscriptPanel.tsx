"use client";

import { useEffect, useRef, useState, useMemo, useDeferredValue } from "react";
import type { TranscriptLine } from "@/lib/types";
import { fmtTime } from "@/lib/search";
import { MathText } from "@/lib/math";

interface TranscriptPanelProps {
  lines: TranscriptLine[];
  currentTime?: number;
  onSeek?: (sec: number) => void;
}

function findActiveIndex(lines: TranscriptLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

const ROW = 28;
const OVERSCAN = 12;

export function TranscriptPanel({ lines, currentTime = 0, onSeek }: TranscriptPanelProps) {
  const [filter, setFilter] = useState("");
  const df = useDeferredValue(filter);
  const activeRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const active = lines.length ? findActiveIndex(lines, currentTime) : -1;

  const filtered = useMemo(() => {
    const q = df.trim().toLowerCase();
    return lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => !q || line.text.toLowerCase().includes(q));
  }, [lines, df]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const h = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", h, { passive: true });
    return () => el.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    if (df.trim() !== "") return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active, df]);

  if (!lines.length) {
    return (
      <div className="p-4 text-xs text-text-dim text-center border border-border bg-surface rounded-[8px]">
        No transcript available for this video.
      </div>
    );
  }

  const H = 460;
  const start = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN);
  const end = Math.min(filtered.length, Math.ceil((scrollTop + H) / ROW) + OVERSCAN);
  const visible = filtered.slice(start, end);
  const useVirtual = filtered.length > 80;

  return (
    <div className="flex flex-col h-[500px] bg-surface border border-border rounded-[8px] p-3">
      <div className="mb-2 shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search transcript…"
          className="flex-1 bg-surface-2 border border-border text-text placeholder:text-text-faint rounded-[6px] px-3 py-1.5 text-xs outline-none focus:border-text-dim transition-colors"
          aria-label="Filter transcript"
        />
        <span className="text-[10px] font-mono text-text-faint whitespace-nowrap">
          {filtered.length}/{lines.length}
        </span>
      </div>
      <div ref={boxRef} className="flex-1 overflow-auto pr-1" style={{ contain: "strict" }}>
        {filtered.length === 0 ? (
          <div className="text-xs text-text-faint p-4 text-center">No lines match your filter.</div>
        ) : useVirtual ? (
          <div style={{ height: filtered.length * ROW, position: "relative" }}>
            <div style={{ transform: `translateY(${start * ROW}px)` }}>
              {visible.map(({ line, i }) => (
                <TransRow key={`${line.t}-${i}`} line={line} active={i === active} onSeek={onSeek} refCb={i === active ? activeRef : undefined} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(({ line, i }) => (
              <TransRow key={`${line.t}-${i}`} line={line} active={i === active} onSeek={onSeek} refCb={i === active ? activeRef : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { forwardRef } from "react";

const TransRow = forwardRef<HTMLDivElement, { line: TranscriptLine; active: boolean; onSeek?: (t: number) => void; refCb?: React.Ref<HTMLDivElement> }>(function TransRow(
  { line, active, onSeek, refCb },
  _,
) {
  return (
    <div
      ref={refCb}
      onClick={() => onSeek?.(line.t)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeek?.(line.t);
        }
      }}
      className={`flex gap-3 px-2 py-1.5 rounded-[4px] cursor-pointer text-xs transition-colors min-h-[28px] items-start ${
        active ? "bg-accent-dim text-accent font-medium border-l-2 border-accent" : "text-text-dim hover:bg-surface-2 hover:text-text"
      }`}
      aria-current={active ? "true" : undefined}
    >
      <span className="font-mono text-text-faint shrink-0 w-12 pt-px">{fmtTime(line.t)}</span>
      <span className="flex-1 leading-snug">
        <MathText text={line.text} />
      </span>
    </div>
  );
});
