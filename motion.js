(() => {
  const visual = document.querySelector(".hero-visual.data-field");
  if (!visual || visual.querySelector(".signature-glass-scene")) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mountArtwork = async () => {
    try {
      const response = await fetch("./assets/signature-glass-core.svg", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Artwork request failed");
      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
      const artwork = parsed.documentElement;
      if (artwork.localName !== "svg" || parsed.querySelector("parsererror")) throw new Error("Invalid SVG artwork");
      const imported = document.importNode(artwork, true);
      imported.classList.add("signature-glass-scene");
      imported.setAttribute("aria-hidden", "true");
      imported.setAttribute("focusable", "false");
      imported.removeAttribute("role");
      visual.insertBefore(imported, visual.querySelector(".hero-visual-overlay") || visual.firstChild);
      visual.classList.add("artwork-ready");
      if (!reduced) visual.classList.add("artwork-animated");
    } catch (_) {
      visual.classList.add("artwork-fallback");
    }
  };

  mountArtwork();

  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    let frame = 0;
    visual.addEventListener("pointermove", event => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = visual.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        visual.style.setProperty("--pointer-x", (x * 8).toFixed(2) + "px");
        visual.style.setProperty("--pointer-y", (y * 8).toFixed(2) + "px");
      });
    }, { passive: true });
    visual.addEventListener("pointerleave", () => {
      visual.style.setProperty("--pointer-x", "0px");
      visual.style.setProperty("--pointer-y", "0px");
    }, { passive: true });
  }

  if (!reduced) {
    document.documentElement.classList.add("motion-enabled");
    const progress = document.createElement("div");
    progress.className = "motion-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.append(progress);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target === visual) visual.classList.add("is-in-view");
      observer.unobserve(entry.target);
    }), { threshold: .12, rootMargin: "0px 0px -36px 0px" });
    document.querySelectorAll(".reveal").forEach(node => observer.observe(node));
    observer.observe(visual);
  } else {
    document.querySelectorAll(".reveal").forEach(node => node.classList.add("is-visible"));
    visual.classList.add("is-in-view");
  }
})();