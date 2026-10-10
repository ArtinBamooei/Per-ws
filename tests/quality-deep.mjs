import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const pages = ["index.html", "projects.html", "404.html"];
const docs = new Map(pages.map(file => [file, fs.readFileSync(path.join(root, file), "utf8")]));
const main = docs.get("index.html");
const cases = docs.get("projects.html");
const js = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const boot = fs.readFileSync("theme-init.js", "utf8");

for (const [file, source] of docs) {
  assert.match(source, /<meta\s+name="viewport"[^>]*width=device-width/i, file + ": viewport missing");
  assert.match(source, /<main\b/i, file + ": main landmark missing");
  assert.match(source, /<title>[^<]{3,}<\/title>/i, file + ": title missing");
  assert.match(source, /<meta\s+name="description"[^>]*content="[^"]{40,}"/i, file + ": useful description missing");
  assert.match(source, /<html\s+lang="[^"]+"\s+dir="(?:ltr|rtl)"/i, file + ": language/direction missing");
  assert.doesNotMatch(source, /href=["']javascript:/i, file + ": javascript URL found");
  assert.doesNotMatch(source, /<img\b(?![^>]*\balt=)[^>]*>/i, file + ": image without alt");
  assert.doesNotMatch(source, /<(?:button|a)\b[^>]*>\s*<\/(?:button|a)>/i, file + ": empty interactive control");
  for (const match of source.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
    assert.match(match[0], /\brel="[^"]*noopener[^"]*"/i, file + ": unsafe external link");
  }
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, file + ": duplicate IDs");
  const idSet = new Set(ids);
  for (const match of source.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(idSet.has(match[1]), file + ": broken fragment #" + match[1]);
  }
  for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/gi)) {
    const url = match[1];
    if (/^(https?:|mailto:|tel:|data:|#)/i.test(url)) continue;
    const localPath = url.split(/[?#]/, 1)[0];
    if (!localPath) continue;
    const resolved = path.normalize(path.join(root, path.dirname(file), localPath));
    assert.ok(resolved === root || resolved.startsWith(root + path.sep), file + ": path traversal");
    assert.ok(fs.existsSync(resolved), file + ": missing local asset/link " + url);
  }
}

for (const lang of ["EN", "DE", "FA"]) {
  assert.ok(main.includes('data-lang="' + lang + '"'), "home missing language " + lang);
  assert.ok(cases.includes('data-lang="' + lang + '"'), "case studies missing language " + lang);
  assert.ok(js.includes(lang + ": {"), "missing translation dictionary " + lang);
}
assert.match(js, /localStorage\.setItem\(["']portfolio-language["']/, "language persistence missing");
assert.match(js, /localStorage\.setItem\(["']portfolio-theme["']/, "theme persistence missing");
assert.match(js, /history\.replaceState/, "language URL synchronization missing");
assert.match(boot, /queryLanguage/, "pre-paint language bootstrap missing");
assert.match(js, /document\.documentElement\.dir\s*=\s*currentLanguage === "FA" \? "rtl" : "ltr"/, "RTL/LTR switching missing");
assert.match(css, /html\[dir="rtl"\]/, "RTL CSS missing");
assert.match(css, /prefers-reduced-motion:\s*reduce/, "reduced-motion CSS missing");
assert.match(js, /prefers-reduced-motion/, "motion JS ignores reduced-motion preference");
assert.match(js, /function setupNav\(\)/, "primary navigation setup missing");
assert.match(main, /class="top-glass-menu"/, "centered glass navigation missing");
assert.doesNotMatch(main, /data-menu-toggle|data-mobile-nav/, "obsolete hamburger navigation remains");
assert.match(main, /class="skip-link"/, "skip link missing");
assert.match(css, /:focus-visible/, "keyboard focus style missing");

for (const id of ["air-quality", "supermarket-analytics", "machine-learning"]) {
  assert.ok(cases.includes('id="' + id + '"'), "missing case study " + id);
  assert.ok(main.includes("./projects.html#" + id), "home link missing for " + id);
}
for (const key of ["caseScope", "caseApproach", "caseEvidence", "caseLimits"]) {
  assert.ok(cases.includes('data-i18n="' + key + '"'), "case-study section missing " + key);
}
assert.match(main, /id="education"/, "education section missing");
assert.match(main, /id="publications"/, "academic work section missing");
assert.match(main, /github\.com\/ArtinBamooei/, "GitHub profile link missing");
assert.match(fs.readFileSync("sitemap.xml", "utf8"), /projects\.html/, "case studies absent from sitemap");
assert.ok(Buffer.byteLength(css, "utf8") < 200000, "CSS payload exceeds 200 KB");
assert.ok(Buffer.byteLength(js, "utf8") < 150000, "JS payload exceeds 150 KB");
assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write\s*\(/, "unsafe HTML sink introduced");
console.log("Deep quality audit: PASS (responsive semantics, local assets/fragments, language/theme persistence, RTL, reduced motion, keyboard navigation, case-study completeness and payload budgets).");
