import fs from "node:fs";
import assert from "node:assert/strict";

const pages = [
  ["index.html", fs.readFileSync("index.html", "utf8")],
  ["projects.html", fs.readFileSync("projects.html", "utf8")]
];
const errorPage = fs.readFileSync("404.html", "utf8");
const scripts = [
  ["script.js", fs.readFileSync("script.js", "utf8")],
  ["theme-init.js", fs.readFileSync("theme-init.js", "utf8")]
];

for (const [name, html] of pages) {
  assert.match(html, /Content-Security-Policy/, name + ": CSP missing");
  assert.match(html, /default-src 'self'/, name + ": default-src missing");
  assert.match(html, /object-src 'none'/, name + ": object-src missing");
  assert.match(html, /base-uri 'self'/, name + ": base-uri missing");
  assert.match(html, /script-src 'self'/, name + ": script-src missing");
  assert.match(html, /upgrade-insecure-requests/, name + ": HTTPS upgrade directive missing");
  assert.match(html, /frame-src 'none'/, name + ": frame-src missing");
  assert.match(html, /form-action 'self'/, name + ": form-action missing");
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/, name + ": referrer policy missing");
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/, name + ": unsafe CSP exception");
  assert.doesNotMatch(html, /<script\b[^>]*src="https?:\/\//i, name + ": externally hosted scripts must be self-hosted");
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net/i, name + ": external JS CDN should not be required");
  assert.doesNotMatch(html, /<script\b[^>]*>\s*[^<]/i, name + ": inline script content conflicts with CSP");
  assert.doesNotMatch(html, /<[^>]+\s+on[a-z]+\s*=/i, name + ": inline event handler conflicts with CSP");

  for (const match of html.matchAll(/<script\b[^>]*src="(https?:\/\/[^"]+)"[^>]*>/gi)) {
    const tag = match[0];
    const url = new URL(match[1]);
    const csp = html.match(/Content-Security-Policy" content="([^"]+)"/i)?.[1] ?? "";
    const scriptPolicy = csp.match(/(?:^|; )script-src ([^;]+)/)?.[1] ?? "";
    assert.ok(scriptPolicy.split(/\s+/).includes(url.origin), name + ": external script origin missing from CSP");
    assert.match(tag, /\bintegrity="sha384-[^"]+"/i, name + ": external script missing SHA-384 SRI");
    assert.match(tag, /\bcrossorigin="anonymous"/i, name + ": external script missing anonymous CORS mode");
    assert.match(match[1], /@\d+\.\d+\.\d+\//, name + ": external script version must be pinned");
  }

  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
    assert.match(match[0], /\brel="[^"]*\bnoopener\b[^"]*"/i, name + ": target=_blank without noopener");
  }
}
assert.match(errorPage, /Content-Security-Policy/, "404.html: CSP missing");
assert.match(errorPage, /object-src 'none'/, "404.html: object-src missing");
assert.match(errorPage, /base-uri 'self'/, "404.html: base-uri missing");
assert.match(errorPage, /name="robots" content="noindex"/, "404.html should not be indexed");

for (const [name, source] of scripts) {
  assert.doesNotMatch(source, /\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write\s*\(/, name + ": unsafe HTML sink detected");
  assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\s*\(/, name + ": dynamic code execution detected");
}
console.log("Security invariants: PASS (CSP, HTTPS upgrades, SRI-pinned external scripts, referrer policy, inline execution, external tab safety, 404 page and DOM/code sinks)");
