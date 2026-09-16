"use client";

import Link from "next/link";
import { overallProgress } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import { useSidebar } from "@/lib/sidebar-context";
import ProgressBar from "./ProgressBar";
import UnitTree from "./UnitTree";
import ThemeSwitcher from "./ThemeSwitcher";
import DataMenu from "./DataMenu";

export default function Sidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const progress = useProgress();
  const { completed, total, pct } = overallProgress(progress);
  const { collapsed, toggle } = useSidebar();
  const eff = isMobile ? false : collapsed;

  return (
    <aside
      className={`h-screen bg-surface border-r border-border flex flex-col select-none ${
        isMobile ? "w-72" : `fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out ${eff ? "w-16" : "w-72"}`
      }`}
      aria-label="Course navigation"
    >
      {!isMobile && (
        <button
          type="button"
          onClick={toggle}
          className="absolute top-4 -right-3 z-40 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center hover:bg-surface-2 transition-colors cursor-pointer hidden lg:flex"
          aria-label={eff ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!eff}
        >
          <svg
            className={`w-3 h-3 text-text-dim transition-transform duration-300 ${eff ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div className={`border-b border-border/60 ${eff ? "p-3" : "p-5 pb-4"} flex items-center justify-between`}>
        <Link href="/" className="group block" onClick={onClose}>
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold text-text group-hover:text-white transition-colors tracking-tight ${eff ? "text-lg" : "text-xl"}`}>
              {eff ? "18" : "18.02SC"}
            </span>
            {!eff && <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-[4px] bg-accent-dim text-accent">OCW</span>}
          </div>
          {!eff && <p className="text-xs text-text-dim mt-0.5 font-medium">Multivariable Calculus · Fall 2010</p>}
        </Link>
        {isMobile && (
          <button type="button" onClick={onClose} className="p-2 -mr-1 text-text-dim hover:text-text" aria-label="Close navigation">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress */}
      {!eff && (
        <div className="px-5 py-4 border-b border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-dim font-medium">Overall Progress</span>
            <span className="font-mono text-text font-semibold">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
          <div className="text-[11px] font-mono text-text-faint flex justify-between pt-0.5">
            <span>
              {completed} of {total} completed
            </span>
            <Link href="/" className="hover:text-text-dim underline-offset-2 hover:underline">
              View
            </Link>
          </div>
        </div>
      )}
      {eff && (
        <div className="px-3 py-3 border-b border-border/60 flex justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center relative" aria-label={`${pct}% complete`}>
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" className="stroke-border" strokeWidth="2" />
              <circle cx="18" cy="18" r="15" fill="none" className="stroke-accent" strokeWidth="2" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
            </svg>
            <span className="absolute text-[9px] font-mono font-bold text-text">{pct}</span>
          </div>
        </div>
      )}

      {/* Tree */}
      <div className={`flex-1 overflow-y-auto ${eff ? "p-2" : "p-4 space-y-4"}`}>
        <UnitTree collapsed={eff} onSelect={onClose} />
      </div>

      {/* Footer */}
      <div className={`border-t border-border/60 ${eff ? "p-3 flex flex-col items-center gap-3" : "p-4 space-y-3"}`}>
        {!eff && (
          <div className="text-[11px] text-text-faint">
            <p className="font-medium text-text-dim">MIT OpenCourseWare</p>
            <p>Prof. Denis Auroux</p>
          </div>
        )}
        <div className={`flex items-center gap-2 ${eff ? "flex-col" : "justify-between"}`}>
          <ThemeSwitcher />
          <DataMenu />
        </div>
        {!eff && (
          <p className="text-[10px] leading-relaxed text-text-faint">
            Unofficial interface. Content: MIT OCW 18.02SC (CC BY-NC-SA).{" "}
            <a href="https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-dim">
              Source
            </a>
          </p>
        )}
      </div>
    </aside>
  );
}
