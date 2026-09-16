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
    <div className="flex flex-col gap-2 bg-surface border border-border rounded-[8px] p-3 h-[500px]">
      <div className="shrink-0 flex items-center gap-2">
        {currentTime != null ? (
          <button
            type="button"
            onClick={() => {
              setPinNext(!pinNext);
              taRef.current?.focus();
            }}
            className={`px-2 py-1 rounded-[6px] border text-[10px] font-mono transition-colors ${
              pinNext ? "border-amber-500/50 text-amber-300 bg-amber-500/10" : "border-border text-text-faint hover:text-text-dim"
            }`}
            title="Attach next note to the current video time"
          >
            {pinNext ? `⏱ ${fmtTime(currentTime)}` : "⏱ pin time"}
          </button>
        ) : null}
        <span className="text-[10px] font-mono text-text-faint ml-auto">{doc.items.length} notes</span>
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
        placeholder="Write a note… (⌘/Ctrl+Enter to save; use $x^2$ for math)"
        className="shrink-0 bg-surface-2 border border-border rounded-[6px] px-3 py-2 text-xs text-text placeholder:text-text-faint outline-none focus:border-text-dim resize-y min-h-[64px]"
      />
      <button
        type="button"
        onClick={add}
        disabled={!draft.trim()}
        className="shrink-0 self-end px-3 py-1.5 rounded-[6px] text-xs font-medium bg-accent-dim text-accent border border-accent/40 hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        Add note
      </button>

      <div className="flex-1 overflow-auto pr-1 space-y-1.5 mt-1">
        {items.length === 0 ? (
          <p className="text-xs text-text-faint text-center pt-6">No notes yet for this page.</p>
        ) : (
          items.map((n: NoteItem) => (
            <div key={n.id} className="group bg-surface-2 border border-border rounded-[6px] px-2.5 py-2">
              {n.ts != null && (
                <button
                  type="button"
                  onClick={() => onSeek?.(n.ts!)}
                  className="mr-2 font-mono text-[10px] text-amber-300/90 hover:text-amber-300 align-middle"
                  title="Jump to this moment"
                >
                  ⏱ {fmtTime(n.ts)}
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
              <div className="flex gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {n.ts != null && (
                  <button type="button" onClick={() => unpin(n.id)} className="text-[10px] text-text-faint hover:text-text-dim">
                    unpin
                  </button>
                )}
                <button type="button" onClick={() => remove(n.id)} className="text-[10px] text-text-faint hover:text-red-400">
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
