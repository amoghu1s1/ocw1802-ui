import quizData from "@/data/quiz.json";
import type { Quiz } from "./types";

/** Authored answer-area problems, keyed by entry slug. */
export const quizzes = quizData as Record<string, Quiz>;

export function getQuiz(slug: string): Quiz | null {
  return quizzes[slug] ?? null;
}
