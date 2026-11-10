import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const pages = ["index.html", "projects.html", "404.html", "audit.html"];
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
for (const key of ["brandHomeLabel", "academicFocusLabel"]) {
}
assert.match(js, /document\.documentElement\.dir\s*=\s*currentLanguage === "FA" \? "rtl" : "ltr"/, "RTL/LTR switching missing");
assert.match(css, /html\[dir="rtl"\]/, "RTL CSS missing");
assert.match(css, /prefers-reduced-motion:\s*reduce/, "reduced-motion CSS missing");
assert.match(js, /prefers-reduced-motion/, "motion JS ignores reduced-motion preference");
assert.match(js, /function setupNav\(\)/, "primary navigation setup missing");
assert.match(main, /class="top-glass-menu"/, "centered glass navigation missing");
assert.match(main, /data-menu-toggle[^>]*aria-expanded="false"[^>]*aria-controls="mobile-nav"/, "accessible mobile menu toggle missing");
assert.match(main, /<nav class="mobile-nav" id="mobile-nav"[^>]*hidden/, "mobile navigation must start closed");
assert.match(js, /event\.key === "Escape"/, "mobile navigation cannot be dismissed with Escape");
assert.match(main, /class="skip-link"/, "skip link missing");
assert.match(main, /class="hero-meta" role="group"/, "hero metadata label needs group semantics");
assert.match(main, /class="interest-list" role="group"/, "interest list label needs group semantics");
assert.match(main, /class="contact-links contact-method-grid" role="group"/, "contact methods label needs group semantics");
assert.match(main, /class="footer-langs" role="group"/, "footer language controls need group semantics");
assert.match(cases, /class="language-switcher" role="group"/, "project language controls need group semantics");
assert.match(cases, /class="footer-langs" role="group"/, "project footer language controls need group semantics");
for (const [source, page] of [[main, "home"], [cases, "projects"]]) {
  for (const lang of ["EN", "DE", "FA"]) assert.ok(source.includes('data-lang="' + lang + '" aria-label="' + lang + ' — '), page + ": accessible name must include visible language code " + lang);
}
assert.match(js, /langENLabel:"EN — English"/, "English language label translation missing");
assert.match(js, /langDELabel:"DE — German"/, "German language label translation missing");
assert.match(js, /langFALabel:"FA — Persian"/, "Persian language label translation missing");
assert.match(fs.readFileSync("404.html", "utf8"), /<a class="skip-link" href="#main">/, "404 keyboard skip link missing");
assert.match(fs.readFileSync("404.html", "utf8"), /<main class="error-page" id="main" tabindex="-1">/, "404 main target must be focusable");
assert.match(css, /--accent-warm: #a8441d;/, "light warm accent contrast token missing");

assert.match(css, /:focus-visible/, "keyboard focus style missing");
assert.match(css, /\.language-item::before/, "creative language card motif missing");
assert.match(css, /\.project-card:hover/, "project card interaction missing");
assert.equal((main.match(/<article class="skill-group reveal">/g)||[]).length,3,"Skills preview must retain exactly three category cards");
assert.equal((main.match(/<div class="skill-item">/g)||[]).length,17,"Skills preview must retain all 17 listed skills");
assert.doesNotMatch(css,/\.skill-item:hover::after\s*\{\s*width:\s*100%\s*;/,"skill hover must not force the proficiency bar to 100%");
assert.match(css,/#skills \.skill-item::after\s*\{\s*content:\s*none !important;\s*display:\s*none !important;\s*\}/,"duplicate hover underline must be disabled");
assert.match(css,/\.skill-group\.is-visible \.skill-meter span\s*\{\s*transform:\s*scaleX\(1\)/,"proficiency meter reveal rule missing");
assert.match(js,/function setupSkillMeters\(\)/,"proficiency meter setup missing");
assert.equal((main.match(/class="course-grade-item"/g)||[]).length,10,"Selected highlights must provide ten course-grade slots");
assert.match(main,/id="transcript-title"/,"transcript title and heading association missing");
assert.match(main,/data-i18n="transcriptTitle"/,"transcript title translation missing");
assert.match(main,/data-i18n="courseNamePlaceholder"/,"course-name placeholder missing");
assert.match(main,/data-i18n="gradePlaceholder"/,"grade placeholder missing");
assert.match(main,/data-i18n-aria="transcriptAriaLabel"/,"transcript list needs an accessible label");
assert.doesNotMatch(main,/data-dynamic="highlight-[0-3]"/,"old generic academic highlights must be removed");
assert.match(css,/#education \.course-grade-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,"desktop transcript two-column grid missing");
assert.match(css,/@media \(max-width: 760px\)[\s\S]*?#education \.course-grade-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/,"mobile transcript single-column layout missing");

assert.equal((main.match(/class="contact-row contact-method/g)||[]).length,4,"exactly four contact method cards are required");
assert.equal((main.match(/class="contact-brand-icon(?:\s|")/g)||[]).length,4,"four recognizable brand icons required");
for(const brand of ["GitHub","Gmail","LinkedIn","Telegram"]) assert.ok(main.includes(brand),"missing contact method "+brand);
assert.match(main,/contact-link-github[\s\S]*?<svg class="contact-brand-icon" viewBox="0 0 24 24"/,"GitHub logo missing");
assert.match(main,/contact-visual-linkedin[\s\S]*?<svg class="contact-brand-icon contact-brand-icon-linkedin" viewBox="0 0 48 48"/,"LinkedIn logo missing");
assert.equal((main.match(/class="contact-motion-art"/g)||[]).length,0,"decorative contact animations should be removed");
assert.match(css,/Contact cards: restrained motion, clearer brand marks/,"minimal contact overrides missing");
assert.match(css,/\.contact-links \.contact-motion-art \{ display: none !important; \}/,"decorative motion should be disabled");
assert.match(css,/\.contact-links \.contact-brand-icon \{[\s\S]*?animation: none !important;/,"static contact logos required");
assert.match(css,/html\[data-theme="dark"\] \.contact-links \.contact-visual/,"dark theme contact styling missing");
assert.doesNotMatch(main,/href="(?:mailto:|https?:\/\/)(?:YOUR|ADD_|your\.|add\.)/i,"placeholder contact URL must not be clickable");
assert.equal((main.match(/class="[^"]*\bcontact-method-placeholder\b/g)||[]).length,3,"three unset contact methods should remain placeholders");

assert.match(main,/contact-context-code[\s\S]*?git commit[\s\S]*?git push/,"GitHub code context missing");
assert.match(main,/contact-context-mail[\s\S]*?context-mail-at/,"Gmail @ context missing");
assert.match(main,/contact-context-resume[\s\S]*?Academic network/,"LinkedIn document context missing");
assert.match(main,/contact-context-chat[\s\S]*?Message\.\.\./,"Telegram message context missing");
assert.match(css,/@keyframes context-code-drift/,"code motion keyframe missing");
assert.match(css,/@keyframes context-chat-drift/,"chat motion keyframe missing");
assert.match(main, /class="[^"]*section-card-shell skills-shell"/, "skills card shell missing");
assert.match(main, /class="[^"]*section-card-shell languages-layout"/, "language card shell missing");
assert.match(main, /class="[^"]*section-card-shell publications-shell"/, "publication card shell missing");

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

const auditHtml = docs.get("audit.html");
const auditJs = fs.readFileSync("audit.js", "utf8");
const auditCss = fs.readFileSync("audit.css", "utf8");
assert.match(auditHtml, /id="pin-input"/, "audit console PIN gate missing");
assert.match(auditHtml, /id="dashboard"/, "audit dashboard missing");
assert.match(auditHtml, /id="download-button"/, "JSON report download missing");
assert.match(auditHtml, /id="print-button"/, "print/PDF report action missing");
assert.match(auditJs, /PBKDF2/, "PIN verifier must use a password-based KDF");
assert.match(auditJs, /runPageSpeed/, "PageSpeed Insights integration missing");
assert.ok(auditJs.includes("pagespeedonline.googleapis.com"), "canonical PageSpeed API endpoint missing");
assert.match(auditJs, /api.github.com/, "GitHub Actions integration missing");
assert.match(auditJs, /localStorage\.setItem\(REPORT_KEY/, "previous-run comparison snapshot missing");
assert.doesNotMatch(auditJs, /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/, "audit console must not use unsafe HTML sinks");
assert.match(auditCss, /@media print/, "print stylesheet missing");
assert.match(auditCss, /@media \(max-width: 520px\)/, "mobile audit layout missing");
assert.match(main, /class="audit-entry" href="\.\/audit\.html"[^>]*data-i18n="navAudit"/, "desktop navigation audit entry missing");
assert.match(main, /class="audit-entry-mobile" href="\.\/audit\.html"[^>]*data-i18n="navAudit"/, "mobile navigation audit entry missing");
assert.equal(js.split("\n").filter(line => line.includes("navAudit:")).length, 3, "audit navigation label must be translated in all three languages");
for (const source of [main, cases]) assert.match(source, /href="\.\/audit\.html"/, "site footer must link to the audit console");


const auditBridge = fs.readFileSync("audit-bridge.js", "utf8");
const axeVendor = fs.readFileSync("assets/vendor/axe-core-4.14.0.min.js", "utf8");
const axeLicense = fs.readFileSync("assets/vendor/AXE-CORE-LICENSE.txt", "utf8");
assert.match(auditHtml, /frame-src 'self'/, "audit page must allow only same-origin diagnostic frames");
assert.match(auditHtml, /https:\/\/validator\.w3\.org/, "W3C checker connect policy missing");
assert.match(auditBridge, /portfolio-audit-bridge/, "runtime bridge message protocol missing");
assert.match(boot, /audit-bridge\\.js\\?v=20261110-audit-bridge-v4/, "updated audit bridge cache key missing");
assert.match(auditBridge, /securitypolicyviolation/, "browser CSP violations are not captured");
assert.match(auditBridge, /unhandledrejection/, "unhandled promise rejections are not captured");
assert.match(auditBridge, /largest-contentful-paint/, "live LCP observer missing");
assert.match(auditBridge, /longtask/, "long-task observer missing");
assert.match(auditBridge, /axe\.run/, "axe-core execution missing");
assert.match(js, /langENLabel:"EN — English"/, "English language accessible label translation missing");
assert.match(js, /langDELabel:"DE — German"/, "German language accessible label translation missing");
assert.match(js, /langFALabel:"FA — Persian"/, "Persian language accessible label translation missing");
assert.ok(auditBridge.includes('document.fonts?.load(\'16px "Vazirmatn"\', "فارسی")'), "Vazirmatn probe must explicitly load the Persian font face");
assert.match(axeVendor, /axe v4\.14\.0/, "pinned axe-core version missing");
assert.ok(axeLicense.length > 1000, "axe-core MPL and third-party license notices missing");
assert.match(auditJs, /runBrowserPageAudit/, "live browser page runner missing");
assert.match(auditJs, /validateMarkup/, "W3C HTML validation integration missing");
assert.match(auditJs, /home-mobile[\s\S]*projects-desktop/, "Lighthouse must cover both pages and both form factors");
assert.match(auditHtml, /id="browser-runtime"/, "live browser report panel missing");
assert.match(auditHtml, /id="markup-panel"/, "W3C validation panel missing");

assert.match(auditBridge, /language-switcher/, "real three-language interaction probe missing");
assert.match(auditBridge, /themePersisted/, "theme persistence assertion missing");
assert.match(auditJs, /language-switcher/, "language interaction findings are not rendered");

assert.match(auditJs, /searchParams\.set\("audit", "1"\)/, "live probes must use direct-network cache-bypass URLs");
assert.match(auditJs, /checkCrawlFiles/, "robots and sitemap audits missing");
assert.match(auditJs, /check404Handling/, "real HTTP 404 probe missing");
const serviceWorker = fs.readFileSync("sw.js", "utf8");
assert.match(serviceWorker, /portfolio-static-v7/, "service worker cache version must be bumped after release changes");
assert.match(serviceWorker, /searchParams\.get\("audit"\) === "1"/, "service worker must bypass audit navigations");
assert.match(serviceWorker, /self\.clients\.get\(event\.clientId\)/, "service worker must bypass cached subresources for audit frames");

assert.match(auditHtml, /audit\.js\?v=20261110-audit-v6/, "audit engine cache key must match the final build");

assert.match(auditBridge, /const loadSnapshot = snapshot\(\)|loadSnapshot = snapshot\(\)/, "page-load metrics must be captured before diagnostics and interactions");
console.log("Deep quality audit: PASS (responsive semantics, local assets/fragments, language/theme persistence, RTL, reduced motion, keyboard navigation, case-study completeness and payload budgets).");


/* Hero visual: localized copy, early language direction, theme-aware depth and reduced motion. */
assert.match(boot, /root\.dir\s*=\s*language === "FA"\s*\?\s*"rtl"\s*:\s*"ltr"/, "pre-paint RTL direction assignment missing");
assert.match(boot, /root\.lang\s*=\s*language === "FA"\s*\?\s*"fa"\s*:\s*language\.toLowerCase\(\)/, "pre-paint language assignment missing");
for (const key of ["brandHomeLabel", "academicFocusLabel"]) {
  assert.ok(main.includes('data-i18n="' + key + '"') || main.includes('data-i18n-aria="' + key + '"'), "localized hero/accessibility key missing in HTML: " + key);
  assert.equal(js.split("\n").filter(line => line.includes(key + ":")).length, 3, "hero/accessibility translation must exist in all locales: " + key);
}
assert.match(css, /\.h3-links \{ display: none !important; \}/, "unnecessary vertical connection clutter should be removed");

assert.match(js, /function setupReveal\(\)[\s\S]*?IntersectionObserver/, "native reveal observer missing");
assert.doesNotMatch(js, /Lenis|ScrollTrigger|gsap|requestAnimationFrame/, "continuous animation runtime remains");
assert.match(css, /backdrop-filter: blur\(14px\) saturate\(125%\)/, "reduced navigation blur missing");
assert.match(css, /\.theme-toggle svg[\s\S]*?width: 18px !important;[\s\S]*?height: 18px !important;/, "fixed theme icon geometry missing");
assert.match(main, /viewBox="0 0 24 24" focusable="false"/, "theme icon SVG sizing missing");
assert.match(boot, /serviceWorker\.register/, "service worker registration missing");
