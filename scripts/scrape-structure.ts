/**
 * Scrape the 18.02SC course tree → .cache/raw-structure.json
 * (buildCourse.ts then converts this into src/data/course.json)
 *
 * Content scope: `#course-title` + `#course-content-section` (the outer
 * #course-main-content also contains the full course nav — must be ignored).
 *
 * Tree: unit (depth 1) → children (depth 2): parts (containers with own
 * children) + direct entries. Sessions live inside parts; the unit-level flat
 * listing duplicates them, so leaves already inside a part are dropped.
 */
import * as cheerio from "cheerio";
import { BASE, COURSE_PATH, fetchText, pool, writeJson, log, PROJECT_ROOT } from "./_lib";
import path from "node:path";

export interface VideoData {
  title: string;
  ytId: string;
  start: number;
  end: number;
  vttUrl: string | null;
  isRecitation: boolean;
}
export interface BoardData {
  title: string;
  thumbUrl: string;
  fullUrl: string | null;
  resUrl: string;
}
export interface PdfData {
  title: string;
  fileUrl: string;
  resUrl: string | null;
}
export interface PageData {
  url: string;
  slug: string;
  title: string;
  summary: string;
  childLinks: string[];
  videos: VideoData[];
  boards: BoardData[];
  pdfs: PdfData[];
}

const abs = (u: string) => (u.startsWith("http") ? u : BASE + u);
const slugOf = (url: string) => url.replace(/\/$/, "").split("/").pop()!;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function content(html: string): cheerio.CheerioAPI | null {
  const $ = cheerio.load(html);
  return $("main#course-content-section").length ? $ : null;
}

function parseVideoSetupJson(setupRaw: string): { ytId: string; start: number; end: number; vttUrl: string | null } | null {
  try {
    const setup = JSON.parse(setupRaw.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"));
    const src: string | undefined = setup?.sources?.[0]?.src;
    const ytMatch = src?.match(/\/embed\/([\w-]+)/);
    if (!ytMatch) return null;
    const yt = setup?.youtube ?? {};
    return {
      ytId: ytMatch[1],
      start: typeof yt.start === "number" ? yt.start : 0,
      end: typeof yt.end === "number" ? yt.end : 0,
      vttUrl: null,
    };
  } catch {
    return null;
  }
}

/** Extract videos from raw html: <video data-setup> blocks, with nearest preceding h3 as context. */
function parseVideosFromHtml(html: string): VideoData[] {
  const out: VideoData[] = [];
  const re = /<video[^>]*data-setup='([\s\S]*?)'[\s\S]*?<\/video>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const parsed = parseVideoSetupJson(m[1]);
    if (!parsed) continue;
    const before = html.slice(0, m.index);
    const hs = [...before.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)];
    const ctx = hs.length ? clean(hs[hs.length - 1][1].replace(/<[^>]+>/g, "")) : "";
    const vttMatch = /track[^>]*src="([^"]+_captions\.vtt)"/.exec(m[0]) ?? /track[^>]*src="([^"]+\.vtt)"/.exec(m[0]);
    out.push({
      title: ctx,
      ytId: parsed.ytId,
      start: parsed.start,
      end: parsed.end,
      vttUrl: vttMatch ? abs(vttMatch[1]) : null,
      isRecitation: /recitation/i.test(ctx),
    });
  }
  return out;
}

