"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { course, getAdjacent, getEntry, isEntryComplete } from "@/lib/course";
import { addBookmark, removeBookmark, useBookmarks } from "@/lib/bookmarks";
import { setCompleted, useProgress } from "@/lib/progress";
import { clipLines, hasTranscript } from "@/lib/transcripts";
import { getQuiz } from "@/lib/quiz";
import { useNoteDoc } from "@/lib/notes";
import { YouTubePlaylist } from "@/components/YouTubePlaylist";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { PdfViewer } from "@/components/PdfViewer";
import { BoardGallery } from "@/components/BoardGallery";
import { NotesPanel } from "@/components/NotesPanel";
import { QuizPanel } from "@/components/QuizPanel";
import { StepSection, StepNav, TranscriptToggle } from "@/components/StepSection";
import CommandPalette from "@/components/CommandPalette";
import type { Clip, PdfRef, Quiz } from "@/lib/types";

interface StepDef {
  id: string;
  title: string;
  meta?: string;
  done?: boolean;
  body: React.ReactNode;
}

export default function ItemClient({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const progress = useProgress();
  const data = getEntry(slug);
  const { prev, next } = getAdjacent(slug);
  const bookmarks = useBookmarks(slug);
  const quiz = useMemo(() => getQuiz(slug), [slug]);
  const { doc: notesDoc } = useNoteDoc(slug);

  const [pos, setPos] = useState({ clipIdx: 0, t: 0 });
  const [seek, setSeek] = useState<{ clipIdx: number; t: number; seq: number } | null>(null);
  const [recPos, setRecPos] = useState(0);
  const [recSeek, setRecSeek] = useState<{ clipIdx: number; t: number; seq: number } | null>(null);
  const [showLectureTx, setShowLectureTx] = useState(false);
  const [showRecTx, setShowRecTx] = useState(false);
  const deepApplied = useRef(false);

  const clips: Clip[] = useMemo(() => (data ? data.entry.clips.map((c) => ({ ...c })) : []), [data]);
  const recitation: Clip | null = useMemo(
    () => (data?.entry.recitation ? { ...data.entry.recitation, isRecitation: true } : null),
    [data],
  );

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
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-2xl text-text mb-2">Not found</h1>
        <p className="text-sm text-text-dim mb-6">No page matches “{slug}”.</p>
        <Link href="/" className="text-sm text-text-dim underline decoration-border underline-offset-4 hover:text-text transition-colors">
          Back to the course
        </Link>
      </div>
    );
  }

  const { unit, part, entry } = data;
  const unitIdx = course.units.indexOf(unit) + 1;
  const done = isEntryComplete(slug, progress, entry);

  const currentClip = clips[pos.clipIdx];
  const lectureLines = currentClip && hasTranscript(currentClip.ytId) ? clipLines(currentClip) : [];
  const recLines = recitation && hasTranscript(recitation.ytId) ? clipLines(recitation) : [];

  const doSeek = (clipIdx: number, t: number) => {
    setPos((p) => (p.clipIdx === clipIdx ? p : { clipIdx, t: 0 }));
    setSeek({ clipIdx, t, seq: Date.now() });
  };

  const clipWatched = (c: Clip) => {
    const cp = progress[slug]?.clips[`${c.ytId}:${c.start}`];
    return !!cp?.dur && cp.dur > 0 && cp.pos / cp.dur >= 0.95;
  };
  const lectureDone = clips.length > 0 && clips.every(clipWatched);
  const recitationDone = !!recitation && clipWatched(recitation);

  /* OCW labels video transcript PDFs "English"; they are not shown twice */
  const docs = entry.pdfs.filter((p) => !/^english(\s*\(pdf\))?$/i.test(p.title.trim()));
  const readingDocs = docs.filter((p) => ["reading", "exam", "exam-solutions", "other"].includes(p.kind));
  const practiceDocs = docs.filter((p) => !readingDocs.includes(p));

  const problemPdf = entry.pdfs.find((p) => p.kind === "problems")?.localPath ?? entry.pdfs.find((p) => p.kind === "exam" || p.kind === "practice")?.localPath ?? null;
  const solutionsPdf = entry.pdfs.find((p) => p.kind === "solutions" || p.kind === "exam-solutions" || p.kind === "practice-solutions")?.localPath ?? null;

  const quizResults = progress[slug]?.quiz ?? {};
  const quizCorrect = quiz ? quiz.problems.filter((p) => quizResults[p.id] === "correct" || quizResults[p.id] === "self-correct").length : 0;
  const quizDone = !!quiz && quiz.problems.length > 0 && quizCorrect === quiz.problems.length;

  const notesCount = notesDoc.items.length;
  const isVideoPage = clips.length > 0;

  const steps: StepDef[] = [];

  if (isVideoPage) {
    steps.push({
      id: "watch",
      title: "Watch the lecture",
      meta: clips.length === 1 ? "1 clip" : `${clips.length} clips`,
      done: lectureDone,
      body: (
        <div className="space-y-3 min-w-0">
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
          {lectureLines.length > 0 && (
            <TranscriptToggle open={showLectureTx} onToggle={() => setShowLectureTx((v) => !v)}>
              <TranscriptPanel lines={lectureLines} currentTime={pos.t} onSeek={(t) => doSeek(pos.clipIdx, t)} />
            </TranscriptToggle>
          )}
        </div>
      ),
    });
  }

  if (entry.boards.length > 0) {
    steps.push({
      id: "boards",
      title: "Review the board notes",
      meta: `${entry.boards.length} ${entry.boards.length === 1 ? "board" : "boards"}`,
      body: <BoardGallery boards={entry.boards} />,
    });
  }

  if (readingDocs.length > 0) {
    steps.push({
      id: "reading",
      title: isVideoPage ? "Read the notes and examples" : "Read the materials",
      meta: `${readingDocs.length} ${readingDocs.length === 1 ? "PDF" : "PDFs"}`,
      body: <PdfTab pdfs={readingDocs} wide />,
    });
  }

  if (recitation) {
    steps.push({
      id: "recitation",
      title: "Watch the recitation",
      meta: "1 clip",
      done: recitationDone,
      body: (
        <div className="space-y-3 min-w-0">
          <YouTubePlaylist
            slug={slug}
            clips={[recitation]}
            bookmarks={bookmarks}
            onAddBookmark={(bm) => addBookmark(slug, bm)}
            onRemoveBookmark={(ts) => removeBookmark(slug, ts)}
            onTimeUpdate={(_, t) => setRecPos(t)}
            onSeekRequest={(_, t) => setRecSeek({ clipIdx: 0, t, seq: Date.now() })}
            seekTo={recSeek}
          />
          {recLines.length > 0 && (
            <TranscriptToggle open={showRecTx} onToggle={() => setShowRecTx((v) => !v)} label="recitation transcript">
              <TranscriptPanel lines={recLines} currentTime={recPos} onSeek={(t) => setRecSeek({ clipIdx: 0, t, seq: Date.now() })} />
            </TranscriptToggle>
          )}
        </div>
      ),
    });
  }

  if (isVideoPage && (quiz || practiceDocs.length > 0)) {
    steps.push({
      id: "practice",
      title: "Work the problems",
      meta: quiz ? `${quizCorrect} of ${quiz.problems.length} correct` : `${practiceDocs.length} ${practiceDocs.length === 1 ? "PDF" : "PDFs"}`,
      done: quiz ? quizDone : undefined,
      body: <ProblemsTab slug={slug} problemPdf={problemPdf} solutionsPdf={solutionsPdf} quiz={quiz} pdfs={practiceDocs} />,
    });
  }

  if (!isVideoPage) {
    steps.push({
      id: "practice",
      title: entry.kind === "problem-set" ? "Work the problem set" : "Review the exam",
      meta: quiz ? `${quizCorrect} of ${quiz.problems.length} correct` : `${entry.pdfs.length} ${entry.pdfs.length === 1 ? "PDF" : "PDFs"}`,
      done: quiz ? quizDone : undefined,
      body: quiz ? (
        <QuizPanel slug={slug} problems={quiz.problems} problemPdf={problemPdf} solutionsPdf={solutionsPdf} />
      ) : entry.pdfs.length ? (
        <PdfTab pdfs={entry.pdfs} wide />
      ) : (
        <p className="text-xs text-text-faint">No materials on this page.</p>
      ),
    });
  }

  steps.push({
    id: "notes",
    title: "Write your notes",
    meta: notesCount > 0 ? `${notesCount} ${notesCount === 1 ? "note" : "notes"}` : undefined,
    body: <NotesPanel slug={slug} currentTime={isVideoPage ? pos.t : null} onSeek={isVideoPage ? (t) => doSeek(pos.clipIdx, t) : undefined} />,
  });

  const navItems = steps.map((s) => ({ id: s.id, label: s.title, meta: s.meta, done: !!s.done }));

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-bg/85 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4">
        <nav className="flex items-baseline gap-2 min-w-0 text-xs text-text-dim" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-text transition-colors shrink-0">
            18.02SC
          </Link>
          <span className="text-text-faint shrink-0" aria-hidden>
            ·
          </span>
          <span className="truncate">
            Unit {unitIdx}: {unit.shortTitle} · {part.shortTitle}
          </span>
        </nav>
        <button
          type="button"
          onClick={() => setCompleted(slug, !done)}
          className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer border ${
            done ? "border-transparent bg-surface-2 text-text-dim hover:text-text" : "border-border text-text-dim hover:text-text hover:bg-surface-2"
          }`}
          aria-pressed={done}
        >
          {done ? (
            <>
              <span className="font-display text-sm" aria-hidden>
                ✓
              </span>
              Completed
            </>
          ) : (
            "Mark complete"
          )}
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid xl:grid-cols-[minmax(0,1fr)_248px] gap-10 items-start">
          <div className="order-2 xl:order-1 min-w-0">
            <div className="mb-10">
              <h1 className="font-display text-3xl sm:text-4xl leading-tight text-text">
                {entry.number != null && <span className="text-text-faint mr-3">{entry.number}.</span>}
                {entry.title}
              </h1>
              {entry.summary && <p className="text-sm text-text-dim leading-relaxed mt-4 max-w-2xl">{entry.summary}</p>}
            </div>

            <div className="space-y-10">
              {steps.map((s, i) => (
                <StepSection key={s.id} id={s.id} n={i + 1} title={s.title} hint={s.meta} done={!!s.done}>
                  {s.body}
                </StepSection>
              ))}
            </div>

            <PrevNext prev={prev} next={next} />
          </div>

          <aside className="order-1 xl:order-2 w-full xl:sticky xl:top-20">
            <StepNav items={navItems} />
          </aside>
        </div>
      </main>

      <CommandPalette />
    </div>
  );
}

function ProblemsTab({
  slug,
  problemPdf,
  solutionsPdf,
  quiz,
  pdfs,
}: {
  slug: string;
  problemPdf: string | null;
  solutionsPdf: string | null;
  quiz: Quiz | null;
  pdfs: PdfRef[];
}) {
  const [mode, setMode] = useState<"problems" | "solutions">("problems");
  const url = (mode === "solutions" && solutionsPdf ? solutionsPdf : problemPdf) ?? null;
  return (
    <div className="space-y-3 min-w-0">
      {quiz && <QuizPanel slug={slug} problems={quiz.problems} problemPdf={problemPdf} solutionsPdf={solutionsPdf} layout={problemPdf || solutionsPdf ? "narrow" : "wide"} />}
      {solutionsPdf && problemPdf && (
        <div className="flex items-center gap-1">
          <ToneButton active={mode === "problems"} onClick={() => setMode("problems")}>
            Problems
          </ToneButton>
          <ToneButton active={mode === "solutions"} onClick={() => setMode("solutions")}>
            Solutions
          </ToneButton>
        </div>
      )}
      {url && <PdfViewer url={url} heightClass="h-[440px]" />}
      {!url && pdfs.length > 0 && <PdfTab pdfs={pdfs} />}
    </div>
  );
}

function ToneButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-[5px] text-[11px] transition-colors ${
        active ? "bg-surface-2 text-text" : "text-text-dim hover:text-text hover:bg-surface-2/60"
      }`}
    >
      {children}
    </button>
  );
}

