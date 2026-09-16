"use client";

import { useState } from "react";
import type { QuizProblem } from "@/lib/types";
import { setQuizResult, useProgress } from "@/lib/progress";
import { MathText } from "@/lib/math";
import { PdfViewer } from "./PdfViewer";

interface QuizPanelProps {
  slug: string;
  problems: QuizProblem[];
  problemPdf: string | null;
  solutionsPdf: string | null;
  layout?: "wide" | "narrow";
}

const RESULT_LABEL: Record<string, string> = {
  correct: "Correct",
  wrong: "Wrong",
  "self-correct": "Marked correct",
  "self-wrong": "Marked for review",
};

export function QuizPanel({ slug, problems, problemPdf, solutionsPdf, layout = "wide" }: QuizPanelProps) {
  const progress = useProgress();
  const results = progress[slug]?.quiz ?? {};
  const [selected, setSelected] = useState<string | null>(problems[0]?.id ?? null);
  const [pdfMode, setPdfMode] = useState<"problems" | "solutions">("problems");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Record<string, number>>({});

  const problem = problems.find((p) => p.id === selected) ?? problems[0];
  const answered = Object.values(results).filter((r) => r === "correct" || r === "self-correct").length;
  const pdfUrl = (pdfMode === "solutions" && solutionsPdf ? solutionsPdf : problemPdf) ?? "";

  const pickMc = (p: QuizProblem, i: number) => {
    if (results[p.id]) return;
    setPicked((m) => ({ ...m, [p.id]: i }));
    setQuizResult(slug, p.id, i === p.answer ? "correct" : "wrong");
  };
  const selfGrade = (p: QuizProblem, ok: boolean) => setQuizResult(slug, p.id, ok ? "self-correct" : "self-wrong");

  if (!problems.length) {
    return <p className="text-xs text-text-faint">No interactive problems authored for this set yet. Use the PDF below.</p>;
  }

  const gridCls = layout === "narrow" ? "space-y-4" : "grid lg:grid-cols-2 gap-6";

  return (
    <div className={gridCls}>
      {/* left: problem list + answer area */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {problems.map((p) => {
              const r = results[p.id];
              const active = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  title={r ? RESULT_LABEL[r] : "Not attempted"}
                  className={`min-w-[34px] px-2 py-1 rounded-[5px] font-mono text-[11px] transition-colors ${
                    active ? "bg-surface-2 text-text" : r ? "text-text-faint hover:text-text-dim" : "text-text-dim hover:text-text hover:bg-surface-2/60"
                  }`}
                >
                  {p.label}
                  {r === "correct" || r === "self-correct" ? <span className="ml-1 text-text-faint">✓</span> : null}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-text-faint shrink-0">
            <span className="font-mono">{answered}</span> of <span className="font-mono">{problems.length}</span> correct
          </span>
        </div>

        {problem && (
          <div className="rounded-[10px] border border-border/70 bg-surface/60 p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="font-display text-lg text-text leading-none">{problem.label}</h4>
              <button
                type="button"
                onClick={() => setPdfMode(pdfMode === "problems" ? "solutions" : "problems")}
                disabled={!solutionsPdf}
                className="text-[11px] text-text-faint hover:text-text-dim disabled:opacity-30 transition-colors"
              >
                {pdfMode === "solutions" ? "back to problems" : "solutions"}
              </button>
            </div>
            {problem.prompt && (
              <p className="text-xs text-text-dim leading-relaxed">
                <MathText text={problem.prompt} />
              </p>
            )}

            {problem.type === "mc" && problem.options ? (
              <div className="space-y-1">
                {problem.options.map((opt, i) => {
                  const r = results[problem.id];
                  const isPicked = picked[problem.id] === i;
                  const isAnswer = i === problem.answer;
                  const good = isPicked && r === "correct";
                  const bad = isPicked && r === "wrong";
                  const answerShown = r === "wrong" && isAnswer;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!!r}
                      onClick={() => pickMc(problem, i)}
                      className={`w-full text-left px-3 py-2 rounded-[6px] text-xs transition-colors flex items-baseline gap-2.5 ${
                        good
                          ? "bg-surface-2 text-text"
                          : bad
                            ? "bg-surface-2/60 text-text-dim"
                            : answerShown
                              ? "text-text-dim"
                              : r
                                ? "text-text-faint"
                                : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-text-faint shrink-0 w-3">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1 min-w-0">
                        <MathText text={opt} />
                      </span>
                      {good && <span className="text-text-faint shrink-0" aria-label="Your answer, correct">✓</span>}
                      {bad && <span className="text-red-400/80 shrink-0" aria-label="Your answer, wrong">×</span>}
                      {answerShown && <span className="text-[10px] text-text-faint shrink-0">answer</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {!revealed[problem.id] ? (
                  <button
                    type="button"
                    onClick={() => setRevealed((m) => ({ ...m, [problem.id]: true }))}
                    className="px-2.5 py-1.5 rounded-[5px] text-xs text-text-dim hover:text-text hover:bg-surface-2/60 transition-colors -ml-2.5"
                  >
                    Show solution
                  </button>
                ) : (
                  <div className="space-y-2">
                    {problem.solution && (
                      <div className="rounded-[6px] bg-surface-2/70 p-3 text-xs text-text-dim leading-relaxed">
                        <MathText text={problem.solution} />
                      </div>
                    )}
                    {!results[problem.id] ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => selfGrade(problem, true)} className="px-2.5 py-1.5 rounded-[5px] text-xs text-text-dim hover:text-text hover:bg-surface-2/60 transition-colors">
                          Got it
                        </button>
                        <button type="button" onClick={() => selfGrade(problem, false)} className="px-2.5 py-1.5 rounded-[5px] text-xs text-text-dim hover:text-text hover:bg-surface-2/60 transition-colors">
                          Review again
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-faint">{results[problem.id] === "self-correct" ? "Self-graded: correct" : "Marked for review"}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* right: pdf */}
      {layout === "wide" && (
        <div className="min-w-0">{pdfUrl ? <PdfViewer url={pdfUrl} heightClass="h-[720px]" /> : <p className="text-xs text-text-faint">No PDF for this page.</p>}</div>
      )}
    </div>
  );
}
