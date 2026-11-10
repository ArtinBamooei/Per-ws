(() => {
  const root = document.documentElement;
  let theme = "light";
  let language = null;

  try { theme = localStorage.getItem("portfolio-theme") === "dark" ? "dark" : "light"; } catch (_) {}
  try { language = localStorage.getItem("portfolio-language"); } catch (_) {}

  const queryLanguage = new URLSearchParams(window.location.search).get("lang")?.toUpperCase();
  if (["EN", "DE", "FA"].includes(queryLanguage)) {
    language = queryLanguage;
    try { localStorage.setItem("portfolio-language", queryLanguage); } catch (_) {}
  }

  root.dataset.theme = theme;

  if (![ "EN", "DE", "FA" ].includes(language)) language = "EN";
  root.lang = language === "FA" ? "fa" : language.toLowerCase();
  root.dir = language === "FA" ? "rtl" : "ltr";

  // Load browser diagnostics only for the audit console's same-origin hidden test frame.
  const auditParams = new URLSearchParams(window.location.search);
  if (window.parent !== window && auditParams.get("audit") === "1" && /^[a-zA-Z0-9_-]{8,80}$/.test(auditParams.get("auditRun") || "")) {
    const auditBridge = document.createElement("script");
    auditBridge.async = false;
    auditBridge.src = new URL("./audit-bridge.js?v=20261110-audit-bridge-v6", window.location.href).href;
    document.head.append(auditBridge);
  }

  // Register a tiny same-origin cache; it never blocks the first paint.
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
    }, { once: true });
  }
})();
