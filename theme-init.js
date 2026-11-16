(() => {
  const root = document.documentElement;
  let theme = "dark";
  let language = null;

  try { theme = localStorage.getItem("portfolio-theme") === "light" ? "light" : "dark"; } catch (_) {}
  try { language = localStorage.getItem("portfolio-language"); } catch (_) {}

  const queryLanguage = new URLSearchParams(window.location.search).get("lang")?.toUpperCase();
  if (["EN", "DE", "FA"].includes(queryLanguage)) {
    language = queryLanguage;
    try { localStorage.setItem("portfolio-language", queryLanguage); } catch (_) {}
  }

  root.dataset.theme = theme;
  if (!["EN", "DE", "FA"].includes(language)) language = "EN";
  root.lang = language === "FA" ? "fa" : language.toLowerCase();
  root.dir = language === "FA" ? "rtl" : "ltr";

  // Load the custom visual layer without blocking the initial HTML parse.
  const visualStyles = document.createElement("link");
  visualStyles.rel = "stylesheet";
  visualStyles.href = "./cinematic.css?v=20261116-signature-v1";
  document.head.append(visualStyles);

  // Wait for the document structure before mounting the motion scene.
  document.addEventListener("DOMContentLoaded", () => {
    const motionScript = document.createElement("script");
    motionScript.src = "./motion.js?v=20261116-signature-v1";
    motionScript.async = true;
    document.body.append(motionScript);
  }, { once: true });

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
    }, { once: true });
  }
})();