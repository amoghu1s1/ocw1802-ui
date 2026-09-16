export interface TranscriptLine {
  t: number; // seconds
  text: string;
}

export type PdfKind =
  | "reading"
  | "problems"
  | "solutions"
  | "practice"
  | "practice-solutions"
  | "exam"
  | "exam-solutions"
  | "other";

export interface PdfRef {
  kind: PdfKind;
  title: string;
  localPath: string; // "/content/<unit-slug>/<part-slug>/<entry-slug>/<file>"
}

/** A video segment of a (usually full-lecture) YouTube video. */
export interface Clip {
  title: string;
  ytId: string;
  start: number; // seconds into the full video
  end: number; // 0 = full video (duration resolved at runtime)
  isRecitation?: boolean;
}

export interface BoardImage {
  title: string;
  localPath: string;
}

/** Authored answer-area problem (quiz.json). */
export interface QuizProblem {
  id: string;
  label: string; // "Problem 1"
  type: "mc" | "self";
  prompt?: string; // short restatement of the task
  options?: string[]; // MC options
  answer?: number; // index of correct option
  solution?: string; // brief solution sketch (KaTeX ok)
}

export interface Quiz {
  problems: QuizProblem[];
}

export type EntryKind = "session" | "problem-set" | "exam";

export interface Entry {
  kind: EntryKind;
  slug: string;
  title: string;
  number: number | null; // session number, null for problem sets/exams
  summary: string;
  clips: Clip[];
  recitation: Clip | null;
  boards: BoardImage[];
  pdfs: PdfRef[];
  quiz: Quiz | null;
}

export interface Part {
  slug: string;
  title: string;
  shortTitle: string;
  entries: Entry[];
}

export interface Unit {
  slug: string;
  title: string;
  shortTitle: string;
  parts: Part[];
}

export interface Course {
  units: Unit[];
}

/* ------- progress (localStorage `ocw1802.progress.v1`, key = entry slug) ------- */

export interface ClipPos {
  pos: number;
  dur: number | null;
}

export interface ProgressEntry {
  completedAt: string | null;
  touchedAt?: string; // last activity (recency for Continue)
  clips: Record<string, ClipPos>; // key `${ytId}:${start}`
  quiz: Record<string, "correct" | "wrong" | "self-correct" | "self-wrong">;
}

export type ProgressMap = Record<string, ProgressEntry>;

/* ------- notes (localStorage `ocw1802.notes.v1`, key = entry slug) ------- */

export interface NoteItem {
  id: string;
  ts: number | null; // pinned to a video timestamp (seconds) or null
  text: string;
  updatedAt: string;
}

export interface NotesDoc {
  items: NoteItem[];
  updatedAt: string;
}

export type NotesMap = Record<string, NotesDoc>;

/* ------- bookmarks (localStorage `ocw1802.bookmarks.v1`, key = entry slug) ------- */

export interface Bookmark {
  ts: number;
  label: string;
}

export type BookmarksMap = Record<string, Bookmark[]>;
