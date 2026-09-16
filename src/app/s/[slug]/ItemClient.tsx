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
import type { Bookmark, Clip, PdfRef, Quiz } from "@/lib/types";

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

  const currentClip = clips[pos.clipIdx];
  const lectureLines = currentClip && hasTranscript(currentClip.ytId) ? clipLines(currentClip.ytId) : [];
  const recLines = recitation && hasTranscript(recitation.ytId) ? clipLines(recitation.ytId) : [];

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

  /* documents: OCW labels video transcript PDFs "English" — not worth listing twice */
  const docs = entry.pdfs.filter((p) => !/^english$/i.test(p.title.trim()));
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
      meta: clips.length === 1 ? "1 video clip" : `${clips.length} video clips`,
      done: lectureDone,
      body: (
        <div className="space-y-3">
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
      meta: `${entry.boards.length} board${entry.boards.length === 1 ? "" : "s"}`,
      body: <BoardGallery boards={entry.boards} />,
    });
  }

  if (readingDocs.length > 0) {
    steps.push({
      id: "reading",
      title: isVideoPage ? "Read the notes & examples" : "Read the materials",
      meta: `${readingDocs.length} PDF${readingDocs.length === 1 ? "" : "s"}`,
      body: <PdfTab pdfs={readingDocs} wide />,
    });
  }

  if (recitation) {
    steps.push({
      id: "recitation",
      title: "Watch the recitation",
      meta: "1 video clip",
      done: recitationDone,
      body: (
        <div className="space-y-3">
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
      meta: quiz ? `${quizCorrect}/${quiz.problems.length} correct` : `${practiceDocs.length} PDF${practiceDocs.length === 1 ? "" : "s"}`,
      done: quiz ? quizDone : undefined,
      body: <ProblemsTab slug={slug} problemPdf={problemPdf} solutionsPdf={solutionsPdf} quiz={quiz} pdfs={practiceDocs} />,
    });
  }

  if (!isVideoPage) {
    steps.push({
      id: "practice",
      title: entry.kind === "problem-set" ? "Work the problem set" : "Review the exam",
      meta: quiz ? `${quizCorrect}/${quiz.problems.length} correct` : `${entry.pdfs.length} PDF${entry.pdfs.length === 1 ? "" : "s"}`,
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
    meta: notesCount > 0 ? `${notesCount} note${notesCount === 1 ? "" : "s"}` : undefined,
    body: <NotesPanel slug={slug} currentTime={isVideoPage ? pos.t : null} onSeek={isVideoPage ? (t) => doSeek(pos.clipIdx, t) : undefined} />,
  });

  const navItems = steps.map((s) => ({ id: s.id, label: s.title, meta: s.meta, done: !!s.done }));

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

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid xl:grid-cols-[minmax(0,1fr)_256px] gap-6 items-start">
          <div className="order-2 xl:order-1 min-w-0">
            <div className="mb-5">
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

            {steps.map((s, i) => (
              <StepSection key={s.id} id={s.id} n={i + 1} title={s.title} hint={s.meta} done={!!s.done}>
                {s.body}
              </StepSection>
            ))}

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
    <div className="space-y-2">
      {quiz && <QuizPanel slug={slug} problems={quiz.problems} problemPdf={problemPdf} solutionsPdf={solutionsPdf} layout={pdfs.length ? "narrow" : "wide"} />}
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
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
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
