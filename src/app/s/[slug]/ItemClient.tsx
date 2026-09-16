"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { course, entryProgress, getAdjacent, getEntry, isEntryComplete } from "@/lib/course";
import { addBookmark, removeBookmark, useBookmarks } from "@/lib/bookmarks";
import { setCompleted, useProgress } from "@/lib/progress";
import { clipLines, hasTranscript } from "@/lib/transcripts";
import { getQuiz } from "@/lib/quiz";
import { YouTubePlaylist } from "@/components/YouTubePlaylist";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { PdfViewer } from "@/components/PdfViewer";
import { BoardGallery } from "@/components/BoardGallery";
import { NotesPanel } from "@/components/NotesPanel";
import { QuizPanel } from "@/components/QuizPanel";
import CommandPalette from "@/components/CommandPalette";
import type { Bookmark, Clip, PdfRef, Quiz } from "@/lib/types";

type Tab = "transcript" | "pdfs" | "problems" | "notes";

export default function ItemClient({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const progress = useProgress();
  const data = getEntry(slug);
  const { prev, next } = getAdjacent(slug);
  const bookmarks = useBookmarks(slug);
  const quiz = useMemo(() => getQuiz(slug), [slug]);

  const [pos, setPos] = useState({ clipIdx: 0, t: 0 });
  const [seek, setSeek] = useState<{ clipIdx: number; t: number; seq: number } | null>(null);
  const [tab, setTab] = useState<Tab>("transcript");
  const deepApplied = useRef(false);

  const clips: Clip[] = useMemo(() => {
    if (!data) return [];
    const out: Clip[] = data.entry.clips.map((c) => ({ ...c }));
    if (data.entry.recitation) out.push({ ...data.entry.recitation, isRecitation: true });
    return out;
  }, [data]);

  const deepT = sp?.get("t");
  const deepC = sp?.get("c");

  useEffect(() => {
    if (deepApplied.current || deepT == null) return;
    deepApplied.current = true;
    const t = parseFloat(deepT) || 0;
    const c = Math.max(0, parseInt(deepC ?? "0", 10) || 0);
    if (t > 0) {
      setPos({ clipIdx: c, t });
      setSeek({ clipIdx: c, t, seq: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-text mb-3">Not found</h1>
        <p className="text-sm text-text-dim mb-6">No course page matches “{slug}”.</p>
        <Link href="/" className="inline-flex px-4 py-2 bg-surface border border-border text-text rounded-[6px] text-xs font-medium hover:border-text-dim transition-colors">
          ← Dashboard
        </Link>
      </div>
    );
  }

  const { unit, part, entry } = data;
  const unitIdx = course.units.indexOf(unit) + 1;
  const done = isEntryComplete(slug, progress, entry);
  const transcriptClipIdx = clips.findIndex((c) => hasTranscript(c.ytId));
  const currentClip = clips[pos.clipIdx];
  const lines = currentClip && hasTranscript(currentClip.ytId) ? clipLines(currentClip) : [];

  const doSeek = (clipIdx: number, t: number) => {
    setPos((p) => (p.clipIdx === clipIdx ? p : { clipIdx, t: 0 }));
    setSeek({ clipIdx, t, seq: Date.now() });
  };

  const problemPdf = entry.pdfs.find((p) => p.kind === "problems")?.localPath ?? entry.pdfs.find((p) => p.kind === "exam" || p.kind === "practice")?.localPath ?? null;
  const solutionsPdf = entry.pdfs.find((p) => p.kind === "solutions" || p.kind === "exam-solutions" || p.kind === "practice-solutions")?.localPath ?? null;
  const tabs: [Tab, string][] = [
    ...(transcriptClipIdx >= 0 ? ([["transcript", "Transcript"]] as [Tab, string][]) : []),
    ...(entry.pdfs.length ? ([["pdfs", "Documents"]] as [Tab, string][]) : []),
    ...(problemPdf || quiz ? ([["problems", "Practice"]] as [Tab, string][]) : []),
    ["notes", "Notes"] as [Tab, string],
  ];

  const isVideoPage = clips.length > 0;

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-xs text-text-dim hover:text-text transition-colors shrink-0">
            ← Dashboard
          </Link>
          <span className="text-border">/</span>
          <span className="text-xs text-text-faint truncate">
            Unit {unitIdx}: {unit.shortTitle} <span className="text-border">·</span> {part.shortTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCompleted(slug, !done)}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border shrink-0 ${
            done ? "bg-accent-dim text-accent border-accent/40" : "bg-surface-2 text-text-dim border-border hover:text-text hover:border-text-dim"
          }`}
          aria-pressed={done}
        >
          {done ? (
            <>
              <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </>
          ) : (
            <>
              <span className="w-3.5 h-3.5 rounded-full border border-text-dim" aria-hidden />
              Mark Complete
            </>
          )}
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {isVideoPage ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0 flex flex-col gap-5">
              <div>
                <nav className="text-[10px] font-mono text-text-faint mb-1.5" aria-label="Breadcrumb">
                  <Link href="/" className="hover:text-text-dim">
                    {unit.shortTitle}
                  </Link>{" "}
                  · {part.shortTitle}
                </nav>
                <h1 className="text-2xl font-bold text-text tracking-tight">
                  {entry.number != null && <span className="text-accent font-mono mr-2">{entry.number}.</span>}
                  {entry.title}
                </h1>
                {entry.summary && <p className="text-xs text-text-dim leading-relaxed mt-2 border-l-2 border-border pl-3">{entry.summary}</p>}
              </div>

              <YouTubePlaylist
                slug={slug}
                clips={clips}
                bookmarks={bookmarks}
                onAddBookmark={(bm) => addBookmark(slug, bm)}
                onRemoveBookmark={(ts) => removeBookmark(slug, ts)}
                onTimeUpdate={(c, t) => setPos({ clipIdx: c, t })}
                onSeekRequest={doSeek}
                seekTo={seek}
              />

              <BoardGallery boards={entry.boards} />

              <PrevNext prev={prev} next={next} />
            </div>

            <div className="w-full lg:w-96 shrink-0">
              <div className="flex border-b border-border mb-3">
                {tabs.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                      tab === id ? "text-text border-accent" : "text-text-faint border-transparent hover:text-text-dim"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "transcript" && <TranscriptPanel lines={lines} currentTime={pos.t} onSeek={(t) => doSeek(pos.clipIdx, t)} />}
              {tab === "pdfs" && <PdfTab pdfs={entry.pdfs} />}
              {tab === "problems" && <ProblemsTab slug={slug} problemPdf={problemPdf} solutionsPdf={solutionsPdf} quiz={quiz} />}
              {tab === "notes" && <NotesPanel slug={slug} currentTime={pos.t} onSeek={(t) => doSeek(pos.clipIdx, t)} />}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <nav className="text-[10px] font-mono text-text-faint mb-1.5" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-text-dim">
                  {unit.shortTitle}
                </Link>{" "}
                · {part.shortTitle}
              </nav>
              <h1 className="text-2xl font-bold text-text tracking-tight">{entry.title}</h1>
              {entry.summary && <p className="text-xs text-text-dim leading-relaxed mt-2 border-l-2 border-border pl-3">{entry.summary}</p>}
            </div>

            <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
              <div className="min-w-0">
                {quiz ? (
                  <QuizPanel slug={slug} problems={quiz.problems} problemPdf={problemPdf} solutionsPdf={solutionsPdf} />
                ) : entry.pdfs.length ? (
                  <PdfTab pdfs={entry.pdfs} wide />
                ) : (
                  <p className="text-xs text-text-faint">No materials on this page.</p>
                )}
              </div>
              <div>
                <NotesPanel slug={slug} currentTime={null} />
              </div>
            </div>

            <PrevNext prev={prev} next={next} />
          </div>
        )}
      </main>

      <CommandPalette />
    </div>
  );
}

function ProblemsTab({ slug, problemPdf, solutionsPdf, quiz }: { slug: string; problemPdf: string | null; solutionsPdf: string | null; quiz: Quiz | null }) {
  const [mode, setMode] = useState<"problems" | "solutions">("problems");
  const url = (mode === "solutions" && solutionsPdf ? solutionsPdf : problemPdf) ?? null;
  return (
    <div className="space-y-2">
      {quiz && <QuizPanel slug={slug} problems={quiz.problems} problemPdf={problemPdf} solutionsPdf={solutionsPdf} layout="narrow" />}
      {solutionsPdf && problemPdf && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("problems")}
            className={`px-2.5 py-1.5 rounded-[6px] border text-[11px] transition-colors ${mode === "problems" ? "border-accent text-accent bg-accent-dim" : "border-border text-text-dim hover:text-text"}`}
          >
            Problems
          </button>
          <button
            type="button"
            onClick={() => setMode("solutions")}
            className={`px-2.5 py-1.5 rounded-[6px] border text-[11px] transition-colors ${
              mode === "solutions" ? "border-accent text-accent bg-accent-dim" : "border-border text-text-dim hover:text-text"
            }`}
          >
            Solutions
          </button>
        </div>
      )}
      {url && <PdfViewer url={url} heightClass="h-[440px]" />}
    </div>
  );
}

function PdfTab({ pdfs, wide = false }: { pdfs: PdfRef[]; wide?: boolean }) {
  const [sel, setSel] = useState(pdfs[0]?.localPath ?? "");
  const current = pdfs.find((p) => p.localPath === sel);
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {pdfs.map((p) => (
          <button
            key={p.localPath}
            type="button"
            onClick={() => setSel(p.localPath)}
            className={`px-2.5 py-1.5 rounded-[6px] border text-[11px] transition-colors ${
              sel === p.localPath ? "border-accent text-accent bg-accent-dim" : "border-border text-text-dim hover:text-text"
            }`}
          >
            {p.title.replace(/\s*\(PDF\)\s*$/i, "").replace(/^(Problems|Solutions|Practice|Exam|Notes):\s*/i, "")}
          </button>
        ))}
      </div>
      {current && <PdfViewer url={current.localPath} heightClass={wide ? "h-[720px]" : "h-[560px]"} />}
    </div>
  );
}

function PrevNext({ prev, next }: { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
      {prev ? (
        <Link href={`/s/${prev.slug}`} className="flex flex-col gap-0.5 p-3 bg-surface border border-border rounded-[8px] hover:border-text-dim transition-colors group max-w-[48%]">
          <span className="text-[10px] uppercase font-mono text-text-faint group-hover:text-text-dim">← Previous</span>
          <span className="text-xs text-text font-medium truncate">{prev.title}</span>
        </Link>
      ) : (
        <div className="p-3 opacity-40 text-xs text-text-faint">Beginning</div>
      )}
      {next ? (
        <Link href={`/s/${next.slug}`} className="flex flex-col gap-0.5 p-3 bg-surface border border-border rounded-[8px] hover:border-text-dim transition-colors group max-w-[48%] ml-auto text-right">
          <span className="text-[10px] uppercase font-mono text-text-faint group-hover:text-text-dim">Next →</span>
          <span className="text-xs text-text font-medium truncate">{next.title}</span>
        </Link>
      ) : (
        <div className="p-3 opacity-40 text-xs text-text-faint ml-auto">End of course</div>
      )}
    </div>
  );
}
