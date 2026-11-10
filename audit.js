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
    browser: { pages: [] },
    markup: [],
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
    return psi?.loadingExperience?.metrics || {};
  }

  function getOriginMetrics(psi) {
    return psi?.originLoadingExperience?.metrics || {};
  }

  function extractVitals(psi) {
    const audits = psi?.lighthouseResult;
    const pageField = getFieldMetrics(psi);
    const originField = getOriginMetrics(psi);
    const hasPageField = Object.keys(pageField).length > 0;
    const field = hasPageField ? pageField : originField;
    const fieldSource = hasPageField ? "CrUX صفحه (صدک ۷۵)" : Object.keys(originField).length ? "CrUX مبدأ (صدک ۷۵)" : null;
    const metrics = [
      { key: "lcp", label: "LCP", field: fieldValue(field, "LARGEST_CONTENTFUL_PAINT_MS"), lab: auditValue(audits, "largest-contentful-paint") },
      { key: "inp", label: "INP", field: fieldValue(field, "INTERACTION_TO_NEXT_PAINT"), lab: null },
      { key: "cls", label: "CLS", field: fieldValue(field, "CUMULATIVE_LAYOUT_SHIFT_SCORE", 1000), lab: auditValue(audits, "cumulative-layout-shift") },
      { key: "fcp", label: "FCP", field: fieldValue(field, "FIRST_CONTENTFUL_PAINT_MS"), lab: auditValue(audits, "first-contentful-paint") },
      { key: "ttfb", label: "TTFB", field: fieldValue(field, "EXPERIMENTAL_TIME_TO_FIRST_BYTE"), lab: null }
    ];
    return metrics.map(metric => {
      const value = metric.field ?? metric.lab;
      const source = metric.field !== null ? fieldSource : metric.lab !== null ? "آزمایشگاه Lighthouse" : "داده موجود نیست";
      return { ...metric, value, source, status: classify(metric.key, value) };
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

  async function runPageSpeed(pageUrl, strategy) {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", pageUrl);
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

  function addLighthouseFindings(data, pageLabel, platformLabel) {
    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};
    for (const [categoryKey, category] of Object.entries(categories)) {
      if (!Number.isFinite(category.score)) continue;
      const status = statusFromScore(category.score);
      addResult("Lighthouse / " + pageLabel, pageLabel + " · " + platformLabel + " · " + (category.title || categoryKey),
        status, "امتیاز " + Math.round(category.score * 100) + "/100",
        "امتیاز دسته‌بندی حاصل از ارزیابی آزمایشگاهی Lighthouse است.",
        "آزمون‌های دارای وزن بیشتر و امتیاز صفر را در جزئیات Lighthouse اولویت بده.");
      const refs = (category.auditRefs || [])
        .filter(ref => Number(ref.weight) > 0)
        .map(ref => ({ ...ref, audit: audits[ref.id] }))
        .filter(ref => ref.audit && ref.audit.score !== null && ref.audit.score !== undefined
          && ref.audit.scoreDisplayMode !== "manual"
          && ref.audit.scoreDisplayMode !== "notApplicable"
          && ref.audit.score < 1)
        .sort((a, b) => (b.weight || 0) - (a.weight || 0))
        .slice(0, 5);
      refs.forEach(ref => {
        const item = ref.audit;
        const severity = item.score === 0 && ref.weight >= 5 ? "fail" : "warn";
        const display = item.displayValue ? " · " + item.displayValue : "";
        addResult("Lighthouse / " + pageLabel, pageLabel + " · " + (item.title || ref.id),
          severity, platformLabel + display + " · وزن دسته‌بندی " + ref.weight,
          item.description || "این آزمون Lighthouse امتیاز کامل نگرفته است.",
          item.details?.overallSavingsMs ? "صرفه‌جویی بالقوه حدود " + Math.round(item.details.overallSavingsMs) + " میلی‌ثانیه را بررسی کن." : "جزئیات و توضیح همین audit را در گزارش PageSpeed باز کن.");
      });
    }
  }

  async function validateMarkup(pagePath) {
    const target = new URL(pagePath, SITE_URL).href;
    const endpoint = new URL("https://validator.w3.org/nu/");
    endpoint.searchParams.set("doc", target);
    endpoint.searchParams.set("out", "json");
    try {
      const response = await fetchWithTimeout(endpoint.toString(), { headers: { Accept: "application/json" }, mode: "cors" }, 30000);
      if (!response.ok) throw new Error("W3C Nu HTTP " + response.status);
      const data = await response.json();
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const errors = messages.filter(item => item.type === "error");
      const warnings = messages.filter(item => item.type === "info" && item.subType === "warning");
      const external = messages.filter(item => item.type === "non-document-error");
      const result = { pagePath, url: target, errors, warnings, external, messages };
      state.markup.push(result);
      addResult("استاندارد HTML / W3C", pagePath + " · اعتبارسنجی HTML",
        external.length ? "warn" : errors.length ? "fail" : warnings.length ? "warn" : "pass",
        errors.length + " خطا · " + warnings.length + " هشدار · " + external.length + " خطای پردازشگر",
        "خطاهای HTML ممکن است باعث تفاوت در DOM، دسترس‌پذیری و رفتار مرورگرها شوند.",
        "هر پیام را با شماره خط و ستون اصلاح کن؛ هشدارها را با توجه به کاربردشان ارزیابی کن.");
      return result;
    } catch (error) {
      const result = { pagePath, url: target, unavailable: true, error: error.message || String(error), messages: [] };
      state.markup.push(result);
      addResult("استاندارد HTML / W3C", pagePath + " · اعتبارسنجی HTML", "info",
        "پاسخ W3C Nu در این مرورگر قابل خواندن نبود: " + result.error,
        "به دلیل محدودیت CORS یا سرویس، اعتبارسنجی رسمی این صفحه تکمیل نشد.",
        "برای نتیجه قطعی، URL صفحه را مستقیماً در validator.w3.org/nu بررسی کن.");
      return result;
    }
  }

  function renderMarkup() {
    const root = $("#markup-panel");
    root.replaceChildren();
    if (!state.markup.length) {
      root.append(make("div", "empty-state", "نتیجه W3C Nu دریافت نشد."));
      return;
    }
    state.markup.forEach(result => {
      const section = make("section", "markup-page");
      const title = make("strong", "", result.pagePath);
      section.append(title);
      if (result.unavailable) {
        section.append(make("p", "empty-state", result.error));
        root.append(section);
        return;
      }
      const errors = result.errors.length;
      const warnings = result.warnings.length;
      const stats = make("div", "markup-summary");
      for (const [label, value] of [["خطا", errors], ["هشدار", warnings], ["پیام دیگر", result.external.length]]) {
        const stat = make("div", "markup-stat");
        stat.append(make("strong", "", value), make("span", "", label));
        stats.append(stat);
      }
      section.append(stats);
      result.messages.slice(0, 15).forEach(message => {
        const kind = message.type === "error" ? "error" : message.subType === "warning" ? "warning" : "";
        const card = make("article", "markup-message " + kind);
        const location = message.lastLine ? " · خط " + message.lastLine + (message.lastColumn ? "، ستون " + message.lastColumn : "") : "";
        card.append(make("strong", "", (message.type === "error" ? "ERROR" : message.type === "non-document-error" ? "CHECKER" : message.subType === "warning" ? "WARNING" : "INFO") + location));
        card.append(make("p", "", message.message || "پیام بدون توضیح"));
        section.append(card);
      });
      if (!result.messages.length) section.append(make("p", "empty-state", "هیچ خطا یا هشداری از W3C دریافت نشد."));
      root.append(section);
    });
  }

  function receiveBridgeMessage(frame, runId, expectedType, command, payload = {}, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const origin = new URL(SITE_URL).origin;
      const cleanup = () => {
        window.removeEventListener("message", handler);
        window.clearTimeout(timer);
      };
      const handler = event => {
        if (event.origin !== origin || event.source !== frame.contentWindow) return;
        const data = event.data;
        if (!data || data.source !== "portfolio-audit-bridge" || data.runId !== runId || data.type !== expectedType) return;
        cleanup();
        resolve(data);
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("مهلت پاسخ صفحه واقعی تمام شد: " + expectedType));
      }, timeout);
      window.addEventListener("message", handler);
      if (command) frame.contentWindow.postMessage({ source: "portfolio-audit-parent", runId, type: command, ...payload }, origin);
    });
  }

  async function runBrowserPageAudit(pagePath) {
    const runId = "audit-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    const frame = make("iframe", "audit-test-frame viewport-1365");
    frame.title = "اجرای آزمون واقعی " + pagePath;
    frame.tabIndex = -1;
    const source = new URL(pagePath, SITE_URL);
    source.searchParams.set("audit", "1");
    source.searchParams.set("auditRun", runId);
    const ready = receiveBridgeMessage(frame, runId, "ready", null, {}, 25000);
    frame.src = source.href;
    document.body.append(frame);
    try {
      await ready;
      const initial = await receiveBridgeMessage(frame, runId, "audit-result", "RUN", {}, 45000);
      if (initial.error) throw new Error(initial.error);
      const viewports = [];
      for (const width of [390, 768, 1024, 1365]) {
        frame.className = "audit-test-frame viewport-" + width;
        const check = await receiveBridgeMessage(frame, runId, "viewport-result", "VIEWPORT", { width }, 15000);
        viewports.push(check);
        if (width === 390) {
          const mobileA11y = await receiveBridgeMessage(frame, runId, "accessibility-result", "ACCESSIBILITY", {}, 35000);
          initial.mobileAccessibility = mobileA11y.accessibility || null;
          initial.mobileAccessibilityError = mobileA11y.error || null;
          const mobileInteractions = await receiveBridgeMessage(frame, runId, "interactions-result", "INTERACTIONS", {}, 15000);
          initial.mobileInteractions = mobileInteractions.interactions || [];
        }
      }
      return { pagePath, runId, desktop: initial, viewports };
    } finally {
      frame.remove();
    }
  }

  function recordAxeResults(pageResult, accessibility, viewportLabel) {
    if (!accessibility) {
      addResult("دسترس‌پذیری / axe-core", pageResult.pagePath + " · اجرای axe-core · " + viewportLabel, "warn",
        "axe-core اجرا نشد: " + (pageResult.desktop.error || pageResult.desktop.mobileAccessibilityError || "نتیجه در دسترس نیست"),
        "آزمون استاندارد WCAG خودکار این صفحه تکمیل نشده است.",
        "بارگذاری فایل محلی axe-core و اجرای فریم هم‌مبدأ را بررسی کن.");
      return;
    }
    const violations = accessibility.violations || [];
    addResult("دسترس‌پذیری / axe-core", pageResult.pagePath + " · axe-core " + accessibility.version + " · " + viewportLabel,
      violations.length ? "warn" : "pass",
      accessibility.passes + " قاعده پاس‌شده · " + violations.length + " قاعده نقض‌شده · " + (accessibility.incomplete || []).length + " مورد نیازمند بازبینی",
      "axe-core قواعد خودکار WCAG را اجرا می‌کند اما جایگزین ارزیابی انسانی و همه معیارها نیست.",
      "نقض‌های serious/critical را اولویت بده و موارد incomplete را دستی بازبینی کن.");
    violations.forEach(rule => {
      const status = ["critical", "serious"].includes(rule.impact) ? "fail" : "warn";
      const selectors = rule.nodes.slice(0, 5).map(node => node.target.join(" ")).join(" | ");
      addResult("دسترس‌پذیری / axe-core", pageResult.pagePath + " · " + rule.id + " · " + viewportLabel,
        status, (rule.impact || "unknown") + " · " + rule.totalNodes + " عنصر · " + selectors,
        rule.help + " " + rule.description,
        "جزئیات قاعده و selectorهای درگیر را در بخش گزارش واقعی مرورگر بررسی و اصلاح کن.");
    });
    (accessibility.incomplete || []).slice(0, 10).forEach(rule => {
      addResult("دسترس‌پذیری / axe-core", pageResult.pagePath + " · بازبینی دستی " + rule.id + " · " + viewportLabel,
        "info", (rule.impact || "unknown") + " · " + rule.totalNodes + " عنصر نیازمند بررسی",
        rule.help + " این مورد به‌صورت خودکار قطعی نشده است.",
        "عنصرهای گزارش‌شده را با صفحه‌خوان، صفحه‌کلید و بررسی بصری کنترل کن.");
    });
  }

  function addBrowserFindings(pageResult) {
    const data = pageResult.desktop.snapshot;
    const pageLabel = pageResult.pagePath;
    const timing = data.navigation || {};
    const statusForMs = value => !Number.isFinite(value) ? "info" : value <= 800 ? "pass" : value <= 1800 ? "warn" : "fail";
    addResult("مرورگر واقعی / عملکرد", pageLabel + " · TTFB مرورگر",
      statusForMs(timing.ttfb), Number.isFinite(timing.ttfb) ? timing.ttfb + " ms در iframe فعلی" : "Navigation Timing در دسترس نیست.",
      "این زمان در یک بار اجرا و مرورگر فعلی اندازه‌گیری شده و معادل CrUX نیست.",
      "برای روند پایدار، چند بار در شبکه‌های متفاوت و با PageSpeed/CrUX مقایسه کن.");
    const fcp = data.paint?.fcp;
    addResult("مرورگر واقعی / عملکرد", pageLabel + " · FCP مرورگر",
      !Number.isFinite(fcp) ? "info" : fcp <= 1800 ? "pass" : fcp <= 3000 ? "warn" : "fail",
      Number.isFinite(fcp) ? msLabel(fcp) : "Paint Timing برای FCP ثبت نشد.",
      "نمایش دیرهنگام محتوای اولیه برداشت کاربر از سرعت سایت را کاهش می‌دهد.",
      "فونت، CSS رندر-بلاکینگ و منابع بالای صفحه را بررسی کن.");
    const cls = data.paint?.cls;
    addResult("مرورگر واقعی / پایداری", pageLabel + " · CLS مرورگر",
      !Number.isFinite(cls) ? "info" : cls <= 0.1 ? "pass" : cls <= 0.25 ? "warn" : "fail",
      Number.isFinite(cls) ? cls.toFixed(4) : "Layout Shift ثبت نشد.",
      "پرش چیدمان می‌تواند باعث کلیک اشتباه و تجربه ناپایدار شود.",
      "ابعاد تصویر/فونت و اجزایی که بعد از بارگذاری وارد صفحه می‌شوند را بررسی کن.");
    const tasks = data.execution || {};
    addResult("مرورگر واقعی / پاسخ‌گویی", pageLabel + " · Long Tasks",
      !tasks.longTaskCount ? "pass" : tasks.longestTask > 200 ? "fail" : "warn",
      tasks.longTaskCount + " task · طولانی‌ترین " + (tasks.longestTask === null ? "—" : tasks.longestTask + " ms") + " · مجموع " + tasks.totalLongTaskTime + " ms",
      "کارهای طولانی thread اصلی می‌توانند ورودی و اسکرول را مسدود کنند.",
      "اسکریپت‌های سنگین را تقسیم، defer یا از Web Worker برای محاسبات مناسب استفاده کن.");
    const failures = (tasks.consoleErrors || []).length + (tasks.resourceErrors || []).length + (tasks.unhandledRejections || []).length;
    addResult("مرورگر واقعی / خطاها", pageLabel + " · خطاهای runtime و منابع",
      failures ? "fail" : "pass",
      "console/error: " + tasks.consoleErrors.length + " · منابع: " + tasks.resourceErrors.length + " · Promise rejection: " + tasks.unhandledRejections.length,
      "خطاهای اجرا یا منبع ناموفق ممکن است بخشی از رابط یا عملکرد سایت را از کار بیندازند.",
      "خطا را در کد مربوطه بررسی و مسیر یا وابستگی ناموفق را اصلاح کن.");
    if (tasks.cspViolations?.length) {
      addResult("امنیت", pageLabel + " · نقض‌های CSP در مرورگر", "fail",
        tasks.cspViolations.length + " رخداد سیاست Content Security Policy ثبت شد.",
        "منابعی که CSP مسدود کرده می‌توانند قابلیت‌های صفحه را مختل کنند یا پیکربندی امنیتی را نشان دهند.",
        "directive و blocked URI را بررسی کن؛ فقط منبع ضروری و قابل اعتماد را مجاز کن.");
    } else {
      addResult("امنیت", pageLabel + " · نقض‌های CSP در مرورگر", "pass",
        "در طول این نشست نقض قابل مشاهده‌ای از CSP ثبت نشد.",
        "این بررسی فقط خطاهای CSP در همین اجرا را پوشش می‌دهد.",
        "گزارش CSP را در چند مسیر و حالت مختلف هم آزمایش کن.");
    }
    const brokenImages = data.documentChecks?.brokenImages || [];
    addResult("مرورگر واقعی / منابع", pageLabel + " · تصاویر شکسته",
      brokenImages.length ? "fail" : "pass",
      brokenImages.length ? brokenImages.slice(0, 5).join(" · ") : "هیچ تصویر شکسته‌ای در DOM بارگذاری‌شده دیده نشد.",
      "تصویر شکسته کیفیت بصری و گاهی اطلاعات محتوایی را از بین می‌برد.",
      "URL تصویر، پاسخ شبکه و سازگاری نام فایل را بررسی کن.");
    const fonts = data.documentChecks || {};
    addResult("مرورگر واقعی / منابع", pageLabel + " · آماده بودن فونت",
      fonts.fontsReady && fonts.vazirmatnAvailable ? "pass" : "warn",
      "document.fonts.ready=" + fonts.fontsReady + " · Vazirmatn=" + fonts.vazirmatnAvailable,
      "فونت ناموفق ممکن است باعث fallback، جابه‌جایی متن یا ظاهر ناهمگون شود.",
      "بارگذاری Google Fonts، CSP و fallbackهای تعریف‌شده را بررسی کن.");
    const resource = data.resources || {};
    addResult("مرورگر واقعی / منابع", pageLabel + " · اندازه منابع در مرورگر",
      resource.thirdParty > 0 ? "info" : "pass",
      resource.total + " منبع · " + resource.thirdParty + " منبع ثالث · " + bytesLabel(resource.sameOriginTransferBytes) + " انتقال قابل مشاهده هم‌مبدأ",
      "منابع ثالث و انتقال نامشهود ممکن است اندازه‌گیری حجم را ناقص کنند.",
      "برای سایز دقیق انتقال، Network panel را با Disable cache و Preserve log هم بررسی کن.");
    const viewports = pageResult.viewports || [];
    const overflows = viewports.filter(item => item.document?.overflowX);
    addResult("مرورگر واقعی / واکنش‌گرایی", pageLabel + " · تست عرض‌های مختلف",
      overflows.length ? "fail" : "pass",
      viewports.map(item => item.requestedWidth + "px: " + (item.document?.overflowX ? "overflow" : "OK") + " (document " + item.document?.width + "px)").join(" · "),
      "overflow افقی روی موبایل/تبلت باعث بریدگی محتوا و اسکرول ناخواسته می‌شود.",
      "عنصرهای دارای عرض ثابت، grid/flex و متن‌های طولانی را در breakpoint معیوب اصلاح کن.");
    (pageResult.desktop.interactions || []).filter(item => item.id === "language-switcher").forEach(item => {
      addResult("تعامل واقعی", pageLabel + " · تغییر زبان EN/DE/FA", item.status,
        item.detail || "آزمون تعویض زبان اجرا شد.",
        "خطا در تغییر زبان می‌تواند متن، جهت RTL و برچسب‌های دسترس‌پذیری را ناسازگار کند.",
        "به‌روزرسانی lang/dir، aria-pressed، ترجمه محتوا و حفظ انتخاب را بررسی کن.");
    });
    (pageResult.desktop.interactions || []).filter(item => item.id === "theme-toggle").forEach(item => {
      addResult("تعامل واقعی", pageLabel + " · تغییر تم", item.status,
        item.detail || "آزمون تعامل تغییر تم اجرا شد.",
        "عملکرد اشتباه تم، انتخاب ظاهری کاربر و وضعیت دسترس‌پذیری آن را مختل می‌کند.",
        "تغییر حالت، aria-pressed و برگشت به حالت قبل را بررسی کن.");
    });
    (pageResult.desktop.mobileInteractions || []).filter(item => item.id === "mobile-navigation").forEach(item => {
      addResult("تعامل واقعی", pageLabel + " · منوی موبایل", item.status,
        item.detail || "آزمون باز و بسته شدن منو اجرا شد.",
        "منوی خراب در موبایل دسترسی به بخش‌های اصلی سایت را محدود می‌کند.",
        "hidden، aria-expanded، کلاس منو و رفتار Escape را بررسی کن.");
    });
    recordAxeResults(pageResult, pageResult.desktop.accessibility, "دسکتاپ");
    if (pageResult.desktop.mobileAccessibility) recordAxeResults(pageResult, pageResult.desktop.mobileAccessibility, "موبایل");
  }

  function renderBrowser() {
    const root = $("#browser-runtime");
    root.replaceChildren();
    if (!state.browser.pages.length) {
      root.append(make("div", "empty-state", "اجرای مرورگر واقعی تکمیل نشد."));
      return;
    }
    state.browser.pages.forEach(page => {
      const snapshot = page.desktop.snapshot;
      const card = make("article", "browser-page-card");
      const head = make("div", "browser-page-head");
      head.append(make("strong", "", page.pagePath));
      head.append(make("small", "", "Viewport واقعی · " + snapshot.viewport.width + " × " + snapshot.viewport.height));
      card.append(head);
      const nav = snapshot.navigation || {};
      const resources = snapshot.resources || {};
      const execution = snapshot.execution || {};
      const metrics = make("div", "browser-metrics");
      for (const [label,value] of [
        ["TTFB",Number.isFinite(nav.ttfb)?msLabel(nav.ttfb):"—"],
        ["FCP",Number.isFinite(snapshot.paint?.fcp)?msLabel(snapshot.paint.fcp):"—"],
        ["CLS",Number.isFinite(snapshot.paint?.cls)?snapshot.paint.cls.toFixed(3):"—"],
        ["Long tasks",String(execution.longTaskCount || 0)]
      ]) {
        const item=make("div","browser-metric");
        item.append(make("span","",label),make("strong","",value));
        metrics.append(item);
      }
      card.append(metrics);
      const details = make("div","browser-details");
      const runtimeCard = make("div","browser-detail");
      runtimeCard.append(make("strong","","خطاهای مرورگر"));
      const errList=make("div","browser-error-list");
      const errors=[...(execution.consoleErrors||[]).map(e=>"JS: "+e.message),...(execution.resourceErrors||[]).map(e=>"Resource: "+e.url),...(execution.unhandledRejections||[]).map(e=>"Promise: "+e.message)];
      (errors.length?errors:["خطای ثبت‌شده‌ای در این نشست وجود نداشت."]).slice(0,8).forEach(e=>errList.append(make("div",errors.length?"browser-error":"",e)));
      runtimeCard.append(errList);
      const perfCard=make("div","browser-detail");
      perfCard.append(make("strong","","منابع و انتقال"));
      perfCard.append(make("p","","کل منابع: "+resources.total+" · هم‌مبدأ: "+resources.sameOrigin+" · ثالث: "+resources.thirdParty));
      perfCard.append(make("p","","حجم قابل مشاهده هم‌مبدأ: "+bytesLabel(resources.sameOriginTransferBytes)));
      perfCard.append(make("p","","ناوبری: DCL "+msLabel(nav.domContentLoaded)+" · Load "+msLabel(nav.load)));
      details.append(runtimeCard,perfCard);
      card.append(details);
      const chips=make("div","viewport-list");
      (page.viewports||[]).forEach(item=>{
        chips.append(make("span","viewport-chip "+(item.document?.overflowX?"fail":"pass"),
          item.requestedWidth+"px · "+(item.document?.overflowX?"overflow":"بدون overflow")));
      });
      card.append(chips);
      const axe = page.desktop.accessibility;
      if(axe){
        const axeLine=make("div","browser-detail");
        axeLine.append(make("strong","","axe-core "+axe.version+" · WCAG 2.0/2.1/2.2 A/AA"));
        axeLine.append(make("p","","Pass: "+axe.passes+" · Violations: "+axe.violations.length+" · Incomplete: "+axe.incomplete.length));
        card.append(axeLine);
      }
      root.append(card);
    });
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
      const pageProbe = new URL(pageUrl.href);
      pageProbe.searchParams.set("audit", "1");
      const response = await fetchWithTimeout(pageProbe.href, { cache: "no-store" }, 20000);
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
          const probeUrl = new URL(url);
          probeUrl.searchParams.set("audit", "1");
          let response = await fetchWithTimeout(probeUrl.href, { method: "HEAD", cache: "no-store" }, 12000);
          if (response.status === 405 || response.status === 403) {
            response = await fetchWithTimeout(probeUrl.href, { cache: "no-store" }, 12000);
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
          const probeUrl = new URL(url);
          probeUrl.searchParams.set("audit", "1");
          const response = await fetchWithTimeout(probeUrl.href, { cache: "no-store" }, 16000);
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
    const sw = { supported: "serviceWorker" in navigator, controller: Boolean(navigator.serviceWorker?.controller), registrations: 0, cacheNames: [], cacheEntries: 0, scriptOk: false, auditBypass: false };
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
        const response = await fetchWithTimeout(new URL("sw.js?audit=1", SITE_URL).href, { cache: "no-store" }, 12000);
        if (response.ok) {
          const source = await response.text();
          sw.scriptOk = source.includes("cache.put") && source.includes("cache.match") && source.includes("clients.claim");
          sw.auditBypass = source.includes('searchParams.get("audit") === "1"');
        }
      }
    } catch (_) {}
    state.serviceWorker = sw;
    addResult("کش و آفلاین", "ثبت Service Worker", sw.registrations ? "pass" : "warn",
      "پشتیبانی مرورگر: " + (sw.supported ? "بله" : "خیر") + " · registration: " + sw.registrations + " · controller: " + (sw.controller ? "فعال" : "در این نشست کنترل‌کننده نیست"),
      "نبود ثبت فعال، قابلیت cache-first و fallback آفلاین را محدود می‌کند.",
      "ثبت SW را پس از انتشار بررسی کن و بعد از تغییر نسخه، cache قدیمی را پاک‌سازی کن.");
    addResult("کش و آفلاین", "سلامت فایل Service Worker و Cache Storage", sw.scriptOk && sw.auditBypass ? "pass" : "warn",
      "فایل sw.js: " + (sw.scriptOk ? "الگوی cache دیده شد" : "قابل تأیید نیست") + " · bypass تست زنده: " + sw.auditBypass + " · cacheها: " + sw.cacheNames.length + " · ورودی‌ها: " + sw.cacheEntries,
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
        fetchWithTimeout(new URL("script.js?audit=1", SITE_URL).href, { cache: "no-store" }, 15000),
        fetchWithTimeout(new URL("styles.css?audit=1", SITE_URL).href, { cache: "no-store" }, 15000)
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

  async function checkCrawlFiles() {
    try {
      const [robotsResponse, sitemapResponse] = await Promise.all([
        fetchWithTimeout(new URL("robots.txt?audit=1", SITE_URL).href, { cache: "no-store" }, 12000),
        fetchWithTimeout(new URL("sitemap.xml?audit=1", SITE_URL).href, { cache: "no-store" }, 12000)
      ]);
      let robotsText = "";
      let sitemapText = "";
      if (robotsResponse.ok) robotsText = await robotsResponse.text();
      if (sitemapResponse.ok) sitemapText = await sitemapResponse.text();

      const sitemapDeclared = robotsText.split(/\r?\n/).some(line =>
        /^\s*sitemap\s*:/i.test(line) && line.toLowerCase().includes("sitemap.xml")
      );
      const allowsRoot = robotsText.split(/\r?\n/).some(line => /^\s*allow\s*:\s*\/\s*$/i.test(line));
      const rootBlocked = robotsText.split(/\r?\n/).some(line => /^\s*disallow\s*:\s*\/\s*$/i.test(line));
      addResult("SEO و خزش", "robots.txt و سیاست خزش", robotsResponse.ok && !rootBlocked ? "pass" : robotsResponse.status === 404 ? "info" : "warn",
        "HTTP " + robotsResponse.status + " · Allow root: " + allowsRoot + " · Disallow all: " + rootBlocked + " · Sitemap declared: " + sitemapDeclared,
        "قواعد robots می‌توانند دسترسی crawlerها به صفحات عمومی را محدود کنند.",
        "دستورها را با هدف ایندکس‌کردن صفحات اصلی هماهنگ کن؛ برای حذف از نتایج از noindex استفاده کن، نه صرفاً مسدودکردن crawl.");
      if (!sitemapResponse.ok) {
        addResult("SEO و خزش", "sitemap.xml", sitemapResponse.status === 404 ? "warn" : "fail",
          "HTTP " + sitemapResponse.status,
          "نبود یا خطای sitemap کشف URLهای سایت را برای موتور جست‌وجو سخت‌تر می‌کند.",
          "فایل XML معتبر، قابل‌دسترسی و شامل URLهای canonical را منتشر کن.");
        return;
      }

      const xml = new DOMParser().parseFromString(sitemapText, "application/xml");
      const parseError = xml.querySelector("parsererror");
      const locations = [...xml.querySelectorAll("loc")].map(node => node.textContent.trim()).filter(Boolean);
      const duplicates = locations.filter((url, index) => locations.indexOf(url) !== index);
      const invalid = locations.filter(value => {
        try {
          const url = new URL(value);
          return url.origin !== new URL(SITE_URL).origin || !url.pathname.startsWith(new URL(SITE_URL).pathname);
        } catch (_) { return true; }
      });
      const auditListed = locations.some(value => {
        try { return new URL(value).pathname.endsWith("/audit.html"); } catch (_) { return false; }
      });
      const status = parseError || !locations.length || invalid.length || duplicates.length ? "fail" : auditListed ? "warn" : "pass";
      addResult("SEO و خزش", "ساختار و URLهای sitemap.xml", status,
        "HTTP " + sitemapResponse.status + " · URLها: " + locations.length + " · تکراری: " + duplicates.length + " · خارج از دامنه: " + invalid.length + " · audit در sitemap: " + auditListed,
        "sitemap نامعتبر یا شامل URL خصوصی/غیرقابل‌ایندکس می‌تواند کیفیت خزش را کاهش دهد.",
        "فقط URLهای canonical عمومی را نگه دار و فایل را با XML parser و Search Console اعتبارسنجی کن.");
      if (!sitemapDeclared) {
        addResult("SEO و خزش", "ارجاع sitemap از robots.txt", "warn",
          "در robots.txt ارجاعی به sitemap.xml پیدا نشد.",
          "crawlerها ممکن است sitemap را دیرتر پیدا کنند.",
          "یک خط Sitemap با URL کامل فایل sitemap در robots.txt اضافه کن.");
      }
    } catch (error) {
      addResult("SEO و خزش", "بررسی robots.txt و sitemap.xml", "info", error.message || "دریافت فایل‌های خزش انجام نشد.",
        "دسترسی به فایل‌های SEO در این نشست تأیید نشد.",
        "robots.txt و sitemap.xml را در همان دامنه و بدون redirect غیرمنتظره بررسی کن.");
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
    const targets = [
      ["home-mobile", "صفحه اصلی · موبایل"],
      ["home-desktop", "صفحه اصلی · دسکتاپ"],
      ["projects-mobile", "پروژه‌ها · موبایل"],
      ["projects-desktop", "پروژه‌ها · دسکتاپ"]
    ];
    targets.forEach(([key, label]) => {
      const data = state.lighthouse[key];
      const card = make("article", "psi-card");
      const head = make("div", "psi-card-head");
      head.append(make("strong", "psi-platform", label));
      head.append(make("span", "psi-state", data ? (data.lighthouseResult?.fetchTime ? new Date(data.lighthouseResult.fetchTime).toLocaleString("fa-IR") : "Lighthouse") : "داده دریافت نشد"));
      card.append(head);
      if (!data) {
        card.append(make("div", "empty-state", "PageSpeed Insights برای این صفحه/دستگاه پاسخ نداد یا سهمیه API محدود شد."));
        grid.append(card);
        return;
      }
      const scores = make("div", "score-grid");
      const categories = data.lighthouseResult.categories || {};
      const definitions = [
        ["performance", "Performance"], ["accessibility", "Accessibility"], ["best-practices", "Best Practices"], ["seo", "SEO"]
      ];
      definitions.forEach(([category, title]) => {
        const score = categories[category]?.score;
        const item = make("div", "score-item");
        const ring = make("div", "score-ring " + (statusFromScore(score) === "unknown" ? "" : "score-" + statusFromScore(score)));
        if (Number.isFinite(score)) ring.classList.add("score-value-" + Math.round(score * 20) * 5);
        ring.append(make("strong", "", scoreLabel(score)));
        item.append(ring, make("small", "", title));
        scores.append(item);
      });
      card.append(scores);
      card.append(make("p", "fine-print", "Lighthouse " + (data.lighthouseResult.lighthouseVersion || "version نامشخص") + " · " + (data.lighthouseResult.configSettings?.formFactor || data.lighthouseResult.configSettings?.emulatedFormFactor || "form factor نامشخص")));
      grid.append(card);
    });
  }

  function renderVitals() {
    const grid = $("#vitals-grid");
    grid.replaceChildren();
    const targets = [
      ["home-mobile", "خانه · موبایل"],
      ["home-desktop", "خانه · دسکتاپ"],
      ["projects-mobile", "پروژه‌ها · موبایل"],
      ["projects-desktop", "پروژه‌ها · دسکتاپ"]
    ].filter(([key]) => Boolean(state.lighthouse[key]));
    if (!targets.length) {
      grid.append(make("div", "empty-state", "شاخص‌های PageSpeed دریافت نشدند. پس از رفع دسترسی API دوباره اجرا کن."));
      return;
    }
    const allVitals = [];
    targets.forEach(([key, label]) => {
      extractVitals(state.lighthouse[key]).forEach(metric => allVitals.push({ ...metric, platform: label }));
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
    const hasFieldData = targets.some(([key]) => Object.keys(getFieldMetrics(state.lighthouse[key])).length > 0
      || Object.keys(getOriginMetrics(state.lighthouse[key])).length > 0);
    if (!hasFieldData) {
      grid.append(make("div", "empty-state", "داده میدانی CrUX در دسترس نبود؛ مقادیر LCP، CLS و FCP از Lighthouse Lab هستند. INP و TTFB فقط در صورت وجود Field data گزارش می‌شوند."));
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
    let text = "زمان اجرا: " + new Date().toLocaleString("fa-IR");
    if (previous && previous.counts) {
      const current = state.results.reduce((acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
      }, {});
      const diff = (current.fail || 0) - (previous.counts.fail || 0);
      const axeNow = state.browser.pages.reduce((sum, page) => sum + (page.desktop.accessibility?.violations?.length || 0) + (page.desktop.mobileAccessibility?.violations?.length || 0), 0);
      const htmlNow = state.markup.reduce((sum, item) => sum + (item.errors?.length || 0), 0);
      const parts = [
        diff < 0 ? "موارد بحرانی " + Math.abs(diff) + " مورد کمتر" : diff > 0 ? "موارد بحرانی " + diff + " مورد بیشتر" : "موارد بحرانی بدون تغییر"
      ];
      if (Number.isFinite(previous.axeViolations)) parts.push("نقض‌های axe: " + (axeNow - previous.axeViolations >= 0 ? "+" : "") + (axeNow - previous.axeViolations));
      if (Number.isFinite(previous.htmlErrors)) parts.push("خطاهای HTML: " + (htmlNow - previous.htmlErrors >= 0 ? "+" : "") + (htmlNow - previous.htmlErrors));
      text += " · مقایسه با " + new Date(previous.createdAt).toLocaleDateString("fa-IR") + ": " + parts.join(" · ");
    } else {
      text += " · هنوز گزارش قبلی در این مرورگر ذخیره نشده است.";
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
      lighthouse: Object.fromEntries(Object.entries(state.lighthouse).map(([key, data]) => [key, data ? Object.fromEntries(Object.entries(data.lighthouseResult.categories || {}).map(([name, item]) => [name, item.score])) : null])),
      axeViolations: state.browser.pages.reduce((sum, page) => sum + (page.desktop.accessibility?.violations?.length || 0) + (page.desktop.mobileAccessibility?.violations?.length || 0), 0),
      htmlErrors: state.markup.reduce((sum, item) => sum + (item.errors?.length || 0), 0),
      browser: state.browser.pages.map(page => ({
        pagePath: page.pagePath,
        ttfb: page.desktop.snapshot.navigation?.ttfb ?? null,
        fcp: page.desktop.snapshot.paint?.fcp ?? null,
        cls: page.desktop.snapshot.paint?.cls ?? null,
        longTasks: page.desktop.snapshot.execution?.longTaskCount ?? null,
        consoleErrors: page.desktop.snapshot.execution?.consoleErrors?.length ?? 0,
        resourceErrors: page.desktop.snapshot.execution?.resourceErrors?.length ?? 0,
        mobileOverflow: page.viewports.find(item => item.requestedWidth === 390)?.document?.overflowX ?? null
      }))
    };
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(report)); } catch (_) {}
  }

  async function check404Handling() {
    const probe = new URL("__site-audit-nonexistent-" + Date.now().toString(36), SITE_URL);
    probe.searchParams.set("audit", "1");
    try {
      const response = await fetchWithTimeout(probe.href, { cache: "no-store" }, 15000);
      const body = await response.text();
      const looksLike404 = /page not found|404/i.test(body);
      const status = response.status === 404 && looksLike404 ? "pass" : response.status === 200 ? "warn" : "fail";
      addResult("HTTP و مسیریابی", "Fallback صفحه 404 واقعی", status,
        "HTTP " + response.status + " · نشانگر صفحه خطا: " + looksLike404,
        "پاسخ اشتباه به مسیر ناموجود ممکن است خطای پیمایش یا soft-404 سئو ایجاد کند.",
        "برای مسیر ناموجود باید HTTP 404 و صفحه راهنمای قابل‌فهم نمایش داده شود.");
    } catch (error) {
      addResult("HTTP و مسیریابی", "Fallback صفحه 404 واقعی", "warn", error.message || "probe ناموفق",
        "رفتار مسیر ناموجود در این اجرا تأیید نشد.",
        "یک مسیر تصادفی ناموجود را با Network panel بررسی کن.");
    }
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
    state.browser = { pages: [] };
    state.markup = [];
    const previous = (() => {
      try { return JSON.parse(localStorage.getItem(REPORT_KEY) || "null"); } catch (_) { return null; }
    })();
    $("#rerun-button").disabled = true;
    $("#progress-panel").hidden = false;
    setProgress(3, "شروع بررسی", "ساختار و پاسخ HTTP صفحات اصلی، پروژه‌ها و صفحه 404");
    renderFindings();
    try {
      const paths = ["./", "./projects.html", "./404.html"];
      const pagePromise = Promise.all(paths.map(scanDocument));
      const targets = [
        { key: "home-mobile", url: SITE_URL, strategy: "mobile", page: "صفحه اصلی", platform: "موبایل" },
        { key: "home-desktop", url: SITE_URL, strategy: "desktop", page: "صفحه اصلی", platform: "دسکتاپ" },
        { key: "projects-mobile", url: new URL("projects.html", SITE_URL).href, strategy: "mobile", page: "صفحه پروژه‌ها", platform: "موبایل" },
        { key: "projects-desktop", url: new URL("projects.html", SITE_URL).href, strategy: "desktop", page: "صفحه پروژه‌ها", platform: "دسکتاپ" }
      ];
      const psiPromise = Promise.all(targets.map(async target => {
        try {
          const result = await runPageSpeed(target.url, target.strategy);
          state.lighthouse[target.key] = result;
          addResult("عملکرد و شاخص‌ها", "PageSpeed Insights · " + target.page + " · " + target.platform, "pass",
            "Lighthouse " + (result.lighthouseResult.lighthouseVersion || "نامشخص") + " · " + (result.lighthouseResult.fetchTime || "زمان اجرا نامشخص"),
            "این اجرا سنجش آزمایشگاهی واقعی برای URL و دستگاه مشخص‌شده فراهم می‌کند.",
            "دسته‌بندی‌ها و auditهای دارای وزن را با اجرای قبلی مقایسه کن.");
          addLighthouseFindings(result, target.page, target.platform);
        } catch (error) {
          addResult("عملکرد و شاخص‌ها", "PageSpeed Insights · " + target.page + " · " + target.platform, "warn",
            error.message || "API در دسترس نیست.",
            "معیارهای Lighthouse و داده‌های میدانی این صفحه/دستگاه دریافت نشدند.",
            "دسترسی به Google PageSpeed API، محدودیت شبکه و سهمیه درخواست را بررسی کن.");
        }
      }));
      const ciPromise = checkGitHubActions().catch(error => {
        addResult("CI/CD و انتشار", "اتصال به GitHub Actions", "warn", error.message || "GitHub API در دسترس نبود.",
          "وضعیت آخرین build و deploy از این نشست تأیید نشد.",
          "صفحه Actions مخزن را مستقیماً بررسی کن.");
      });

      setProgress(17, "بررسی استانداردها و صفحات", "در حال تحلیل ساختار، لینک‌ها، سئو و پاسخ HTTP");
      const pages = await pagePromise;
      setProgress(32, "اعتبارسنجی رسمی HTML", "درخواست نتایج W3C Nu برای صفحه اصلی و پروژه‌ها");
      const markupPromise = Promise.all(["./", "./projects.html"].map(validateMarkup));
      setProgress(42, "اجرای صفحات در مرورگر", "آزمون runtime، axe-core، منابع، تعاملات و چهار عرض صفحه");
      const browserPromise = (async () => {
        for (const pagePath of ["./", "./projects.html"]) {
          try {
            const pageResult = await runBrowserPageAudit(pagePath);
            state.browser.pages.push(pageResult);
            addBrowserFindings(pageResult);
          } catch (error) {
            addResult("مرورگر واقعی", pagePath + " · اجرای صفحه در iframe", "warn",
              error.message || String(error),
              "خطاهای runtime، axe-core و breakpointهای این صفحه در این اجرا اندازه‌گیری نشدند.",
              "بررسی کن که GitHub Pages اجازه بارگذاری same-origin iframe و فایل audit-bridge.js را می‌دهد.");
          }
        }
      })();
      const pagespeedAndCiPromise = Promise.all([psiPromise, ciPromise]);

      await Promise.all([browserPromise, markupPromise, pagespeedAndCiPromise]);
      setProgress(83, "بررسی منابع، کش و خطاهای HTTP", "در حال بررسی assetها، Service Worker، headers و fallback صفحه 404");
      await Promise.all([
        checkAssets(pages),
        checkServiceWorker(),
        checkSecurityHeaders(pages[0]),
        check404Handling(),
        checkCrawlFiles()
      ]);
      await inspectInteractionAssets(pages[0]);
      renderLighthouse();
      renderVitals();
      renderBrowser();
      renderMarkup();
      renderFindings();
      renderSummary();
      renderPrevious(previous);
      saveReport();
      setProgress(100, "آزمون کامل شد", "گزارش آماده است؛ داده‌های میدانی/آزمایشگاهی و محدودیت هر آزمون جداگانه مشخص شده‌اند.");
    } catch (error) {
      addResult("اجرای آزمون", "خطای غیرمنتظره در اجرای گزارش", "fail", error.message || String(error),
        "بخشی از آزمون‌ها ممکن است کامل نشده باشد.",
        "کنسول مرورگر را بررسی کن و دوباره اجرا کن.");
      renderLighthouse();
      renderVitals();
      renderBrowser();
      renderMarkup();
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
      vitals: state.vitals,
      browser: state.browser.pages,
      markup: state.markup,
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