import fs from "node:fs";
import assert from "node:assert/strict";
const html=fs.readFileSync("index.html","utf8"), projects=fs.readFileSync("projects.html","utf8"), js=fs.readFileSync("script.js","utf8"), css=fs.readFileSync("styles.css","utf8"), boot=fs.readFileSync("theme-init.js","utf8"), sitemap=fs.readFileSync("sitemap.xml","utf8");
const version="20261010-33";
for(const [name,source] of [["index.html",html],["projects.html",projects]]){
 assert.match(source,/Content-Security-Policy/, `${name}: CSP missing`);
 assert.match(source,/object-src 'none'/, `${name}: object embedding not blocked`);
 assert.match(source,/base-uri 'self'/, `${name}: base URI not restricted`);
 assert.match(source,/script-src 'self'/, `${name}: scripts not restricted to same origin`);
 assert.match(source,/frame-src 'none'/, `${name}: frames not blocked`);
 assert.match(source,/worker-src 'none'/, `${name}: workers not blocked`);
 assert.match(source,/upgrade-insecure-requests/, `${name}: insecure subresource upgrade missing`);
 assert.match(source,/name="referrer" content="strict-origin-when-cross-origin"/, `${name}: referrer policy missing`);
 assert.doesNotMatch(source,/unsafe-inline|unsafe-eval/, `${name}: unsafe CSP exception found`);
 assert.ok(source.includes(`theme-init.js?v=${version}`),`${name}: theme cache version mismatch`);
 assert.ok(source.includes(`styles.css?v=${version}`),`${name}: CSS cache version mismatch`);
 assert.ok(source.includes(`script.js?v=${version}`),`${name}: JS cache version mismatch`);
 assert.match(source,/rel="canonical"/,`${name}: canonical URL missing`);
 assert.match(source,/rel="icon"/,`${name}: favicon missing`);
 assert.match(source,/class="skip-link"/,`${name}: skip link missing`);
 assert.match(source,/<main[^>]*id="main"[^>]*tabindex="-1"/,`${name}: main skip target missing`);
 for(const [lang,label] of [["EN","English"],["DE","Deutsch"],["FA","فارسی"]]) assert.match(source,new RegExp(`data-lang="${lang}"[^>]*aria-label="${label}"`),`${name}: ${lang} accessible label missing`);
 assert.ok(!source.includes("\\n  <link"),`${name}: escaped newline in head`);
 for(const a of [...source.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(m=>m[0])) assert.match(a,/rel="[^"]*noopener[^"]*"/,`${name}: unsafe target=_blank link`);
 for(const id of [...source.matchAll(/href="#([-\w]+)"/g)].map(m=>m[1])) assert.match(source,new RegExp(`id=["']${id}["']`),`${name}: broken anchor #${id}`);
}
assert.equal((js.match(/innerHTML/g)||[]).length,0,"innerHTML usage detected");
assert.equal((html.match(/style\s*=/gi)||[]).length,0,"inline styles violate CSP");
assert.match(html,/fonts\.googleapis\.com\/css2\?family=Vazirmatn/,"Vazirmatn font missing");
for(const id of ["air-quality","supermarket-analytics","machine-learning"]) { assert.match(html,new RegExp('<a class="project-card project-card-link reveal" href="./projects.html#'+id+'"'),`project card is not a whole-card link: ${id}`); assert.ok(projects.includes(`id="${id}"`),`missing detail ${id}`); }
assert.doesNotMatch(html,/data-i18n="caseStudyLink"|Case study ↗|مطالعه موردی/, "obsolete case-study card link remains");
assert.equal((html.match(/class="project-card project-card-link reveal"/g)||[]).length,3,"all project cards must be clickable links");
assert.equal((html.match(/class="project-card project-card-link reveal"/g)||[]).length,3,"exactly three full-card project links expected");
for (const card of [...html.matchAll(/<a class="project-card project-card-link reveal"[^>]*>([\s\S]*?)<\/a>/g)]) assert.doesNotMatch(card[1],/<a\b/,"nested anchor inside clickable project card");
assert.doesNotMatch(html,/Academic average placeholder|Placeholder academic statement|متن موقت برای معرفی کوتاه/,"placeholder academic copy remains");
assert.match(html,/href="https:\/\/github\.com\/ArtinBamooei"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,"GitHub contact link missing or unsafe");
assert.match(css,/prefers-reduced-motion/,"reduced motion support missing");
assert.match(css,/case-study-card/,"case study styling missing");
assert.match(css,/\.language-item::before/,"creative language card motif missing");
assert.match(css,/\.project-card:hover/,"project card interaction missing");
assert.match(html,/class="container section-card-shell skills-shell"/,"skills card shell missing");
assert.match(html,/class="container section-card-shell languages-layout"/,"language card shell missing");
assert.match(html,/class="container section-card-shell publications-shell"/,"publication card shell missing");
assert.match(js,/history\.replaceState/,"language URL sync missing");
assert.match(boot,/queryLanguage/,"URL language bootstrap missing");
for(const key of ["caseIntro","caseLead","airTitle","airSummary","superTitle","mlTitle","backToPortfolio"]) for(const lang of ["EN","DE","FA"]) assert.match(js,new RegExp(`${lang}:[\\s\\S]*?\\b${key}:`),`missing ${lang} translation for ${key}`);
for(const section of ["home","intro","education","skills","languages","projects","publications","contact"]) assert.match(html,new RegExp(`id=["']${section}["']`),`missing section ${section}`);
assert.ok(sitemap.includes("projects.html"),"case study page missing from sitemap");
assert.match(projects,/href="https:\/\/github\.com\/ArtinBamooei\/air-quality-monitor"[^>]*rel="noopener noreferrer"/,"repository link missing safe rel");

const translationKeys = [...new Set(
  [...html, ...projects].flatMap(source =>
    [...source.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(match => match[1])
  )
)];
for (const lang of ["EN", "DE", "FA"]) {
  assert.ok(js.includes(lang + ": {"), "Missing " + lang + " translation dictionary");
  for (const key of translationKeys) {
    const occurrences = (js.match(new RegExp("\\b" + key + ":", "g")) || []).length;
    assert.ok(occurrences >= 3, "Translation key is not defined in all locales: " + key);
  }
}
for (const [name, source] of [["index.html", html], ["projects.html", projects]]) {
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, name + ": duplicate id attribute found");
  assert.match(source, /<html lang="[^"]+" dir="(ltr|rtl)"/, name + ": initial language and direction missing");
}
console.log("Portfolio validation: PASS (two pages, anchors, complete i18n, duplicate IDs, aligned asset cache versions, CSP, SEO, external-link safety, no placeholders)");
