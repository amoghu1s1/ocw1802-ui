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
        alert("Import successful. Reloading.");
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
        className="px-2 py-1 rounded-[5px] text-[11px] text-text-faint hover:text-text-dim hover:bg-surface-2/60 transition-colors"
        aria-label="Data and backup"
        title="Export or import your data"
      >
        Data
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-[8px] border border-border/70 bg-surface shadow-palette overflow-hidden z-50 p-1.5">
          <button onClick={handleExport} className="w-full text-left px-2.5 py-1.5 text-xs rounded-[5px] text-text-dim hover:text-text hover:bg-surface-2/70 transition-colors">
            Export backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="w-full text-left px-2.5 py-1.5 text-xs rounded-[5px] text-text-dim hover:text-text hover:bg-surface-2/70 transition-colors">
            Import backup
          </button>
          <button onClick={handleClear} className="w-full text-left px-2.5 py-1.5 text-xs rounded-[5px] text-red-400/90 hover:text-red-400 hover:bg-surface-2/70 transition-colors">
            Clear all data
          </button>
          <p className="px-2.5 py-1 text-[10px] text-text-faint">
            <span className="font-mono">{Object.keys(progress).length}</span> entries tracked
          </p>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}
