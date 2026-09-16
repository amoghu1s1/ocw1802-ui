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
  "self-correct": "Self-marked correct",
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
    return (
      <div className="bg-surface border border-border rounded-[8px] p-4 text-xs text-text-dim text-center">
        No interactive problems authored yet — use the PDF viewer to work through this set.
      </div>
    );
  }

  const gridCls = layout === "narrow" ? "space-y-3" : "grid lg:grid-cols-2 gap-4";

  return (
    <div className={gridCls}>
      {/* left: problem list + answer area */}
      <div className="space-y-3 min-w-0">
        <div className="bg-surface border border-border rounded-[8px] p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] uppercase tracking-wider font-semibold text-text-faint">Problems</h3>
            <span className="text-[10px] font-mono text-text-faint">
              {answered}/{problems.length} correct
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1">
            {problems.map((p) => {
              const r = results[p.id];
              const active = p.id === selected;
              const dot = r === "correct" || r === "self-correct" ? "bg-emerald-500" : r ? "bg-red-400" : "bg-text-faint/50";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`px-2 py-1.5 rounded-[6px] text-[11px] font-mono border transition-colors flex items-center gap-1.5 ${
                    active ? "border-accent text-accent bg-accent-dim" : "border-border text-text-dim hover:text-text"
                  }`}
                  title={r ? RESULT_LABEL[r] : "Not attempted"}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {problem && (
          <div className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text">{problem.label}</h4>
              <button
                type="button"
                onClick={() => setPdfMode(pdfMode === "problems" ? "solutions" : "problems")}
                disabled={!solutionsPdf}
                className="text-[10px] font-mono text-text-faint hover:text-text-dim disabled:opacity-30 transition-colors"
              >
                {pdfMode === "solutions" ? "← problems pdf" : "solutions pdf →"}
              </button>
            </div>
            {problem.prompt && (
              <p className="text-xs text-text-dim leading-relaxed">
                <MathText text={problem.prompt} />
              </p>
            )}

            {problem.type === "mc" && problem.options ? (
              <div className="space-y-1.5">
                {problem.options.map((opt, i) => {
                  const r = results[problem.id];
                  const isPicked = picked[problem.id] === i;
                  const isAnswer = i === problem.answer;
                  let cls = "border-border text-text-dim hover:border-text-faint";
                  if (r) {
                    if (isPicked) cls = r === "correct" ? "border-emerald-600/60 bg-emerald-500/10 text-emerald-300" : "border-red-600/60 bg-red-500/10 text-red-300";
                    else if (isAnswer && r === "wrong") cls = "border-emerald-600/40 text-emerald-300/80";
                    else cls = "border-border text-text-faint";
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!!r}
                      onClick={() => pickMc(problem, i)}
                      className={`w-full text-left px-3 py-2 rounded-[6px] border text-xs transition-colors flex items-center gap-2 ${cls}`}
                    >
                      <span className="font-mono text-text-faint">{String.fromCharCode(65 + i)}</span>
                      <MathText text={opt} />
                    </button>
                  );
                })}
                {results[problem.id] === "wrong" && <p className="text-[10px] text-text-faint">Not quite — see the solutions PDF.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {!revealed[problem.id] ? (
                  <button
                    type="button"
                    onClick={() => setRevealed((m) => ({ ...m, [problem.id]: true }))}
                    className="px-3 py-2 rounded-[6px] border border-border text-xs text-text-dim hover:text-text hover:border-text-dim transition-colors"
                  >
                    Attempted — show solution
                  </button>
                ) : (
                  <div className="space-y-2">
                    {problem.solution && (
                      <div className="bg-surface-2 border border-border rounded-[6px] p-3 text-xs text-text-dim leading-relaxed">
                        <MathText text={problem.solution} />
                      </div>
                    )}
                    {!results[problem.id] ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => selfGrade(problem, true)} className="px-3 py-1.5 rounded-[6px] text-xs border border-emerald-700/50 text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                          ✓ Got it
                        </button>
                        <button type="button" onClick={() => selfGrade(problem, false)} className="px-3 py-1.5 rounded-[6px] text-xs border border-red-700/50 text-red-300 hover:bg-red-500/10 transition-colors">
                          ↻ Review again
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-text-faint">{results[problem.id] === "self-correct" ? "self-graded: correct" : "marked for review"}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* right: pdf */}
      {layout === "wide" && <div className="min-w-0">{pdfUrl ? <PdfViewer url={pdfUrl} heightClass="h-[720px]" /> : <div className="text-xs text-text-faint">No PDF for this page.</div>}</div>}
    </div>
  );
}
