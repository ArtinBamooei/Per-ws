(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  const runId = params.get("auditRun");
  if (params.get("audit") !== "1" || !runId || window.parent === window) return;

  const SOURCE = "portfolio-audit-bridge";
  const runtime = { consoleErrors: [], resourceErrors: [], rejections: [], cspViolations: [], longTasks: [], paints: [], fontProbe: { loadedFaces: 0, error: "" }, lcp: null, cls: 0, inp: null };
  const post = (type, payload = {}) => {
    window.parent.postMessage({ source: SOURCE, runId, type, path: location.pathname, ...payload }, location.origin);
  };
  const clean = value => String(value ?? "").slice(0, 600);

  window.addEventListener("error", event => {
    if (event.target && event.target !== window) {
      const target = event.target;
      runtime.resourceErrors.push({
        tag: target.tagName || "resource",
        url: clean(target.currentSrc || target.src || target.href || ""),
        message: "Resource failed to load"
      });
      return;
    }
    runtime.consoleErrors.push({
      message: clean(event.message || "Uncaught runtime error"),
      file: clean(event.filename || ""),
      line: event.lineno || 0,
      column: event.colno || 0
    });
  }, true);

  window.addEventListener("unhandledrejection", event => {
    runtime.rejections.push({ message: clean(event.reason?.message || event.reason || "Unhandled promise rejection") });
  });

  document.addEventListener("securitypolicyviolation", event => {
    runtime.cspViolations.push({
      directive: clean(event.violatedDirective),
      blocked: clean(event.blockedURI),
      source: clean(event.sourceFile),
      line: event.lineNumber || 0
    });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args) => {
    runtime.consoleErrors.push({ message: clean(args.map(value => value?.message || value).join(" ")) });
    originalConsoleError(...args);
  };

  if ("PerformanceObserver" in window) {
    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length) runtime.lcp = entries[entries.length - 1].startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) runtime.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (entry.interactionId) runtime.inp = Math.max(runtime.inp || 0, entry.duration);
      }).observe({ type: "event", buffered: true, durationThreshold: 40 });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        runtime.paints.push(...list.getEntries().map(entry => ({ name: entry.name, startTime: entry.startTime })));
      }).observe({ type: "paint", buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) runtime.longTasks.push(entry.duration);
      }).observe({ type: "longtask", buffered: true });
    } catch (_) {}
  }

  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  function snapshot() {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = [...performance.getEntriesByType("paint"), ...runtime.paints].filter((entry, index, all) => all.findIndex(item => item.name === entry.name) === index);
    const resources = performance.getEntriesByType("resource");
    const sameOrigin = resources.filter(item => {
      try { return new URL(item.name).origin === location.origin; } catch (_) { return false; }
    });
    const thirdParty = resources.filter(item => {
      try { return new URL(item.name).origin !== location.origin; } catch (_) { return false; }
    });
    const largest = [...resources]
      .sort((a, b) => (b.transferSize || b.encodedBodySize || 0) - (a.transferSize || a.encodedBodySize || 0))
      .slice(0, 12)
      .map(item => ({
        name: clean(item.name),
        initiator: item.initiatorType,
        duration: Math.round(item.duration),
        transferSize: item.transferSize || null,
        encodedBodySize: item.encodedBodySize || null,
        decodedBodySize: item.decodedBodySize || null,
        sizeVisibility: item.transferSize ? "visible" : "zero-or-hidden-by-TAO/cache"
      }));
    const interactive = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [tabindex]")]
      .filter(element => !element.disabled);
    const positiveTabindex = interactive.filter(element => Number(element.getAttribute("tabindex")) > 0);
    const targetSizes = interactive.map(element => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, name: element.getAttribute("aria-label") || element.textContent.trim().slice(0, 60) || element.tagName };
    }).filter(item => item.width > 0 && item.height > 0 && (item.width < 24 || item.height < 24));

    return {
      url: location.href,
      loadedAssets: [...document.querySelectorAll("script[src], link[rel=stylesheet][href]")].map(node => ({ tag: node.tagName.toLowerCase(), url: new URL(node.getAttribute(node.tagName === "LINK" ? "href" : "src"), location.href).href })),
      serviceWorker: { supported: "serviceWorker" in navigator, controlled: Boolean(navigator.serviceWorker?.controller), controllerScriptURL: navigator.serviceWorker?.controller?.scriptURL || null },
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > innerWidth + 1 },
      navigation: nav ? {
        responseStart: Math.round(nav.responseStart),
        requestStart: Math.round(nav.requestStart),
        ttfb: Math.round(Math.max(0, nav.responseStart - nav.requestStart)),
        domInteractive: Math.round(nav.domInteractive),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        transferSize: nav.transferSize || null,
        encodedBodySize: nav.encodedBodySize || null,
        decodedBodySize: nav.decodedBodySize || null,
        protocol: nav.nextHopProtocol || "unknown"
      } : null,
      paint: {
        fcp: paints.find(item => item.name === "first-contentful-paint")?.startTime ?? null,
        lcp: runtime.lcp,
        cls: Number(runtime.cls.toFixed(4)),
        inpMaxObserved: runtime.inp
      },
      resources: {
        total: resources.length,
        sameOrigin: sameOrigin.length,
        thirdParty: thirdParty.length,
        sameOriginTransferBytes: sameOrigin.reduce((sum, item) => sum + (item.transferSize || 0), 0),
        visibleTransferEntries: resources.filter(item => item.transferSize > 0).length,
        zeroTransferEntries: resources.filter(item => !item.transferSize).length,
        largest
      },
      execution: {
        longTaskCount: runtime.longTasks.length,
        longestTask: runtime.longTasks.length ? Math.round(Math.max(...runtime.longTasks)) : null,
        totalLongTaskTime: Math.round(runtime.longTasks.reduce((sum, value) => sum + value, 0)),
        consoleErrors: runtime.consoleErrors.slice(0, 20),
        resourceErrors: runtime.resourceErrors.slice(0, 20),
        unhandledRejections: runtime.rejections.slice(0, 10),
        cspViolations: runtime.cspViolations.slice(0, 20)
      },
      documentChecks: {
        missingImageAlt: document.querySelectorAll("img:not([alt])").length,
        brokenImages: [...document.images].filter(image => image.complete && image.naturalWidth === 0 && image.src).map(image => image.currentSrc || image.src),
        positiveTabindex: positiveTabindex.length,
        focusableCount: interactive.length,
        smallTargets: targetSizes.slice(0, 25),
        fontsReady: document.fonts?.status === "loaded",
        vazirmatnAvailable: document.fonts?.check?.('16px "Vazirmatn"', "فارسی") ?? false,
        vazirmatnFaces: runtime.fontProbe.loadedFaces,
        vazirmatnError: runtime.fontProbe.error
      }
    };
  }

  async function testInteractions() {
    const results = [];
    const themeButton = document.querySelector("[data-theme-toggle]");
    if (themeButton) {
      const root = document.documentElement;
      const beforeTheme = root.dataset.theme;
      let storedTheme = null;
      let storageReadable = true;
      try { storedTheme = localStorage.getItem("portfolio-theme"); } catch (_) { storageReadable = false; }
      themeButton.click();
      const afterTheme = root.dataset.theme;
      const ariaAfterClick = themeButton.getAttribute("aria-pressed");
      let persistedTheme = null;
      let themeStorageReadable = true;
      try { persistedTheme = localStorage.getItem("portfolio-theme"); } catch (_) { themeStorageReadable = false; }
      const themePersisted = !themeStorageReadable || persistedTheme === afterTheme;
      themeButton.click();
      const restoredTheme = root.dataset.theme;
      if (storageReadable) {
        try {
          if (storedTheme === null) localStorage.removeItem("portfolio-theme");
          else localStorage.setItem("portfolio-theme", storedTheme);
        } catch (_) {}
      }
      root.dataset.theme = beforeTheme;
      themeButton.setAttribute("aria-pressed", String(beforeTheme === "dark"));
      results.push({
        id: "theme-toggle",
        status: afterTheme !== beforeTheme && restoredTheme === beforeTheme && ariaAfterClick === String(afterTheme === "dark") && themePersisted ? "pass" : "fail",
        detail: "before=" + beforeTheme + ", after=" + afterTheme + ", restored=" + restoredTheme + ", aria-pressed=" + ariaAfterClick + ", persisted=" + themePersisted,
        note: "تست کلیک واقعی روی کنترل تغییر پوسته انجام شد؛ مقدار ذخیره‌شده قبلی بازیابی شد."
      });
    } else {
      results.push({ id: "theme-toggle", status: "fail", detail: "Theme button not found" });
    }

    const languageButtons = ["EN", "DE", "FA"].map(code => document.querySelector('[data-lang="' + code + '"]'));
    if (languageButtons.every(Boolean)) {
      const root = document.documentElement;
      const initialLanguage = root.lang;
      const initialDirection = root.dir;
      const initialUrl = location.href;
      let initialStorage = null;
      let canReadStorage = true;
      try { initialStorage = localStorage.getItem("portfolio-language"); } catch (_) { canReadStorage = false; }
      const resultsByLanguage = [];
      for (const code of ["EN", "DE", "FA"]) {
        const button = document.querySelector('[data-lang="' + code + '"]');
        button.click();
        await wait(120);
        const expectedLang = code === "FA" ? "fa" : code.toLowerCase();
        const expectedDir = code === "FA" ? "rtl" : "ltr";
        const stateOk = root.lang === expectedLang && root.dir === expectedDir;
        const pressedOk = button.getAttribute("aria-pressed") === "true";
        const storageOk = !canReadStorage || localStorage.getItem("portfolio-language") === code;
        resultsByLanguage.push({ code, stateOk, pressedOk, storageOk });
      }
      const originalCode = initialLanguage.toLowerCase() === "fa" ? "FA" : initialLanguage.toUpperCase();
      const restoreButton = document.querySelector('[data-lang="' + (["EN", "DE", "FA"].includes(originalCode) ? originalCode : "EN") + '"]');
      if (restoreButton) {
        restoreButton.click();
        await wait(120);
      }
      if (canReadStorage) {
        try {
          if (initialStorage === null) localStorage.removeItem("portfolio-language");
          else localStorage.setItem("portfolio-language", initialStorage);
        } catch (_) {}
      }
      try { history.replaceState(null, "", initialUrl); } catch (_) {}
      results.push({
        id: "language-switcher",
        status: resultsByLanguage.every(item => item.stateOk && item.pressedOk && item.storageOk) ? "pass" : "fail",
        detail: resultsByLanguage.map(item => item.code + ": lang/dir=" + item.stateOk + ", aria=" + item.pressedOk + ", storage=" + item.storageOk).join(" · "),
        note: "هر سه زبان با کلیک واقعی آزمایش و ترجیح اولیه بازیابی شد."
      });
    } else {
      results.push({ id: "language-switcher", status: "fail", detail: "Language selector buttons are missing" });
    }

    const menuButton = document.querySelector("[data-menu-toggle]");
    const mobileNav = document.querySelector("#mobile-nav");
    if (menuButton && mobileNav && innerWidth <= 920) {
      const initial = menuButton.getAttribute("aria-expanded");
      menuButton.click();
      const opened = menuButton.getAttribute("aria-expanded") === "true" && !mobileNav.hidden && mobileNav.classList.contains("is-open");
      menuButton.click();
      const closed = menuButton.getAttribute("aria-expanded") === "false" && mobileNav.hidden;
      results.push({
        id: "mobile-navigation",
        status: opened && closed ? "pass" : "fail",
        detail: "opened=" + opened + ", closed=" + closed + ", initial=" + initial
      });
    } else if (menuButton && mobileNav) {
      results.push({ id: "mobile-navigation", status: "info", detail: "برای این بررسی viewport موبایل لازم است." });
    }
    return results;
  }

  let axePromise = null;
  async function loadAxe() {
    if (window.axe) return window.axe;
    if (!axePromise) {
      axePromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL("./assets/vendor/axe-core-4.14.0.min.js", location.href).href;
        script.onload = () => window.axe ? resolve(window.axe) : reject(new Error("axe-core loaded without global API"));
        script.onerror = () => reject(new Error("Local axe-core file could not be loaded"));
        document.head.append(script);
      });
    }
    return axePromise;
  }

  async function runAccessibility() {
    const axe = await loadAxe();
    const results = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]
      }
    });
    const simplify = item => ({
      id: item.id,
      impact: item.impact || "unknown",
      help: clean(item.help),
      description: clean(item.description),
      helpUrl: item.helpUrl,
      nodes: item.nodes.slice(0, 15).map(node => ({
        target: node.target,
        summary: clean(node.failureSummary || node.any?.[0]?.message || node.all?.[0]?.message || "Needs review"),
        html: clean(node.html)
      })),
      totalNodes: item.nodes.length
    });
    return {
      version: axe.version,
      passes: results.passes.length,
      violations: results.violations.map(simplify),
      incomplete: results.incomplete.map(simplify),
      inapplicable: results.inapplicable.length,
      rulesRun: results.passes.length + results.violations.length + results.incomplete.length + results.inapplicable.length
    };
  }

  window.addEventListener("message", async event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.source !== "portfolio-audit-parent" || message.runId !== runId) return;

    if (message.type === "RUN") {
      let loadSnapshot = null;
      try {
        await document.fonts?.ready;
        // Explicitly request the Persian face; it is otherwise unused on initial LTR visits.
        try {
          const faces = await document.fonts?.load('16px "Vazirmatn"', "فارسی");
          runtime.fontProbe.loadedFaces = faces?.length || 0;
        } catch (error) {
          runtime.fontProbe.error = clean(error.message || error);
        }
        await wait(1200);
        // Capture page-load metrics before axe and click probes can change layout or add work.
        loadSnapshot = snapshot();
        const accessibility = await runAccessibility();
        const interactions = await testInteractions();
        post("audit-result", { snapshot: loadSnapshot, accessibility, interactions });
      } catch (error) {
        let interactions = [];
        try { interactions = await testInteractions(); } catch (_) {}
        post("audit-result", {
          snapshot: loadSnapshot || snapshot(),
          error: clean(error.message || error),
          interactions
        });
      }
    }

    if (message.type === "ACCESSIBILITY") {
      try {
        const accessibility = await runAccessibility();
        post("accessibility-result", { accessibility, viewport: innerWidth });
      } catch (error) {
        post("accessibility-result", { error: clean(error.message || error), viewport: innerWidth });
      }
    }

    if (message.type === "INTERACTIONS") {
      post("interactions-result", { interactions: await testInteractions(), viewport: innerWidth });
    }

    if (message.type === "VIEWPORT") {
      await wait(350);
      post("viewport-result", {
        requestedWidth: message.width,
        viewport: { width: innerWidth, height: innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > innerWidth + 1 }
      });
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => post("ready"), { once: true });
  } else {
    post("ready");
  }
})();