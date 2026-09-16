"use client";

import { useRef, useState } from "react";
import { useProgress, loadProgress, saveProgress, clearProgress } from "@/lib/progress";
import { clearBookmarks } from "@/lib/bookmarks";
import { clearNotes } from "@/lib/notes";

const BM_KEY = "ocw1802.bookmarks.v1";
const NOTES_KEY = "ocw1802.notes.v1";

export default function DataMenu() {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const progress = useProgress();

  const handleExport = () => {
    const data = {
      progress: loadProgress(),
      bookmarks: JSON.parse(localStorage.getItem(BM_KEY) ?? "{}"),
      notes: JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}"),
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocw-18.02sc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.progress) saveProgress(data.progress);
        if (data.bookmarks) localStorage.setItem(BM_KEY, JSON.stringify(data.bookmarks));
        if (data.notes) localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
        window.dispatchEvent(new CustomEvent("ocw1802:progress"));
        window.dispatchEvent(new CustomEvent("ocw1802:bookmarks"));
        window.dispatchEvent(new CustomEvent("ocw1802:notes"));
        alert("Import successful — reloading");
        window.location.reload();
      } catch (err) {
        alert("Invalid backup file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = () => {
    if (!confirm("Clear all progress, bookmarks, and notes? This cannot be undone.")) return;
    clearProgress();
    clearBookmarks();
    clearNotes();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-[4px] border border-border hover:border-text-dim flex items-center justify-center text-text-faint hover:text-text transition-colors"
        aria-label="Data & backup"
        title="Export / import data"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-surface-2 border border-border rounded-[8px] shadow-palette overflow-hidden z-50">
          <div className="p-1 space-y-1">
            <button onClick={handleExport} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface rounded-[6px] text-text">
              ⬇ Export backup
            </button>
            <button onClick={() => fileRef.current?.click()} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface rounded-[6px] text-text">
              ⬆ Import backup
            </button>
            <div className="h-px bg-border my-1" />
            <button onClick={handleClear} className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-950/40 rounded-[6px] text-red-400">
              Clear all data
            </button>
            <p className="px-3 py-1 text-[10px] text-text-faint">{Object.keys(progress).length} entries tracked</p>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}
