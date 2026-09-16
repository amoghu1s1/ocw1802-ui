/**
 * Validate src/data/course.json: unique slugs, referenced files exist,
 * video ids sane, quiz entries coherent. Prints a course summary.
 */
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, log } from "./_lib";

interface Clip {
  ytId: string;
  start: number;
  end: number;
}
interface Entry {
  kind: string;
  slug: string;
  title: string;
  clips: Clip[];
  recitation: Clip | null;
  boards: { localPath: string }[];
  pdfs: { kind: string; localPath: string }[];
}
interface Part {
  slug: string;
  entries: Entry[];
}
interface Unit {
  slug: string;
  parts: Part[];
}

const coursePath = path.join(PROJECT_ROOT, "src/data/course.json");
const course = JSON.parse(fs.readFileSync(coursePath, "utf8")) as { units: Unit[] };
const root = PROJECT_ROOT;

let errors = 0;
const error = (msg: string) => {
  errors++;
  console.error("  ✗ " + msg);
};

const slugs = new Set<string>();
const ytIds = new Set<string>();
let nEntries = 0,
  nClips = 0,
  nBoards = 0,
  nPdfs = 0;

for (const u of course.units) {
  for (const p of u.parts) {
    for (const e of p.entries) {
      nEntries++;
      if (slugs.has(e.slug)) error(`duplicate slug: ${e.slug}`);
      slugs.add(e.slug);
      for (const c of [...e.clips, ...(e.recitation ? [e.recitation] : [])]) {
        nClips++;
        if (!/^[\w-]{11}$/.test(c.ytId)) error(`bad ytId ${c.ytId} in ${e.slug}`);
        ytIds.add(c.ytId);
        if (c.end && c.end <= c.start) error(`clip end<=start in ${e.slug} (${c.start}-${c.end})`);
      }
      for (const b of e.boards) {
        nBoards++;
        if (!fs.existsSync(path.join(root, "public", b.localPath.replace(/^\//, "")))) error(`missing board ${b.localPath} (${e.slug})`);
      }
      for (const pdf of e.pdfs) {
        nPdfs++;
        if (!fs.existsSync(path.join(root, "public", pdf.localPath.replace(/^\//, "")))) error(`missing pdf ${pdf.localPath} (${e.slug})`);
      }
    }
  }
}

// transcripts sanity
const bundlePath = path.join(root, "src/data/transcripts/bundle.json");
const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as Record<string, unknown[]>;
let noTranscript = 0;
for (const id of ytIds) if (!bundle[id]) noTranscript++;

// quiz.json sanity
interface QuizProblem {
  id: string;
  type: string;
  options?: string[];
  answer?: number;
  solution?: string;
}
const quizPath = path.join(root, "src/data/quiz.json");
const quizzes = JSON.parse(fs.readFileSync(quizPath, "utf8")) as Record<string, { problems: QuizProblem[] }>;
let nQuizProblems = 0;
for (const [slug, q] of Object.entries(quizzes)) {
  if (!slugs.has(slug)) error(`quiz for unknown entry slug: ${slug}`);
  const ids = new Set<string>();
  if (!q.problems?.length) error(`quiz ${slug}: no problems`);
  for (const p of q.problems ?? []) {
    nQuizProblems++;
    if (ids.has(p.id)) error(`quiz ${slug}: duplicate problem id "${p.id}"`);
    ids.add(p.id);
    if (p.type === "mc") {
      if (!p.options || p.options.length < 2) error(`quiz ${slug}/${p.id}: mc needs at least 2 options`);
      else if (p.answer == null || !Number.isInteger(p.answer) || p.answer < 0 || p.answer >= p.options.length)
        error(`quiz ${slug}/${p.id}: answer index out of range`);
    } else if (!p.solution) {
      error(`quiz ${slug}/${p.id}: type "${p.type}" needs a solution`);
    }
  }
}

log(`units=${course.units.length} entries=${nEntries} clips=${nClips} boards=${nBoards} pdfs=${nPdfs} quiz=${nQuizProblems} in ${Object.keys(quizzes).length} set(s)`);
log(`unique videos=${ytIds.size}, without transcript=${noTranscript}`);
if (errors === 0) log("validate: OK ✓");
else log(`validate: ${errors} errors ✗`);
process.exit(errors > 0 ? 1 : 0);
