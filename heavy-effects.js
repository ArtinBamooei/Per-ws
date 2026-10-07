(() => {
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadStyles() {
    if (document.querySelector('link[data-heavy-effects-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./heavy-effects.css?v=20261007-1";
    link.dataset.heavyEffectsStyle = "true";
    document.head.appendChild(link);
  }

  function setupDataField() {
    const visual = document.querySelector(".hero-visual");
    if (!visual || prefersReducedMotion()) return;

    const canvas = document.createElement("canvas");
    canvas.className = "heavy-data-field";
    canvas.setAttribute("aria-hidden", "true");
    visual.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const pointer = { x: 0.5, y: 0.5, active: false };
    const particles = [];
    const pulses = [];
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let resizeObserver;

    const resize = () => {
      const rect = visual.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const count = () => window.innerWidth <= 720 ? 85 : 170;

    const seed = () => {
      particles.length = 0;
      const total = count();
      for (let i = 0; i < total; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.5 + 0.55,
          phase: Math.random() * Math.PI * 2
        });
      }
    };

    const spawnPulse = () => {
      if (pulses.length >= 7 || particles.length < 2) return;
      const source = particles[Math.floor(Math.random() * particles.length)];
      pulses.push({ x: source.x, y: source.y, life: 0, max: 900 + Math.random() * 900 });
    };

    const onPointerMove = event => {
      const rect = visual.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
      pointer.active = true;
    };
    const onPointerLeave = () => { pointer.active = false; };

    const draw = now => {
      const dt = Math.min(32, now - last);
      last = now;
      ctx.clearRect(0, 0, width, height);

      const px = (pointer.x - 0.5) * 24;
      const py = (pointer.y - 0.5) * 24;
      const linkDistance = window.innerWidth <= 720 ? 72 : 108;

      for (const particle of particles) {
        particle.x += particle.vx * dt + Math.sin(now * 0.00035 + particle.phase) * 0.012;
        particle.y += particle.vy * dt + Math.cos(now * 0.0003 + particle.phase) * 0.012;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        const ax = a.x + px * 0.35;
        const ay = a.y + py * 0.35;
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const bx = b.x + px * 0.35;
          const by = b.y + py * 0.35;
          const dx = ax - bx;
          const dy = ay - by;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > linkDistance) continue;
          const alpha = (1 - distance / linkDistance) * 0.17;
          ctx.strokeStyle = "rgba(23,105,170," + alpha + ")";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      for (const particle of particles) {
        const x = particle.x + px * 0.35;
        const y = particle.y + py * 0.35;
        ctx.fillStyle = "rgba(23,105,170,0.42)";
        ctx.beginPath();
        ctx.arc(x, y, particle.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pointer.active) {
        const x = pointer.x * width;
        const y = pointer.y * height;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 130);
        gradient.addColorStop(0, "rgba(23,105,170,0.10)");
        gradient.addColorStop(1, "rgba(23,105,170,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.life += dt;
        const progress = pulse.life / pulse.max;
        if (progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const radius = 6 + progress * 38;
        ctx.strokeStyle = "rgba(25,143,114," + ((1 - progress) * 0.3) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (Math.random() < 0.018) spawnPulse();
      raf = requestAnimationFrame(draw);
    };

    resize();
    seed();
    resizeObserver = new ResizeObserver(() => { resize(); seed(); });
    resizeObserver.observe(visual);
    visual.addEventListener("pointermove", onPointerMove, { passive: true });
    visual.addEventListener("pointerleave", onPointerLeave, { passive: true });
    raf = requestAnimationFrame(draw);

    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      visual.removeEventListener("pointermove", onPointerMove);
      visual.removeEventListener("pointerleave", onPointerLeave);
    }, { once: true });
  }

  function setupHeroTilt() {
    const visual = document.querySelector(".hero-visual");
    if (!visual || prefersReducedMotion() || window.matchMedia("(max-width: 720px)").matches) return;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      visual.style.transform = "perspective(1100px) rotateX(" + currentY + "deg) rotateY(" + currentX + "deg) translateZ(0)";
      frame = requestAnimationFrame(render);
    };

    const move = event => {
      const rect = visual.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 7;
      targetY = -((event.clientY - rect.top) / rect.height - 0.5) * 6;
    };
    const reset = () => { targetX = 0; targetY = 0; };
    visual.addEventListener("pointermove", move, { passive: true });
    visual.addEventListener("pointerleave", reset, { passive: true });
    frame = requestAnimationFrame(render);

    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(frame);
      visual.style.transform = "";
      visual.removeEventListener("pointermove", move);
      visual.removeEventListener("pointerleave", reset);
    }, { once: true });
  }

  function init() {
    loadStyles();
    setupDataField();
    setupHeroTilt();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();