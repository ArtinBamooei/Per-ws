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

  if (["EN", "DE", "FA"].includes(language)) {
    root.lang = language === "FA" ? "fa" : language.toLowerCase();
    root.dir = language === "FA" ? "rtl" : "ltr";
  }
})();


// Heavy animation test loader.
(() => {
  const script = document.createElement("script");
  script.src = "./heavy-effects.js?v=20261007-1";
  script.defer = true;
  document.head.appendChild(script);
})();
