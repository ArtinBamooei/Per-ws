import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

assert.equal((js.match(/innerHTML/g) || []).length, 0, "Unsafe innerHTML remains in script.js");
assert.equal((html.match(/style\s*=/gi) || []).length, 0, "Inline style attributes violate the CSP");
assert.match(html, /Content-Security-Policy/, "CSP is missing");
assert.match(html, /rel="canonical"/, "Canonical URL is missing");
assert.match(html, /property="og:image"/, "OG image is missing");
assert.match(html, /name="twitter:card"/, "Twitter card is missing");
assert.match(html, /rel="icon"/, "Favicon is missing");
assert.match(html, /id="main"/, "Main landmark is missing");
assert.match(html, /class="skip-link"/, "Skip link is missing");
assert.match(html, /aria-current="page"/, "Initial active navigation state is missing");
assert.match(html, /\?lang=en/, "English language URL is missing");
assert.match(html, /\?lang=de/, "German language URL is missing");
assert.match(html, /\?lang=fa/, "Persian language URL is missing");
assert.match(css, /prefers-reduced-motion/, "Reduced-motion support is missing");
assert.match(css, /progress-42|progress-62|progress-100/, "Language progress classes are missing");

for (const href of [...html.matchAll(/href="(#[-\w]+)"/g)].map(m => m[1])) {
  assert.match(html, new RegExp(`id="${href.slice(1)}"`), `Missing internal target: ${href}`);
}

for (const link of [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(m => m[0])) {
  assert.match(link, /rel="[^"]*noopener[^"]*"/, "target=_blank link lacks noopener");
}

for (const section of ["home","intro","education","skills","languages","projects","publications","contact"]) {
  assert.match(html, new RegExp(`id="${section}"`), `Missing section: ${section}`);
}

console.log("Portfolio validation: PASS");