function extractSummary($: cheerio.CheerioAPI): string {
  const mc = $("main#course-content-section");
  // prefer the "Overview" section content (paragraph + list)
  const h3 = mc
    .find("h3")
    .get()
    .find((el) => /^overview$/i.test($(el).text().trim()));
  if (h3) {
    const parts: string[] = [];
    let node = $(h3).next();
    while (node.length) {
      const tag = ((node.get(0) as { tagName?: string }).tagName ?? "").toUpperCase();
      if (["H1", "H2", "H3", "H4"].includes(tag)) break;
      const txt = node.text().replace(/\s+/g, " ").trim();
      if (txt && !/^«/.test(txt) && !/Previous\s*\|/.test(txt)) {
        if (tag === "UL" || tag === "OL") {
          const lis = node
            .find("li")
            .map((_, li) => $(li).text().replace(/\s+/g, " ").trim().replace(/^»\s*/, ""))
            .get()
            .filter((t) => t && !/^in this session/i.test(t));
          parts.push(...lis);
        } else if (node.is("p") && !/^in this session/i.test(txt)) parts.push(txt.replace(/^»\s*/, ""));
      }
      node = node.next();
    }
    if (parts.length) return parts.slice(0, 6).join(" · ").slice(0, 500);
  }
  // fallback: first paragraphs before nav junk
  const paras = mc
    .find("> p, > blockquote p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((t) => t && !/^«/.test(t) && !/Previous\s*\|/.test(t) && !/Next »/.test(t) && !/In this session/.test(t));
  if (paras.length) return paras.slice(0, 2).join(" ").slice(0, 500);
  const lis = mc
    .find("ul li")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((t) => t && !/^«/.test(t));
  return lis.slice(0, 6).join(" · ").slice(0, 500);
}

function extractTitle($: cheerio.CheerioAPI, fallback: string): string {
  const t =
    $("#course-title h2").first().text().trim() ||
    $("main#course-content-section h1").first().text().trim() ||
    $("main#course-content-section h2").first().text().trim();
  return t.replace(/\s+/g, " ") || fallback;
}

/** Parse a course page: content-scope links, embedded videos, board thumbs, resource links. */
async function parsePage(url: string, childPrefix: string | null): Promise<PageData> {
  const html = await fetchText(abs(url));
  const $ = content(html);
  if (!$) throw new Error(`No content section at ${url}`);
  const slug = slugOf(url);
  const data: PageData = { url, slug, title: "", summary: "", childLinks: [], videos: [], boards: [], pdfs: [] };
  data.title = extractTitle($, slug);
  data.summary = extractSummary($);

  const mc = $("main#course-content-section");

  // same-tree child page links
  if (childPrefix) {
    const baseDepth = childPrefix.replace(COURSE_PATH + "/pages/", "").split("/").filter(Boolean).length;
    const seen = new Set<string>();
    mc.find("a[href]").each((_, el) => {
      const href = ($(el).attr("href") ?? "").split("#")[0].split("?")[0];
      if (!href.startsWith(childPrefix) || !href.endsWith("/")) return;
      const rel = href.replace(COURSE_PATH + "/pages/", "").replace(/\/$/, "");
      if (rel.split("/").filter(Boolean).length <= baseDepth) return;
      const full = abs(href);
      if (!seen.has(full) && full !== abs(url)) {
        seen.add(full);
        data.childLinks.push(full);
      }
    });
  }

  // embedded video players + linked video resource pages, in document order
  const mcHtml = html.slice(html.indexOf('id="course-content-section"'));
  data.videos = parseVideosFromHtml(mcHtml);

  // anchors → boards / pdfs / resource pages to resolve
  const resourceUrls = new Map<string, { board?: BoardData; pdf?: PdfData }>();
  mc.find("a[href]").each((_, el) => {
    const $a = $(el);
    const href = ($a.attr("href") ?? "").split("#")[0];
    const text = $a.text().replace(/\s+/g, " ").trim();
    if (!href.includes("/resources/") && !/\.pdf(\?|$)/i.test(href)) return;
    const img = $a.find("img[src*='/courses/']").first();
    const resUrl = abs(href.split("?")[0]);
    if (href.includes("/resources/") && img.length) {
      const b: BoardData = { title: img.attr("alt") || "Board", thumbUrl: abs(img.attr("src")!.split("?")[0]), fullUrl: null, resUrl };
      data.boards.push(b);
      if (!resourceUrls.has(resUrl)) resourceUrls.set(resUrl, { board: b });
      return;
    }
    if (/\.pdf(\?|$)/i.test(href)) {
      const p: PdfData = { title: text || "PDF", fileUrl: abs(href.split("?")[0]), resUrl: null };
      data.pdfs.push(p);
      return;
    }
    // resource page of unknown type (video clip, pdf file, image) — resolve later
    if (!resourceUrls.has(resUrl)) resourceUrls.set(resUrl, {});
  });

  // resolve each unique resource page
  await pool([...resourceUrls.entries()], 4, async ([rUrl, slot]) => {
    try {
      const rHtml = await fetchText(rUrl);
      const $r = cheerio.load(rHtml);
      const vEl = $r(".video-container video[data-setup]").get(0);
      const v = vEl ? parseVideosFromHtml(rHtml)[0] : null;
      if (v) {
        const ogTitle = clean(($r("meta[property='og:title']").attr("content") ?? "").replace(/\s*\|\s*.*$/, ""));
        if (ogTitle) v.title = ogTitle; // resource pages: og:title beats drawer h3 context
        v.isRecitation = /recitation/i.test(rUrl) || /recitation/i.test(ogTitle) || v.isRecitation;
        data.videos.push(v);
        return;
      }
      // skip transcript pdfs of videos (e.g. "<hash>_<ytId>.pdf" titled "English")
      const pdfA = $r("a[href$='.pdf']").filter((_, el) => !/transcript/i.test($(el).text()));
      const pdfHref = pdfA.first().attr("href");
      if (pdfHref) {
        const fileUrl = abs(pdfHref.split("?")[0]);
        const ogTitle = ($r("meta[property='og:title']").attr("content") ?? "").replace(/\s*\|\s*.*$/, "").trim();
        if (slot.pdf) {
          slot.pdf.fileUrl = fileUrl;
        } else if (/^(english|transcript)$/i.test(ogTitle) || /_[\w-]{11}\.pdf$/.test(fileUrl)) {
          return; // video transcript pdf — not course content
        } else {
          data.pdfs.push({ title: ogTitle || "PDF", fileUrl, resUrl: rUrl });
        }
        return;
      }
      const pngHref = $r("a[href$='.png']").first().attr("href") ?? $r("img[src*='/courses/'][src*='.png']").first().attr("src");
      if (pngHref && slot.board) slot.board.fullUrl = abs(pngHref.split("?")[0]);
    } catch (err) {
      log(`WARN resource failed ${rUrl}: ${(err as Error).message}`);
    }
  });

  // dedupe videos by ytId+start+end, merging titles/vtt (embedded vs "View video page")
  const seenV = new Map<string, VideoData>();
  data.videos = data.videos.filter((v) => {
    const k = `${v.ytId}:${v.start}:${v.end}`;
    const prev = seenV.get(k);
    if (!prev) {
      seenV.set(k, v);
      return true;
    }
    if (!prev.title && v.title) prev.title = v.title;
    if (prev.title && v.title && v.title.length > prev.title.length && !/^(learning resource types)$/i.test(prev.title)) prev.title = v.title;
    if (!prev.vttUrl && v.vttUrl) prev.vttUrl = v.vttUrl;
    if (v.isRecitation && !prev.isRecitation) prev.isRecitation = true;
    return false;
  });
  // dedupe boards by resUrl
  const seenB = new Set<string>();
  data.boards = data.boards.filter((b) => (seenB.has(b.resUrl) ? false : (seenB.add(b.resUrl), true)));
  // dedupe pdfs by fileUrl
  const seenP = new Set<string>();
  data.pdfs = data.pdfs.filter((p) => (seenP.has(p.fileUrl) ? false : (seenP.add(p.fileUrl), true)));

  return data;
}

export interface Node {
  url: string;
  slug: string;
  data: PageData;
  children: Node[];
}

async function main() {
  const homeHtml = await fetchText(abs(COURSE_PATH + "/"));
  const $home = cheerio.load(homeHtml);
  const unitUrls = new Set<string>();
  $home("nav.course-nav a.nav-link[href*='/pages/']").each((_, el) => {
    const href = $home(el).attr("href")!;
    const m = href.match(/\/pages\/([^/]+)\/$/);
    if (!m || m[1] === "syllabus") return;
    unitUrls.add(abs(href));
  });
  log(`units: ${unitUrls.size}`);

  const units: Node[] = [];
  await pool([...unitUrls], 4, async (u) => {
    units.push({ url: u, slug: slugOf(u), data: await parsePage(u, `${COURSE_PATH}/pages/${slugOf(u)}/`), children: [] });
  });
  units.sort((a, b) => a.url.localeCompare(b.url));

  for (const unit of units) {
    const childUrls = unit.data.childLinks;
    log(`${unit.slug}: ${childUrls.length} children`);
    const nodes = await pool(childUrls, 4, async (cu): Promise<Node> => {
      const data = await parsePage(cu, `${COURSE_PATH}/pages/${unit.slug}/${slugOf(cu)}/`);
      return { url: cu, slug: data.slug, data, children: [] };
    });
    const parts = nodes.filter((n) => n.data.childLinks.length > 0);
    const direct = nodes.filter((n) => n.data.childLinks.length === 0);

    // resolve part entries
    for (const p of parts) {
      const prefix = `${COURSE_PATH}/pages/${unit.slug}/${p.slug}/`;
      const entries = await pool(p.data.childLinks, 4, (eu) => parsePage(eu, prefix));
      p.children = entries.map((e) => ({ url: e.url, slug: e.slug, data: e, children: [] }));
    }

    // drop direct leaves that already appear inside any part subtree
    const inParts = new Set<string>();
    for (const p of parts) for (const c of p.children) inParts.add(c.url);
    const leftovers = direct.filter((n) => !inParts.has(n.url));
    if (leftovers.length) {
      parts.push({ url: unit.url, slug: unit.slug, data: unit.data, children: leftovers });
    }
    unit.children = parts;
  }

  writeJson(path.join(PROJECT_ROOT, ".cache/raw-structure.json"), { units });
  log("wrote raw-structure.json");

  let nV = 0, nB = 0, nP = 0, nE = 0;
  for (const u of units)
    for (const p of u.children)
      for (const e of p.children) {
        nE++;
        nV += e.data.videos.length;
        nB += e.data.boards.length;
        nP += e.data.pdfs.length;
      }
  log(`entries=${nE} videos=${nV} boards=${nB} pdfs=${nP}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
