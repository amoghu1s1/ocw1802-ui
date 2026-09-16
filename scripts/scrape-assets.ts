/**
 * Download PDFs + board images into public/content/<unit>/<part>/<entry>/ and
 * rewrite src/data/course.json with local paths. Reads .cache/course-staging.json.
 */
import fs from "node:fs";
import path from "node:path";
import { BASE, pool, log, PROJECT_ROOT } from "./_lib";

const OUT = path.join(PROJECT_ROOT, "public/content");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ocw1802-scraper/0.1";

function classifyPdf(title: string, url: string): string {
  const t = title.toLowerCase();
  if (/solutions|comb\b/.test(t) || /_sol\b|solution/.test(url.toLowerCase())) {
    if (/practice/.test(t)) return "practice-solutions";
    if (/exam/.test(t) && !/practice/.test(t)) return "exam-solutions";
    return "solutions";
  }
  if (/problems|quest\b|problem set|pset/.test(t)) {
    if (/practice/.test(t)) return "practice";
    return "problems";
  }
  if (/exam/.test(t)) return "exam";
  return "reading";
}

async function download(url: string, dest: string): Promise<void> {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error("too small");
      fs.writeFileSync(dest, buf);
      return;
    } catch (e) {
      if (i === 2) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function main() {
  const stagingPath = path.join(PROJECT_ROOT, ".cache/course-staging.json");
  const staging = JSON.parse(fs.readFileSync(stagingPath, "utf8"));
  const coursePath = path.join(PROJECT_ROOT, "src/data/course.json");
  const course = JSON.parse(fs.readFileSync(coursePath, "utf8"));

  let nPdf = 0;
  let nBoard = 0;
  const missing: string[] = [];

  // zip units with staging sources (same order)
  const sources = (staging._sources ?? []) as typeof staging.units;
  for (let ui = 0; ui < course.units.length; ui++) {
    const u = course.units[ui];
    const su = sources[ui];
    for (let pi = 0; pi < u.parts.length; pi++) {
      const p = u.parts[pi];
      const sp = su.parts[pi];
      for (let ei = 0; ei < p.entries.length; ei++) {
        const e = p.entries[ei];
        const se = sp.entries[ei];
        const dirBase = `${u.slug}/${p.slug}/${e.slug}`;

        // PDFs
        e.pdfs = [];
        const seenFiles = new Set<string>();
        const pdfJobs = (se.pdfs ?? []).map(async (pdf: { title: string; url: string }, idx: number) => {
          const kind = classifyPdf(pdf.title, pdf.url);
          const base = kind === "reading" ? `reading-${idx + 1}` : kind;
          let file = `${base}.pdf`;
          let n = 2;
          while (seenFiles.has(file)) file = `${base}-${n++}.pdf`;
          seenFiles.add(file);
          const localPath = `/content/${dirBase}/${file}`;
          try {
            await download(pdf.url, path.join(OUT, u.slug, p.slug, e.slug, file));
            e.pdfs.push({ kind, title: pdf.title.replace(/\s*\(PDF\)\s*$/i, "") + " (PDF)", localPath });
            nPdf++;
          } catch {
            missing.push(pdf.url);
          }
        });

        // Boards
        e.boards = [];
        const boardJobs = (se.boards ?? []).map(async (b: { title: string; thumbUrl: string; fullUrl: string | null }, idx: number) => {
          const file = `board-${idx + 1}.png`;
          const localPath = `/content/${dirBase}/${file}`;
          try {
            await download(b.fullUrl || b.thumbUrl, path.join(OUT, u.slug, p.slug, e.slug, file));
            e.boards.push({ title: b.title || `Board ${idx + 1}`, localPath });
            nBoard++;
          } catch {
            missing.push(b.thumbUrl);
          }
        });

        await Promise.all([...pdfJobs, ...boardJobs]);
        // sort: readings, problems, solutions, exam kinds
        const order: Record<string, number> = { reading: 0, problems: 1, solutions: 2, practice: 3, "practice-solutions": 4, exam: 5, "exam-solutions": 6 };
        e.pdfs.sort((a: { kind: string }, b: { kind: string }) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
      }
    }
  }

  fs.writeFileSync(coursePath, JSON.stringify(course, null, "\t"));
  log(`downloaded ${nPdf} pdfs, ${nBoard} boards; ${missing.length} failed`);
  if (missing.length) log("missing:\n" + missing.slice(0, 20).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
