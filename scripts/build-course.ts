/**
 * Build src/data/course.json from .cache/raw-structure.json.
 * Classification + slugging + titles/shortTitles.
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson, log, PROJECT_ROOT } from "./_lib";
import type { PageData } from "./scrape-structure";

interface Node {
  url: string;
  slug: string;
  data: PageData;
  children: Node[];
}
interface Raw {
  units: Node[];
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function shortUnit(title: string): string {
  return title
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortPart(title: string): string {
  return title
    .replace(/^Part [A-Z]:\s*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .replace(/\s*\d+\.\s*/, "")
    .trim() || title;
}

function entryNumber(title: string): number | null {
  const m = title.match(/Session (\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function main() {
  const raw = readJson<Raw>(path.join(PROJECT_ROOT, ".cache/raw-structure.json"), { units: [] });
  const usedSlugs = new Set<string>();

  const course = {
    units: raw.units.map((u, ui) => {
      const parts = u.children.map((p, pi) => {
        const entries = p.children.map((e) => {
          const d = e.data;
          let slug = d.slug;
          if (usedSlugs.has(slug)) slug = `${p.slug}-${d.slug}`;
          if (usedSlugs.has(slug)) slug = `${u.slug}-${slug}`;
          usedSlugs.add(slug);

          const title = d.title.replace(/^Session \d+:\s*/, "Session " + entryNumber(d.title) + ":") === d.title ? d.title : d.title;
          void title;

          const kind = /^session-/.test(d.slug) ? "session" : /^problem-set-/.test(d.slug) ? "problem-set" : "exam";
          const clips = d.videos
            .filter((v) => !v.isRecitation)
            .map((v) => ({ title: v.title || "Clip", ytId: v.ytId, start: v.start || 0, end: v.end || 0 }));
          const recitationV = d.videos.find((v) => v.isRecitation) ?? null;
          const recitation = recitationV
            ? { title: recitationV.title || "Recitation", ytId: recitationV.ytId, start: recitationV.start || 0, end: recitationV.end || 0 }
            : null;
          return {
            kind,
            slug,
            title: d.title,
            number: kind === "session" ? entryNumber(d.title) : null,
            summary: d.summary,
            clips,
            recitation,
            boards: d.boards.map((b) => ({ title: b.title, localPath: "" })), // filled by scrape-assets
            pdfs: [] as { kind: string; title: string; localPath: string }[], // filled by scrape-assets
          };
        });
        return {
          slug: p.slug,
          title: p.data.title,
          shortTitle: shortPart(p.data.title),
          entries,
        };
      });
      return {
        slug: u.slug,
        title: u.data.title,
        shortTitle: shortUnit(u.data.title),
        parts,
      };
    }),
  };

  // save a staging copy with source urls for the asset downloader
  const staging = {
    ...course,
    _sources: raw.units.map((u) => ({
      slug: u.slug,
      parts: u.children.map((p) => ({
        slug: p.slug,
        entries: p.children.map((e) => ({
          slug: e.slug,
          url: e.url,
          videos: e.data.videos.map((v) => ({ ytId: v.ytId, start: v.start || 0, end: v.end || 0, vttUrl: v.vttUrl, isRecitation: v.isRecitation, title: v.title })),
          boards: e.data.boards.map((b) => ({ title: b.title, thumbUrl: b.thumbUrl, fullUrl: b.fullUrl })),
          pdfs: e.data.pdfs.map((p) => ({ title: p.title, url: p.fileUrl })),
        })),
      })),
    })),
  };
  writeJson(path.join(PROJECT_ROOT, ".cache/course-staging.json"), staging);

  // course.json without empty placeholders? keep boards/pdfs arrays; scrape-assets rewrites them.
  writeJson(path.join(PROJECT_ROOT, "src/data/course.json"), course);
  log(`course.json: ${course.units.length} units, ${course.units.reduce((a, u) => a + u.parts.reduce((b, p) => b + p.entries.length, 0), 0)} entries`);
}

main();
