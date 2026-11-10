(() => {
  "use strict";

  const SITE_URL = "https://artinbamooei.github.io/Per-ws/";
  const REPOSITORY = "ArtinBamooei/Per-ws";
  const REPORT_KEY = "portfolio-audit-last-report-v1";
  const PIN_SALT = "6f3d9a2c7814b5e0c1a7f946d3028b55";
  const PIN_HASH = "dd75fb1a3cdb09622d3fd8025380a7027596ebb6fd23be8da5e64dcc6e047ba9";
  const PIN_ITERATIONS = 160000;

  const $ = (selector, root = document) => root.querySelector(selector);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const state = {
    results: [],
    lighthouse: {},
    ciRuns: [],
    assets: null,
    serviceWorker: null,
    vitals: [],
    running: false,
    filter: "all"
  };
  function hex(buffer) {
    return [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, "0")).join("");
  }

  async function verifyPin(pin) {
    if (!window.crypto?.subtle) throw new Error("مرورگر از Web Crypto پشتیبانی نمی‌کند.");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: Uint8Array.from(PIN_SALT.match(/.{2}/g), byte => parseInt(byte, 16)),
      iterations: PIN_ITERATIONS,
      hash: "SHA-256"
    }, key, 256);
    return hex(bits) === PIN_HASH;
  }

  function addResult(category, title, status, evidence, impact, recommendation) {
    state.results.push({ category, title, status, evidence, impact, recommendation });
  }

  function setProgress(percent, title, detail) {
    $("#progress-bar").value = Math.max(0, Math.min(100, percent));
    $("#progress-title").textContent = title;
    $("#progress-detail").textContent = detail || "";
  }

  function bytesLabel(bytes) {
    if (!Number.isFinite(bytes)) return "نامشخص";
    if (bytes < 1024) return Math.round(bytes) + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function msLabel(value) {
    if (!Number.isFinite(value)) return "داده موجود نیست";
    return value >= 1000 ? (value / 1000).toFixed(2) + " s" : Math.round(value) + " ms";
  }

  function classify(metric, value) {
    if (!Number.isFinite(value)) return "unknown";
    const limits = {
      lcp: [2500, 4000],
      inp: [200, 500],
      cls: [0.1, 0.25],
      fcp: [1800, 3000],
      ttfb: [800, 1800]
    };
    const pair = limits[metric];
    if (!pair) return "unknown";
    return value <= pair[0] ? "pass" : value <= pair[1] ? "warn" : "fail";
  }

  function fieldValue(metrics, key, divide = 1) {
    const metric = metrics && metrics[key];
    if (!metric || !Number.isFinite(metric.percentile)) return null;
    return metric.percentile / divide;
  }

  function auditValue(lighthouse, key) {
    const value = lighthouse?.audits?.[key]?.numericValue;
    return Number.isFinite(value) ? value : null;
  }

  function getFieldMetrics(psi) {
    return psi?.loadingExperience?.metrics || psi?.originLoadingExperience?.metrics || {};
  }

  function extractVitals(psi) {
    const audits = psi?.lighthouseResult;
    const field = getFieldMetrics(psi);
    const metrics = [
      { key: "lcp", label: "LCP", field: fieldValue(field, "LARGEST_CONTENTFUL_PAINT_MS"), lab: auditValue(audits, "largest-contentful-paint"), unit: "زمان نمایش بزرگ‌ترین محتوا" },
      { key: "inp", label: "INP", field: fieldValue(field, "INTERACTION_TO_NEXT_PAINT"), lab: null, unit: "تأخیر تعامل کاربر" },
      { key: "cls", label: "CLS", field: fieldValue(field, "CUMULATIVE_LAYOUT_SHIFT_SCORE", 1000), lab: auditValue(audits, "cumulative-layout-shift"), unit: "پایداری چیدمان" },
      { key: "fcp", label: "FCP", field: fieldValue(field, "FIRST_CONTENTFUL_PAINT_MS"), lab: auditValue(audits, "first-contentful-paint"), unit: "اولین نمایش محتوای صفحه" },
      { key: "ttfb", label: "TTFB", field: fieldValue(field, "EXPERIMENTAL_TIME_TO_FIRST_BYTE_MS") ?? fieldValue(field, "EXPERIMENTAL_TIME_TO_FIRST_BYTE"), lab: null, unit: "زمان دریافت اولین بایت" }
    ];
    return metrics.map(metric => {
      const value = metric.field ?? metric.lab;
      return { ...metric, value, source: metric.field !== null ? "داده میدانی CrUX (صدک ۷۵)" : metric.lab !== null ? "آزمایشگاه Lighthouse" : "داده موجود نیست", status: classify(metric.key, value) };
    });
  }

  async function fetchWithTimeout(url, options = {}, timeout = 65000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function runPageSpeed(strategy) {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", SITE_URL);
    endpoint.searchParams.set("strategy", strategy);
    ["performance", "accessibility", "best-practices", "seo"].forEach(category => endpoint.searchParams.append("category", category));
    const response = await fetchWithTimeout(endpoint.toString(), { headers: { Accept: "application/json" } }, 70000);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error("PageSpeed API: HTTP " + response.status + (body ? " · " + body.slice(0, 150) : ""));
    }
    const data = await response.json();
    if (!data.lighthouseResult) throw new Error("پاسخ PageSpeed فاقد lighthouseResult است.");
    return data;
  }

  function statusFromScore(score) {
    if (!Number.isFinite(score)) return "unknown";
    return score >= 0.9 ? "pass" : score >= 0.5 ? "warn" : "fail";
  }

  function scoreLabel(score) {
    return Number.isFinite(score) ? Math.round(score * 100) : "—";
  }

  async function scanDocument(path) {
    const pageUrl = new URL(path, SITE_URL);
    try {
      const response = await fetchWithTimeout(pageUrl.href, { cache: "no-store" }, 20000);
      if (!response.ok) {
        addResult("ساختار صفحات", "دسترسی به " + path, "fail", "HTTP " + response.status, "صفحه برای کاربر بارگذاری نمی‌شود.", "مسیر و وضعیت انتشار فایل را بررسی کن.");
        return null;
      }
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      inspectDocument(doc, pageUrl, path);
      const references = collectLocalReferences(doc, pageUrl);
      const broken = await checkLocalReferences(references, path);
      if (broken.length) {
        addResult("دارایی‌ها و پیوندها", "پیوندها و منابع داخلی " + path, "fail",
          broken.length + " مسیر داخلی ناموفق: " + broken.slice(0, 6).join("، "),
          "لینک خراب یا فایل جاافتاده باعث صفحه ناقص یا خطای ناوبری می‌شود.",
          "نام و مسیر فایل‌ها، حروف بزرگ/کوچک و آدرس‌های نسبی را اصلاح کن.");
      } else {
        addResult("دارایی‌ها و پیوندها", "پیوندها و منابع داخلی " + path, "pass",
          references.length + " ارجاع داخلی بررسی شد و پاسخ ناموفق پیدا نشد.",
          "مسیرهای داخلی بررسی‌شده در دسترس هستند.",
          "پس از افزودن فایل یا صفحه جدید، همین آزمون را دوباره اجرا کن.");
      }
      return { path, url: pageUrl, doc, html, response };
    } catch (error) {
      addResult("ساختار صفحات", "بررسی " + path, "fail", error.message || "خطای شبکه",
        "نتیجه این صفحه قابل تأیید نیست.", "دسترسی شبکه و انتشار GitHub Pages را بررسی کن.");
      return null;
    }
  }

  function inspectDocument(doc, pageUrl, path) {
    const root = doc.documentElement;
    const title = doc.querySelector("title")?.textContent.trim() || "";
    const description = doc.querySelector('meta[name="description"]')?.content.trim() || "";
    const viewport = doc.querySelector('meta[name="viewport"]');
    const main = doc.querySelectorAll("main");
    const h1 = doc.querySelectorAll("h1");
    const language = root.getAttribute("lang");
    const ids = [...doc.querySelectorAll("[id]")].map(node => node.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const brokenAnchors = [];
    for (const anchor of doc.querySelectorAll('a[href^="#"]')) {
      const fragment = decodeURIComponent(anchor.getAttribute("href").slice(1));
      if (fragment && !doc.getElementById(fragment)) brokenAnchors.push("#" + fragment);
    }

    addResult("SEO و فراداده", path + " · عنوان صفحه", title.length >= 15 && title.length <= 65 ? "pass" : "warn",
      title || "عنوان صفحه وجود ندارد.",
      "عنوان دقیق در تب مرورگر و نتیجه جست‌وجو اثر دارد.",
      "عنوان یکتا، توصیفی و ترجیحاً حدود ۱۵ تا ۶۵ نویسه نگه دار.");
    addResult("SEO و فراداده", path + " · توضیحات متا", description.length >= 70 && description.length <= 170 ? "pass" : description ? "warn" : "fail",
      description ? description.length + " نویسه" : "meta description پیدا نشد.",
      "توضیحات ضعیف می‌تواند نمایش نتیجه جست‌وجو را کم‌اثر کند.",
      "برای هر صفحه توضیح یکتا و مرتبط بنویس.");
    addResult("ساختار صفحات", path + " · viewport", viewport ? "pass" : "fail",
      viewport ? viewport.content : "meta viewport وجود ندارد.",
      "نبود viewport چیدمان موبایل را مختل می‌کند.",
      "meta viewport با width=device-width و initial-scale=1 اضافه کن.");
    addResult("ساختار صفحات", path + " · زبان سند", language && ["fa", "en", "de"].includes(language.toLowerCase()) ? "pass" : "warn",
      "lang=" + (language || "خالی") + "، dir=" + (root.getAttribute("dir") || "خالی"),
      "زبان اشتباه یا نامشخص برای صفحه‌خوان و پردازش زبان مشکل ایجاد می‌کند.",
      "زبان و جهت سند را متناسب با محتوای اولیه تنظیم کن.");
    addResult("دسترس‌پذیری", path + " · ساختار landmark", main.length === 1 ? "pass" : "warn",
      "تعداد main: " + main.length,
      "ساختار landmark به پیمایش سریع کاربران صفحه‌خوان کمک می‌کند.",
      "یک main مشخص و landmarks معنایی برای بخش‌های اصلی نگه دار.");
    addResult("دسترس‌پذیری", path + " · سلسله‌مراتب عنوان", h1.length === 1 ? "pass" : "warn",
      "تعداد H1: " + h1.length,
      "ساختار عنوان نامنظم فهم محتوای صفحه را دشوار می‌کند.",
      "یک عنوان اصلی H1 و زیرعنوان‌های منطقی H2/H3 داشته باش.");
    addResult("ساختار صفحات", path + " · شناسه‌های یکتا و پیوندهای لنگر", !duplicateIds.length && !brokenAnchors.length ? "pass" : "fail",
      "شناسه تکراری: " + duplicateIds.length + " · لنگر خراب: " + brokenAnchors.length,
      "شناسه تکراری و anchor شکسته می‌تواند ناوبری و اسکریپت‌ها را مختل کند.",
      "IDها را یکتا و مقصد تمام hrefهای # را موجود نگه دار.");
    const skip = doc.querySelector('a.skip-link[href^="#"]');
    addResult("دسترس‌پذیری", path + " · پیوند پرش به محتوا", skip ? "pass" : "warn",
      skip ? "Skip link موجود است." : "Skip link پیدا نشد.",
      "کاربران صفحه‌کلید برای عبور از ناوبری به آن نیاز دارند.",
      "یک skip link قابل مشاهده هنگام فوکوس در ابتدای صفحه قرار بده.");

    const missingAlt = [...doc.querySelectorAll("img")].filter(img => !img.hasAttribute("alt"));
    addResult("دسترس‌پذیری", path + " · متن جایگزین تصاویر", missingAlt.length ? "fail" : "pass",
      missingAlt.length ? missingAlt.length + " تصویر فاقد ویژگی alt است." : doc.images.length + " تصویر دارای ویژگی alt هستند.",
      "تصویر بدون alt برای صفحه‌خوان قابل توصیف نیست.",
      "برای تصویر محتوایی alt توصیفی و برای تصویر تزئینی alt خالی بگذار.");
    const unnamedButtons = [...doc.querySelectorAll("button")].filter(button =>
      !button.textContent.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title")
    );
    addResult("دسترس‌پذیری", path + " · نام قابل دسترس دکمه‌ها", unnamedButtons.length ? "warn" : "pass",
      unnamedButtons.length + " دکمه بدون متن یا نام دسترس‌پذیر.",
      "کنترل بدون نام در صفحه‌خوان قابل تشخیص نیست.",
      "برای هر کنترل آیکونی aria-label یا متن قابل فهم تعریف کن.");
    const unlabeledInputs = [...doc.querySelectorAll("input,select,textarea")].filter(input => {
      if (input.type === "hidden") return false;
      return !input.labels?.length && !input.getAttribute("aria-label") && !input.getAttribute("aria-labelledby");
    });
    addResult("دسترس‌پذیری", path + " · برچسب فیلدها", unlabeledInputs.length ? "warn" : "pass",
      unlabeledInputs.length + " ورودی بدون label یا نام ARIA.",
      "فرم‌های بدون برچسب مانع تکمیل صحیح برای برخی کاربران می‌شوند.",
      "از label صریح یا aria-labelledby استفاده کن.");

    const unsafeExternal = [...doc.querySelectorAll('a[target="_blank"]')].filter(a =>
      !/\bnoopener\b/.test(a.rel) || !/\bnoreferrer\b/.test(a.rel)
    );
    addResult("امنیت", path + " · پیوندهای تب جدید", unsafeExternal.length ? "warn" : "pass",
      unsafeExternal.length + " پیوند target=_blank بدون هر دو ویژگی noopener و noreferrer.",
      "پیوند خارجی می‌تواند در صورت نبود محافظت به صفحه بازکننده دسترسی داشته باشد.",
      "برای target=_blank، rel=noopener noreferrer تعریف کن.");
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "";
    const cspStrong = csp.includes("default-src 'self'") && csp.includes("object-src 'none'") && csp.includes("base-uri 'self'");
    addResult("امنیت", path + " · Content Security Policy", cspStrong ? "pass" : "warn",
      csp ? csp.slice(0, 180) + "…" : "CSP meta tag یافت نشد.",
      "CSP ضعیف‌تر، سطح حملات تزریق اسکریپت و منابع ناخواسته را افزایش می‌دهد.",
      "CSP سخت‌گیرانه را در صورت امکان به‌صورت HTTP response header سمت میزبان تنظیم کن؛ meta جایگزین کامل header نیست.");
    const inlineScripts = [...doc.querySelectorAll("script:not([src])")].filter(script => script.textContent.trim());
    const inlineHandlers = [...doc.querySelectorAll("*")].filter(node =>
      [...node.attributes].some(attribute => /^on/i.test(attribute.name))
    );
    addResult("امنیت", path + " · اسکریپت و handler درون‌خطی", inlineScripts.length || inlineHandlers.length ? "warn" : "pass",
      "inline script: " + inlineScripts.length + " · inline event handler: " + inlineHandlers.length,
      "اسکریپت درون‌خطی سیاست CSP را پیچیده و سطح ریسک تزریق را بیشتر می‌کند.",
      "منطق اجرایی را در فایل‌های JS هم‌مبدأ نگه دار و از handlerهای HTML پرهیز کن.");
    const externalScripts = [...doc.querySelectorAll("script[src]")].filter(script => new URL(script.src, pageUrl).origin !== pageUrl.origin);
    addResult("امنیت", path + " · وابستگی اسکریپت ثالث", externalScripts.length ? "warn" : "pass",
      externalScripts.length + " اسکریپت خارجی.",
      "اسکریپت ثالث می‌تواند زنجیره تأمین و حریم خصوصی را تحت تأثیر قرار دهد.",
      "در صورت امکان اسکریپت‌ها را self-host کن؛ برای منابع خارجی integrity و نسخه ثابت لازم است.");

    const canonical = doc.querySelector('link[rel="canonical"]')?.href || "";
    addResult("SEO و فراداده", path + " · canonical", canonical ? "pass" : "warn",
      canonical || "canonical وجود ندارد.",
      "canonical به موتور جست‌وجو برای تشخیص URL مرجع کمک می‌کند.",
      "برای صفحه‌های قابل ایندکس canonical دقیق و یکتا تعیین کن.");
    const social = doc.querySelector('meta[property="og:title"]') && doc.querySelector('meta[property="og:description"]');
    addResult("SEO و فراداده", path + " · Open Graph", social ? "pass" : "warn",
      social ? "og:title و og:description موجودند." : "فراداده اشتراک‌گذاری ناقص است.",
      "نمایش لینک هنگام اشتراک‌گذاری ممکن است ناقص باشد.",
      "og:title، og:description، og:url و og:image متناسب با صفحه تنظیم کن.");
    const lazyCandidates = [...doc.querySelectorAll("img")].filter(img => {
      const rect = img.getAttribute("loading");
      return !rect && !img.closest("header, .hero");
    });
    addResult("عملکرد و منابع", path + " · بارگذاری تنبل تصاویر", lazyCandidates.length ? "info" : "pass",
      lazyCandidates.length + " تصویر خارج از بخش hero بدون loading=lazy.",
      "بارگذاری هم‌زمان تصاویر پایین صفحه می‌تواند مصرف شبکه را افزایش دهد.",
      "برای تصاویر پایین صفحه loading=lazy و برای تصویر اصلی ابعاد صریح تعریف کن.");
  }

  function collectLocalReferences(doc, pageUrl) {
    const unique = new Set();
    for (const node of doc.querySelectorAll("[src], [href], [poster]")) {
      const raw = node.getAttribute("src") || node.getAttribute("href") || node.getAttribute("poster");
      if (!raw || /^(?:#|https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(raw)) continue;
      try {
        const url = new URL(raw, pageUrl);
        if (url.origin === pageUrl.origin) {
          if (url.hash && url.pathname === pageUrl.pathname && !url.search) continue;
          unique.add(url.href.split("#")[0]);
        }
      } catch (_) {}
    }
    return [...unique];
  }

  async function checkLocalReferences(references, path) {
    const broken = [];
    const queue = [...references];
    const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length) {
        const url = queue.shift();
        try {
          let response = await fetchWithTimeout(url, { method: "HEAD", cache: "no-store" }, 12000);
          if (response.status === 405 || response.status === 403) {
            response = await fetchWithTimeout(url, { cache: "no-store" }, 12000);
          }
          if (!response.ok) broken.push(url.replace(SITE_URL, "./"));
        } catch (_) {
          broken.push(url.replace(SITE_URL, "./"));
        }
      }
    });
    await Promise.all(workers);
    return broken;
  }

  async function checkAssets(pages) {
    const assetUrls = new Map();
    for (const page of pages.filter(Boolean)) {
      for (const node of page.doc.querySelectorAll('script[src], link[rel="stylesheet"][href], img[src], source[src]')) {
        const raw = node.getAttribute("src") || node.getAttribute("href");
        if (!raw) continue;
        try {
          const url = new URL(raw, page.url);
          if (url.origin !== location.origin) continue;
          assetUrls.set(url.href, url.pathname.split("/").pop() || url.pathname);
        } catch (_) {}
      }
    }
    const totals = { count: assetUrls.size, bytes: 0, failed: 0, types: { js: 0, css: 0, image: 0, other: 0 }, items: [] };
    const urls = [...assetUrls.entries()];
    const queue = [...urls];
    const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
      while (queue.length) {
        const [url, name] = queue.shift();
        try {
          const response = await fetchWithTimeout(url, { cache: "no-store" }, 16000);
          if (!response.ok) { totals.failed++; continue; }
          const size = (await response.arrayBuffer()).byteLength;
          totals.bytes += size;
          const ext = name.split(".").pop().toLowerCase();
          const type = ["js", "mjs"].includes(ext) ? "js" : ext === "css" ? "css" : ["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"].includes(ext) ? "image" : "other";
          totals.types[type]++;
          totals.items.push({ name, url, bytes: size, type });
        } catch (_) { totals.failed++; }
      }
    });
    await Promise.all(workers);
    totals.items.sort((a, b) => b.bytes - a.bytes);
    state.assets = totals;
    addResult("عملکرد و منابع", "دریافت فایل‌های محلی", totals.failed ? "warn" : "pass",
      totals.count + " منبع هم‌مبدأ · " + bytesLabel(totals.bytes) + " دریافت‌شده · " + totals.failed + " مورد ناموفق.",
      "منابع حجیم یا ناموفق می‌توانند بارگذاری و تجربه کاربر را تحت تأثیر قرار دهند.",
      "فایل‌های بزرگ را فشرده، تصاویر را به WebP/AVIF تبدیل و منابع غیرضروری را حذف کن.");
    renderAssets();
  }

  function renderAssets() {
    const data = state.assets;
    if (!data) return;
    const target = $("#asset-summary");
    target.replaceChildren();
    for (const [label, value] of [["حجم خوانده‌شده", bytesLabel(data.bytes)], ["تعداد فایل", data.count], ["ناموفق", data.failed]]) {
      const card = make("div", "asset-stat");
      card.append(make("strong", "", value), make("span", "", label));
      target.append(card);
    }
    const list = $("#asset-list");
    list.replaceChildren();
    data.items.slice(0, 7).forEach(item => {
      const row = make("div", "asset-row");
      row.append(make("span", "", item.name), make("strong", "", bytesLabel(item.bytes)));
      list.append(row);
    });
    if (!data.items.length) list.append(make("p", "empty-state", "منبع هم‌مبدأ دریافت‌شده‌ای ثبت نشد."));
  }

  async function checkServiceWorker() {
    const sw = { supported: "serviceWorker" in navigator, controller: Boolean(navigator.serviceWorker?.controller), registrations: 0, cacheNames: [], cacheEntries: 0, scriptOk: false };
    try {
      if (sw.supported) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const matches = registrations.filter(reg => reg.active?.scriptURL.endsWith("/sw.js") || reg.waiting?.scriptURL.endsWith("/sw.js"));
        sw.registrations = matches.length;
        const keys = await caches.keys();
        sw.cacheNames = keys.filter(key => key.startsWith("portfolio-static-"));
        for (const name of sw.cacheNames) {
          const cache = await caches.open(name);
          sw.cacheEntries += (await cache.keys()).length;
        }
        const response = await fetchWithTimeout(new URL("sw.js", SITE_URL).href, { cache: "no-store" }, 12000);
        if (response.ok) {
          const source = await response.text();
          sw.scriptOk = source.includes("cache.put") && source.includes("cache.match") && source.includes("clients.claim");
        }
      }
    } catch (_) {}
    state.serviceWorker = sw;
    addResult("کش و آفلاین", "ثبت Service Worker", sw.registrations ? "pass" : "warn",
      "پشتیبانی مرورگر: " + (sw.supported ? "بله" : "خیر") + " · registration: " + sw.registrations + " · controller: " + (sw.controller ? "فعال" : "در این نشست کنترل‌کننده نیست"),
      "نبود ثبت فعال، قابلیت cache-first و fallback آفلاین را محدود می‌کند.",
      "ثبت SW را پس از انتشار بررسی کن و بعد از تغییر نسخه، cache قدیمی را پاک‌سازی کن.");
    addResult("کش و آفلاین", "سلامت فایل Service Worker و Cache Storage", sw.scriptOk ? "pass" : "warn",
      "فایل sw.js: " + (sw.scriptOk ? "الگوی cache دیده شد" : "قابل تأیید نیست") + " · cacheها: " + sw.cacheNames.length + " · ورودی‌ها: " + sw.cacheEntries,
      "کش ناقص یا قدیمی ممکن است نسخه‌های ناسازگار فایل‌ها را ارائه دهد.",
      "نسخه cache و مسیرهای cache را پس از هر انتشار بررسی کن.");
    renderServiceWorker();
  }

  function renderServiceWorker() {
    const data = state.serviceWorker;
    if (!data) return;
    const node = $("#sw-panel");
    node.replaceChildren();
    const items = [
      ["Service Worker API", data.supported ? "پشتیبانی می‌شود" : "پشتیبانی نمی‌شود"],
      ["ثبت فعال sw.js", String(data.registrations)],
      ["کنترل صفحه فعلی", data.controller ? "فعال" : "هنوز فعال نیست"],
      ["Cache Storage", data.cacheNames.length + " cache"],
      ["ورودی‌های cache", String(data.cacheEntries)]
    ];
    items.forEach(([label, value]) => {
      const row = make("div", "sw-line");
      row.append(make("span", "", label), make("strong", "", value));
      node.append(row);
    });
  }

  async function inspectInteractionAssets(homePage) {
    if (!homePage) return;
    try {
      const [scriptResponse, styleResponse] = await Promise.all([
        fetchWithTimeout(new URL("script.js", SITE_URL).href, { cache: "no-store" }, 15000),
        fetchWithTimeout(new URL("styles.css", SITE_URL).href, { cache: "no-store" }, 15000)
      ]);
      const scriptText = scriptResponse.ok ? await scriptResponse.text() : "";
      const styleText = styleResponse.ok ? await styleResponse.text() : "";
      const themeOk = scriptResponse.ok
        && scriptText.includes("function setupTheme()")
        && scriptText.includes('qs("[data-theme-toggle]")')
        && scriptText.includes('localStorage.setItem("portfolio-theme", activeTheme)')
        && scriptText.includes("applyTheme(nextTheme)");
      addResult("تعامل و تجربه کاربری", "پیاده‌سازی تغییر تم", themeOk ? "pass" : "warn",
        "اسکریپت اصلی: " + (scriptResponse.ok ? "دریافت شد" : "ناموفق") + " · تنظیم حالت و ذخیره انتخاب: " + (themeOk ? "الگوی مورد انتظار موجود است" : "کامل تأیید نشد"),
        "مشکل در کنترل پوسته می‌تواند باعث ناهماهنگی دیداری یا عدم ماندگاری ترجیح کاربر شود.",
        "رفتار کلیک، aria-pressed و باقی‌ماندن انتخاب پس از reload را دستی هم آزمایش کن.");
      const reducedMotionOk = styleResponse.ok && /prefers-reduced-motion\s*:\s*reduce/.test(styleText);
      addResult("دسترس‌پذیری", "CSS برای کاهش حرکت", reducedMotionOk ? "pass" : "warn",
        styleResponse.ok ? (reducedMotionOk ? "قاعده prefers-reduced-motion در stylesheet پیدا شد." : "قاعده prefers-reduced-motion پیدا نشد.") : "فایل CSS دریافت نشد.",
        "حرکت غیرضروری می‌تواند برای برخی کاربران آزاردهنده باشد.",
        "برای prefers-reduced-motion: reduce همه transitionها و animationهای غیرضروری را محدود کن.");
      const mainToggle = homePage.doc.querySelector("[data-theme-toggle]");
      addResult("تعامل و تجربه کاربری", "وجود کنترل تغییر تم", mainToggle ? "pass" : "fail",
        mainToggle ? "کنترل تغییر پوسته در HTML وجود دارد؛ این آزمون کلیک واقعی را اجرا نمی‌کند." : "کنترل تغییر تم پیدا نشد.",
        "نبود کنترل، انتخاب حالت دیداری را از کاربر می‌گیرد.",
        "وجود کنترل، برچسب دسترس‌پذیر و رفتار آن را در هر دو پوسته بررسی کن.");
    } catch (error) {
      addResult("تعامل و تجربه کاربری", "بررسی فایل‌های تعامل و CSS", "warn", error.message || "دریافت منابع ناموفق بود.",
        "رفتار اجرایی تم و کاهش حرکت تأیید نشد.",
        "دسترسی به فایل‌های script.js و styles.css را بررسی کن.");
    }
  }

  async function checkSecurityHeaders(homePage) {
    if (!homePage) return;
    const headers = homePage.response.headers;
    const checks = [
      ["Content-Security-Policy", "Content-Security-Policy"],
      ["Strict-Transport-Security", "Strict-Transport-Security"],
      ["X-Content-Type-Options", "X-Content-Type-Options"],
      ["Referrer-Policy", "Referrer-Policy"],
      ["Permissions-Policy", "Permissions-Policy"]
    ];
    for (const [label, header] of checks) {
      const value = headers.get(header);
      const hasMetaFallback = label === "Content-Security-Policy"
        ? Boolean(homePage.doc.querySelector('meta[http-equiv="Content-Security-Policy"]'))
        : label === "Referrer-Policy" ? Boolean(homePage.doc.querySelector('meta[name="referrer"]')) : false;
      const status = value ? "pass" : hasMetaFallback ? "warn" : label === "Strict-Transport-Security" ? "warn" : "info";
      addResult("امنیت", "HTTP header · " + label, status,
        value ? value.slice(0, 180) : hasMetaFallback ? "Header موجود نیست؛ meta fallback در HTML دیده شد." : "Header در پاسخ قابل مشاهده نبود.",
        "هدرهای امنیتی در لایه پاسخ HTTP بهتر از meta tag قابل اعمال و قابل اتکا هستند.",
        "در میزبان یا proxy، هدرهای مناسب شامل CSP، HSTS، nosniff، Referrer-Policy و Permissions-Policy را تنظیم کن.");
    }
  }

  async function checkGitHubActions() {
    const url = "https://api.github.com/repos/" + REPOSITORY + "/actions/runs?branch=main&per_page=12";
    const response = await fetchWithTimeout(url, { headers: { Accept: "application/vnd.github+json" } }, 22000);
    if (!response.ok) throw new Error("GitHub API: HTTP " + response.status);
    const data = await response.json();
    const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
    state.ciRuns = runs;
    const quality = runs.find(run => /quality/i.test(run.name || ""));
    const pages = runs.find(run => /pages|deploy/i.test(run.name || ""));
    [quality, pages].forEach(run => {
      if (!run) return;
      const status = run.status === "completed"
        ? run.conclusion === "success" ? "pass" : "fail"
        : "warn";
      addResult("CI/CD و انتشار", "آخرین اجرای " + run.name, status,
        "status=" + run.status + " · conclusion=" + (run.conclusion || "در حال اجرا") + " · " + new Date(run.updated_at).toLocaleString("fa-IR"),
        "شکست pipeline یا انتشار ناقص ممکن است نسخه جدید را از دسترس خارج کند.",
        "جزئیات job ناموفق را در GitHub Actions باز کن و قبل از انتشار مجدد خطا را رفع کن.");
    });
    if (!quality) addResult("CI/CD و انتشار", "آخرین workflow کیفیت", "warn", "در ۱۲ اجرای اخیر workflow با نام Quality پیدا نشد.", "سلامت commitها از این بخش قابل تأیید نیست.", "وضعیت workflow و شاخه main را بررسی کن.");
    if (!pages) addResult("CI/CD و انتشار", "آخرین انتشار GitHub Pages", "warn", "در ۱۲ اجرای اخیر workflow انتشار پیدا نشد.", "وضعیت انتشار فعلی قطعی نیست.", "تنظیمات Pages و workflow مربوط به deploy را بررسی کن.");
    renderCI();
  }

  function renderCI() {
    const node = $("#ci-panel");
    node.replaceChildren();
    const desired = state.ciRuns.filter(run => /quality|pages|deploy/i.test(run.name || "")).slice(0, 6);
    if (!desired.length) {
      node.append(make("div", "empty-state", "اجرای مرتبطی از GitHub Actions دریافت نشد."));
      return;
    }
    desired.forEach(run => {
      const row = make("div", "ci-row");
      const main = make("div", "ci-main");
      const title = make("strong", "", run.name || "GitHub Actions");
      const detail = make("small", "", (run.head_branch || "branch نامشخص") + " · " + (run.head_sha || "").slice(0, 7) + " · " + new Date(run.updated_at).toLocaleString("fa-IR"));
      main.append(title, detail);
      const status = run.status === "completed" ? run.conclusion === "success" ? "pass" : "fail" : "warn";
      const pill = make("span", "status-pill " + status, run.status === "completed" ? (run.conclusion || "completed") : run.status);
      row.append(main, pill);
      row.tabIndex = 0;
      row.setAttribute("role", "link");
      row.setAttribute("aria-label", "باز کردن اجرای " + (run.name || "GitHub Actions"));
      row.addEventListener("click", () => window.open(run.html_url, "_blank", "noopener,noreferrer"));
      row.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.open(run.html_url, "_blank", "noopener,noreferrer");
        }
      });
      node.append(row);
    });
  }

  function renderLighthouse() {
    const grid = $("#psi-grid");
    grid.replaceChildren();
    for (const strategy of ["mobile", "desktop"]) {
      const data = state.lighthouse[strategy];
      const card = make("article", "psi-card");
      const head = make("div", "psi-card-head");
      head.append(make("strong", "psi-platform", strategy === "mobile" ? "موبایل" : "دسکتاپ"));
      head.append(make("span", "psi-state", data ? (data.lighthouseResult?.fetchTime ? new Date(data.lighthouseResult.fetchTime).toLocaleString("fa-IR") : "Lighthouse") : "داده دریافت نشد"));
      card.append(head);
      if (!data) {
        card.append(make("div", "empty-state", "PageSpeed Insights در دسترس نبود؛ محدودیت API، شبکه یا سهمیه ممکن است علت باشد."));
        grid.append(card);
        continue;
      }
      const scores = make("div", "score-grid");
      const categories = data.lighthouseResult.categories || {};
      const definitions = [
        ["performance", "Performance"], ["accessibility", "Accessibility"], ["best-practices", "Best Practices"], ["seo", "SEO"]
      ];
      definitions.forEach(([key, label]) => {
        const score = categories[key]?.score;
        const item = make("div", "score-item");
        const ring = make("div", "score-ring " + (statusFromScore(score) === "unknown" ? "" : "score-" + statusFromScore(score)));
        if (Number.isFinite(score)) ring.classList.add("score-value-" + Math.round(score * 20) * 5);
        ring.append(make("strong", "", scoreLabel(score)));
        item.append(ring, make("small", "", label));
        scores.append(item);
      });
      card.append(scores);
      grid.append(card);
    }
  }

  function renderVitals() {
    const grid = $("#vitals-grid");
    grid.replaceChildren();
    const platforms = [
      ["mobile", "موبایل"],
      ["desktop", "دسکتاپ"]
    ].filter(([key]) => Boolean(state.lighthouse[key]));
    if (!platforms.length) {
      grid.append(make("div", "empty-state", "شاخص‌های PageSpeed دریافت نشدند. پس از رفع دسترسی API دوباره اجرا کن."));
      return;
    }
    const allVitals = [];
    platforms.forEach(([key, label]) => {
      extractVitals(state.lighthouse[key]).forEach(metric => {
        allVitals.push({ ...metric, platform: label });
      });
    });
    state.vitals = allVitals;
    allVitals.forEach(metric => {
      const card = make("article", "vital-card");
      card.append(make("span", "", metric.platform + " · " + metric.label));
      const shown = metric.value === null ? "—" : metric.key === "cls" ? metric.value.toFixed(3) : msLabel(metric.value);
      card.append(make("strong", "", shown));
      card.append(make("small", "", metric.source));
      const badge = make("small", "status-pill " + (metric.status === "unknown" ? "" : metric.status),
        metric.status === "unknown" ? "داده موجود نیست" : metric.status === "pass" ? "خوب" : metric.status === "warn" ? "نیازمند توجه" : "ضعیف");
      card.append(badge);
      grid.append(card);
    });
    const hasFieldData = platforms.some(([key]) => Object.keys(getFieldMetrics(state.lighthouse[key])).length > 0);
    if (!hasFieldData) {
      grid.append(make("div", "empty-state", "داده میدانی CrUX برای این اجرا موجود نبود؛ مقادیر LCP، CLS و FCP در صورت وجود از Lighthouse Lab هستند. INP و TTFB بدون داده میدانی اعلام نمی‌شوند."));
    }
  }

  function renderFindings() {
    const list = $("#findings-list");
    list.replaceChildren();
    const filtered = state.results.filter(result => state.filter === "all" || result.status === state.filter);
    if (!filtered.length) {
      list.append(make("div", "empty-state", "برای این فیلتر یافته‌ای وجود ندارد."));
      return;
    }
    filtered.forEach(result => {
      const article = make("article", "finding " + result.status);
      const summary = make("div", "finding-summary");
      summary.append(make("span", "finding-marker"));
      const copy = make("div", "finding-copy");
      const topline = make("div", "finding-topline");
      topline.append(make("strong", "", result.title));
      const status = result.status === "pass" ? "موفق" : result.status === "warn" ? "هشدار" : result.status === "fail" ? "بحرانی" : "اطلاعات";
      topline.append(make("span", "status-pill " + result.status, status));
      copy.append(topline, make("p", "", result.category + " · " + result.evidence));
      summary.append(copy);
      article.append(summary);
      const extra = make("div", "finding-extra");
      for (const [label, value] of [["اثر احتمالی", result.impact], ["اقدام پیشنهادی", result.recommendation]]) {
        const cell = make("div");
        cell.append(make("strong", "", label), make("p", "", value));
        extra.append(cell);
      }
      article.append(extra);
      list.append(article);
    });
  }

  function renderSummary() {
    const counts = state.results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});
    $("#pass-count").textContent = counts.pass || 0;
    $("#warn-count").textContent = counts.warn || 0;
    $("#fail-count").textContent = counts.fail || 0;
    $("#total-count").textContent = state.results.length;
  }

  function renderPrevious(previous) {
    const dateNode = $("#report-date");
    const now = new Date();
    let text = "زمان اجرا: " + now.toLocaleString("fa-IR");
    if (previous && previous.counts) {
      const current = state.results.reduce((acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
      }, {});
      const diff = (current.fail || 0) - (previous.counts.fail || 0);
      const trend = diff < 0 ? "موارد بحرانی " + Math.abs(diff) + " مورد کمتر" : diff > 0 ? "موارد بحرانی " + diff + " مورد بیشتر" : "تعداد موارد بحرانی بدون تغییر";
      text += " · مقایسه با " + new Date(previous.createdAt).toLocaleDateString("fa-IR") + ": " + trend;
    } else {
      text += " · این نخستین گزارش ذخیره‌شده در این مرورگر است.";
    }
    dateNode.textContent = text;
  }

  function saveReport() {
    const counts = state.results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});
    const report = {
      createdAt: new Date().toISOString(),
      counts,
      lighthouse: Object.fromEntries(Object.entries(state.lighthouse).map(([key, data]) => [key, data ? Object.fromEntries(Object.entries(data.lighthouseResult.categories || {}).map(([name, item]) => [name, item.score])) : null]))
    };
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(report)); } catch (_) {}
  }

  async function runAudit() {
    if (state.running) return;
    state.running = true;
    state.results = [];
    state.lighthouse = {};
    state.ciRuns = [];
    state.assets = null;
    state.serviceWorker = null;
    state.vitals = [];
    const previous = (() => {
      try { return JSON.parse(localStorage.getItem(REPORT_KEY) || "null"); } catch (_) { return null; }
    })();
    $("#rerun-button").disabled = true;
    $("#progress-panel").hidden = false;
    setProgress(4, "شروع بررسی", "در حال واکشی صفحه اصلی، مطالعات پروژه و صفحه خطا");
    renderFindings();
    try {
      const paths = ["./", "./projects.html", "./404.html"];
      const pagePromise = Promise.all(paths.map(scanDocument));
      const psiPromise = Promise.all(["mobile", "desktop"].map(async strategy => {
        try {
          const result = await runPageSpeed(strategy);
          state.lighthouse[strategy] = result;
          addResult("عملکرد و شاخص‌ها", "PageSpeed Insights · " + (strategy === "mobile" ? "موبایل" : "دسکتاپ"), "pass",
            "Lighthouse با موفقیت اجرا شد؛ " + (result.lighthouseResult.fetchTime || "زمان اجرا نامشخص"),
            "معیار آزمایشگاهی برای مقایسه عملکرد نسخه‌های سایت فراهم می‌شود.",
            "با گزارش‌های قبلی مقایسه و ابتدا شاخص‌های قرمز Performance را بررسی کن.");
        } catch (error) {
          addResult("عملکرد و شاخص‌ها", "PageSpeed Insights · " + (strategy === "mobile" ? "موبایل" : "دسکتاپ"), "warn",
            error.message || "API در دسترس نیست.",
            "معیارهای Lighthouse و داده‌های میدانی این اجرا قابل دریافت نشدند.",
            "دسترسی به Google PageSpeed API، محدودیت شبکه و سهمیه درخواست را بررسی کن.");
        }
      }));
      const ciPromise = checkGitHubActions().catch(error => {
        addResult("CI/CD و انتشار", "اتصال به GitHub Actions", "warn", error.message || "GitHub API در دسترس نبود.",
          "وضعیت آخرین build و deploy از این نشست تأیید نشد.",
          "صفحه Actions مخزن را مستقیماً بررسی کن.");
      });

      setProgress(22, "تحلیل صفحات و پیوندها", "در حال بررسی دسترس‌پذیری، سئو، CSP و مسیرهای داخلی");
      const pages = await pagePromise;
      setProgress(53, "تحلیل عملکرد و انتشار", "منتظر PageSpeed Insights و GitHub Actions");
      await Promise.all([psiPromise, ciPromise]);
      setProgress(76, "بررسی منابع و کش", "در حال اندازه‌گیری فایل‌های محلی و Service Worker");
      await Promise.all([checkAssets(pages), checkServiceWorker(), checkSecurityHeaders(pages[0])]);
      await inspectInteractionAssets(pages[0]);
      addResult("دسترس‌پذیری", "اعتبارسنجی جامع WCAG", "info",
        "این پنل آزمون‌های ایستای قابل اجرا در مرورگر را انجام می‌دهد؛ axe-core و بررسی contrast/صفحه‌خوان در این اجرا بارگذاری نشده‌اند.",
        "موفقیت آزمون‌های خودکار به معنی انطباق کامل WCAG 2.2 AA نیست.",
        "برای تأیید نهایی از axe DevTools یا Lighthouse به‌همراه تست دستی صفحه‌کلید و screen reader استفاده کن.");

      renderLighthouse();
      renderVitals();
      renderFindings();
      renderSummary();
      renderPrevious(previous);
      saveReport();
      setProgress(100, "آزمون به پایان رسید", "گزارش آماده است؛ برای دریافت نسخه PDF از گزینه چاپ استفاده کن.");
    } catch (error) {
      addResult("اجرای آزمون", "خطای غیرمنتظره در اجرای گزارش", "fail", error.message || String(error),
        "بخشی از آزمون‌ها ممکن است کامل نشده باشد.",
        "کنسول مرورگر را بررسی کن و دوباره اجرا کن.");
      renderFindings();
      renderSummary();
    } finally {
      state.running = false;
      $("#rerun-button").disabled = false;
    }
  }

  function downloadReport() {
    const payload = {
      site: SITE_URL,
      repository: REPOSITORY,
      generatedAt: new Date().toISOString(),
      counts: {
        pass: state.results.filter(item => item.status === "pass").length,
        warn: state.results.filter(item => item.status === "warn").length,
        fail: state.results.filter(item => item.status === "fail").length,
        info: state.results.filter(item => item.status === "info").length
      },
      lighthouse: Object.fromEntries(Object.entries(state.lighthouse).map(([key, data]) => [key, data ? {
        fetchTime: data.lighthouseResult.fetchTime,
        categories: Object.fromEntries(Object.entries(data.lighthouseResult.categories || {}).map(([name, item]) => [name, item.score === null ? null : Math.round(item.score * 100)])),
        audits: Object.fromEntries(["largest-contentful-paint", "first-contentful-paint", "cumulative-layout-shift", "server-response-time", "total-blocking-time"].map(id => [id, data.lighthouseResult.audits?.[id]?.numericValue ?? null]))
      } : null])),
      findings: state.results,
      assets: state.assets,
      serviceWorker: state.serviceWorker,
      recentActions: state.ciRuns.map(run => ({ name: run.name, status: run.status, conclusion: run.conclusion, branch: run.head_branch, sha: run.head_sha, updatedAt: run.updated_at, url: run.html_url }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = make("a");
    link.href = url;
    link.download = "site-audit-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setupGate() {
    let failures = 0;
    let lockedUntil = 0;
    $("#pin-form").addEventListener("submit", async event => {
      event.preventDefault();
      const input = $("#pin-input");
      const error = $("#pin-error");
      if (Date.now() < lockedUntil) {
        error.textContent = "چند لحظه صبر کن و دوباره تلاش کن.";
        return;
      }
      const value = input.value.trim();
      if (!/^\d{3}$/.test(value)) {
        error.textContent = "رمز باید دقیقاً سه رقم باشد.";
        input.focus();
        return;
      }
      const button = $("#pin-form button");
      button.disabled = true;
      button.textContent = "در حال بررسی…";
      error.textContent = "";
      try {
        const accepted = await verifyPin(value);
        if (accepted) {
          failures = 0;
          $("#gate").hidden = true;
          $("#dashboard").hidden = false;
          input.value = "";
          runAudit();
        } else {
          failures += 1;
          input.value = "";
          error.textContent = "رمز صحیح نیست.";
          if (failures >= 5) {
            lockedUntil = Date.now() + 30000;
            failures = 0;
            error.textContent = "تلاش‌های ناموفق زیاد بود؛ ۳۰ ثانیه بعد دوباره امتحان کن.";
          }
          input.focus();
        }
      } catch (err) {
        error.textContent = err.message || "امکان بررسی رمز وجود ندارد.";
      } finally {
        button.disabled = false;
        button.textContent = "ورود و اجرای تست";
      }
    });
  }

  function setupControls() {
    $("#rerun-button").addEventListener("click", runAudit);
    $("#download-button").addEventListener("click", downloadReport);
    $("#print-button").addEventListener("click", () => window.print());
    $("#logout-button").addEventListener("click", () => {
      $("#dashboard").hidden = true;
      $("#gate").hidden = false;
      $("#pin-input").value = "";
      $("#pin-error").textContent = "";
      $("#pin-input").focus();
    });
    $("#theme-toggle").setAttribute("aria-pressed", String(document.documentElement.dataset.theme === "dark"));
    $("#theme-toggle").addEventListener("click", () => {
      const root = document.documentElement;
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("portfolio-theme", next); } catch (_) {}
      $("#theme-toggle").setAttribute("aria-pressed", String(next === "dark"));
    });
    document.querySelectorAll("[data-filter]").forEach(button => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderFindings();
      });
    });
  }

  function main() {
    setupGate();
    setupControls();
  }
  main();
})();