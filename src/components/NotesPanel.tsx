"use client";

import { useEffect, useRef, useState } from "react";
import { newNote, useNoteDoc } from "@/lib/notes";
import { fmtTime } from "@/lib/search";
import { MathText } from "@/lib/math";
import type { NoteItem } from "@/lib/types";

interface NotesPanelProps {
  slug: string;
  /** current video time (segment-relative) or null when no video */
  currentTime: number | null;
  onSeek?: (t: number) => void;
}

export function NotesPanel({ slug, currentTime, onSeek }: NotesPanelProps) {
  const { doc, update } = useNoteDoc(slug);
  const [draft, setDraft] = useState("");
  const [pinNext, setPinNext] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const items = [...doc.items].sort((a, b) => (b.ts ?? Infinity) - (a.ts ?? Infinity) || b.updatedAt.localeCompare(a.updatedAt));

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const item = newNote(text, pinNext && currentTime != null ? Math.round(currentTime) : null);
    update([item, ...doc.items]);
    setDraft("");
    setPinNext(false);
  };

  const saveEdit = (id: string, text: string) => {
    update(doc.items.map((n) => (n.id === id ? { ...n, text, updatedAt: new Date().toISOString() } : n)));
    setEditing(null);
  };

  const remove = (id: string) => update(doc.items.filter((n) => n.id !== id));
  const unpin = (id: string) => update(doc.items.map((n) => (n.id === id ? { ...n, ts: null } : n)));

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-border/70 bg-surface p-3 h-[500px]">
      <div className="shrink-0 flex items-center justify-between gap-2">
        <span className="text-[11px] text-text-faint">
          <span className="font-mono">{doc.items.length}</span> {doc.items.length === 1 ? "note" : "notes"}
        </span>
        {currentTime != null ? (
          <button
            type="button"
            onClick={() => {
              setPinNext(!pinNext);
              taRef.current?.focus();
            }}
            className={`px-2 py-1 rounded-[5px] text-[11px] transition-colors ${
              pinNext ? "bg-surface-2 text-text" : "text-text-faint hover:text-text-dim"
            }`}
            title="Attach the next note to the current video time"
          >
            {pinNext ? `Pinned at ${fmtTime(currentTime)}` : "Pin to this moment"}
          </button>
        ) : null}
      </div>

      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            add();
          }
        }}
        rows={3}
        placeholder="Write a note. Ctrl+Enter to save; $x^2$ for math."
        className="shrink-0 bg-surface-2/70 border border-border/60 rounded-[6px] px-3 py-2 text-xs text-text placeholder:text-text-faint outline-none focus:border-text-faint transition-colors resize-y min-h-[64px]"
      />
      <button
        type="button"
        onClick={add}
        disabled={!draft.trim()}
        className="shrink-0 self-end px-3 py-1.5 rounded-[5px] text-xs text-text-dim border border-border hover:text-text hover:bg-surface-2/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        Add note
      </button>

      <div className="flex-1 overflow-auto pr-1 space-y-1.5 mt-1">
        {items.length === 0 ? (
          <p className="text-xs text-text-faint text-center pt-6">No notes yet for this page.</p>
        ) : (
          items.map((n: NoteItem) => (
            <div key={n.id} className="group bg-surface-2/70 rounded-[6px] px-2.5 py-2">
              {n.ts != null && (
                <button
                  type="button"
                  onClick={() => onSeek?.(n.ts!)}
                  className="mr-2 font-mono text-[10px] text-text-faint hover:text-text align-middle transition-colors"
                  title={`Jump to ${fmtTime(n.ts)}`}
                >
                  {fmtTime(n.ts)}
                </button>
              )}
              {editing === n.id ? (
                <textarea
                  defaultValue={n.text}
                  autoFocus
                  onBlur={(e) => saveEdit(n.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      saveEdit(n.id, (e.target as HTMLTextAreaElement).value);
                    }
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-full bg-transparent text-xs text-text outline-none resize-y"
                  rows={2}
                />
              ) : (
                <span
                  onClick={() => setEditing(n.id)}
                  className="text-xs text-text-dim leading-snug whitespace-pre-wrap cursor-text"
                  title="Click to edit"
                >
                  <MathText text={n.text} />
                </span>
              )}
              <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {n.ts != null && (
                  <button type="button" onClick={() => unpin(n.id)} className="text-[10px] text-text-faint hover:text-text-dim transition-colors">
                    unpin
                  </button>
                )}
                <button type="button" onClick={() => remove(n.id)} className="text-[10px] text-text-faint hover:text-red-400/90 transition-colors">
                  delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
