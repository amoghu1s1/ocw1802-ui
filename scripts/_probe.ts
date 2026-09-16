import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const url = "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/1.-vectors-and-matrices/part-c-parametric-equations-for-curves/session-15-equations-of-lines/";
const key = crypto.createHash("md5").update(url).digest("hex").slice(0, 24);
const html = fs.readFileSync(path.join(import.meta.dirname, "..", ".cache", "html", `${key}.txt`), "utf8");
const mc = html.slice(html.indexOf('id="course-content-section"'));
const re = /<video[^>]*data-setup='([\s\S]*?)'[\s\S]*?<\/video>/g;
let m: RegExpExecArray | null;
while ((m = re.exec(mc))) {
  const hs = [...mc.slice(0, m.index).matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)];
  console.log("match at", m.index, "ctx:", hs.length ? hs[hs.length - 1][1].slice(0, 60) : "NONE");
  console.log("  setup:", m[1].slice(0, 140));
}