function PdfTab({ pdfs, wide = false }: { pdfs: PdfRef[]; wide?: boolean }) {
  const [sel, setSel] = useState(pdfs[0]?.localPath ?? "");
  const current = pdfs.find((p) => p.localPath === sel);
  return (
    <div className="space-y-3 min-w-0">
      <div className="flex gap-1 flex-wrap">
        {pdfs.map((p) => (
          <ToneButton key={p.localPath} active={sel === p.localPath} onClick={() => setSel(p.localPath)}>
            {p.title.replace(/\s*\(PDF\)\s*$/i, "").replace(/^(Problems|Solutions|Practice|Exam|Notes):\s*/i, "")}
          </ToneButton>
        ))}
      </div>
      {current && <PdfViewer url={current.localPath} heightClass={wide ? "h-[720px]" : "h-[560px]"} />}
    </div>
  );
}

function PrevNext({ prev, next }: { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null }) {
  return (
    <div className="mt-12 pt-6 border-t border-border/60 flex items-start justify-between gap-8">
      {prev ? (
        <Link href={`/s/${prev.slug}`} className="group min-w-0 max-w-[46%]">
          <span className="flex items-center gap-1.5 text-[11px] text-text-faint">
            <span className="font-display" aria-hidden>
              ↖
            </span>
            Previous
          </span>
          <span className="mt-1 block text-sm text-text-dim group-hover:text-text transition-colors truncate">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/s/${next.slug}`} className="group min-w-0 max-w-[46%] ml-auto text-right">
          <span className="flex items-center justify-end gap-1.5 text-[11px] text-text-faint">
            Next
            <span className="font-display" aria-hidden>
              ↗
            </span>
          </span>
          <span className="mt-1 block text-sm text-text-dim group-hover:text-text transition-colors truncate">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
