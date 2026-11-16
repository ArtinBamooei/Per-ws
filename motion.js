(() => {
  const visual = document.querySelector(".hero-visual.data-field");
  if (!visual || visual.querySelector(".motion-scene")) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const svg = el("svg", { class: "motion-scene signature-scene", viewBox: "0 0 800 620", role: "presentation", "aria-hidden": "true", focusable: "false" });
  const defs = el("defs");
  const gradient = (id, x1, y1, x2, y2, stops) => {
    const g = el("linearGradient", { id, x1, y1, x2, y2 });
    stops.forEach(([offset, color, opacity]) => g.append(el("stop", { offset, "stop-color": color, ...(opacity ? { "stop-opacity": opacity } : {}) })));
    defs.append(g);
  };
  gradient("loomPearl", "0", "0", "1", "1", [["0%", "#e9fbff"], ["35%", "#7ce5f0"], ["68%", "#4c9ecb"], ["100%", "#273d78"]]);
  gradient("loomViolet", "0", "0", "1", "1", [["0%", "#c7baff"], ["45%", "#7d83dc"], ["100%", "#344a88"]]);
  gradient("loomShadow", "0", "0", "1", "1", [["0%", "#152e50"], ["55%", "#101a37"], ["100%", "#090f20"]]);
  gradient("loomThread", "0", "0", "1", "0", [["0%", "#63dce9", ".02"], ["28%", "#8ceeff", ".9"], ["68%", "#a99cff", ".85"], ["100%", "#9b8cff", ".02"]]);
  const glow = el("filter", { id: "loomGlow", x: "-100%", y: "-100%", width: "300%", height: "300%" });
  glow.append(el("feGaussianBlur", { stdDeviation: "5" }));
  defs.append(glow);
  const soft = el("filter", { id: "loomSoft", x: "-60%", y: "-60%", width: "220%", height: "220%" });
  soft.append(el("feGaussianBlur", { stdDeviation: "18" }));
  defs.append(soft);
  svg.append(defs);

  const g = el("g", { class: "loom-world" });
  // A deep, quiet field: plotted coordinates and fine registration marks.
  const field = el("g", { class: "loom-field" });
  for (let i = 0; i < 13; i++) {
    const x = 116 + i * 47;
    field.append(el("path", { d: `M${x} 126 V496` }));
  }
  for (let i = 0; i < 9; i++) {
    const y = 154 + i * 42;
    field.append(el("path", { d: `M104 ${y} H696` }));
  }
  g.append(field);

  // The signature object: a continuous, folded data ribbon, not a stock 3D primitive.
  const aura = el("path", { d: "M205 325 C230 166 372 106 489 178 C608 251 608 382 502 441 C399 499 246 452 224 344 C207 259 301 204 384 239 C466 274 496 358 442 398 C391 436 319 402 325 343 C330 295 391 276 425 309", class: "loom-aura" });
  g.append(aura);
  const sculpture = el("g", { class: "loom-sculpture" });
  sculpture.append(
    el("path", { d: "M205 325 C230 166 372 106 489 178 C608 251 608 382 502 441 C399 499 246 452 224 344 C207 259 301 204 384 239 C466 274 496 358 442 398 C391 436 319 402 325 343 C330 295 391 276 425 309", class: "loom-ribbon loom-ribbon-back" }),
    el("path", { d: "M205 325 C230 166 372 106 489 178 C608 251 608 382 502 441 C399 499 246 452 224 344 C207 259 301 204 384 239 C466 274 496 358 442 398 C391 436 319 402 325 343 C330 295 391 276 425 309", class: "loom-ribbon loom-ribbon-front" }),
    el("path", { d: "M225 314 C255 187 370 142 472 197 C564 247 574 355 488 410 C408 461 278 425 251 345", class: "loom-contour" }),
    el("path", { d: "M247 305 C278 211 370 177 453 218 C527 255 540 339 476 385 C411 431 313 402 281 341", class: "loom-contour contour-two" }),
    el("path", { d: "M270 299 C301 231 370 208 432 239 C488 267 503 327 458 363 C412 399 343 382 309 338", class: "loom-contour contour-three" }),
    el("path", { d: "M296 293 C323 252 372 239 413 260 C450 280 465 315 438 342 C410 369 367 361 338 333", class: "loom-contour contour-four" })
  );
  // Cross-section ribs make the ribbon read as a crafted, dimensional surface.
  const ribs = el("g", { class: "loom-ribs" });
  [
    "M236 238 C292 254 340 293 363 341",
    "M270 193 C324 221 375 264 396 315",
    "M316 158 C368 190 412 231 431 281",
    "M370 151 C415 181 451 220 465 263",
    "M430 166 C468 198 493 233 502 270",
    "M493 203 C522 237 539 272 540 307",
    "M548 260 C559 292 554 322 538 347",
    "M537 367 C513 399 478 420 439 428",
    "M477 444 C436 461 390 460 350 446",
    "M402 462 C360 459 321 444 291 421"
  ].forEach((d, i) => ribs.append(el("path", { d, class: "loom-rib rib-" + i })));
  sculpture.append(ribs);
  g.append(sculpture);

  // Fine data filaments enter the sculpture, bend around its topology and leave as measured streams.
  const threads = el("g", { class: "loom-threads" });
  [
    "M78 218 C154 218 169 252 224 267 C274 281 295 303 325 343",
    "M78 278 C157 278 184 292 235 310 C272 323 291 342 309 365",
    "M78 393 C156 393 188 376 239 367 C281 359 297 345 325 343",
    "M722 210 C649 210 622 244 575 274 C533 300 512 317 476 337",
    "M722 322 C649 322 618 329 570 349 C528 366 507 373 476 385",
    "M722 432 C645 432 608 411 558 393 C524 381 502 369 476 337"
  ].forEach((d, i) => threads.append(el("path", { d, class: "loom-thread thread-" + i })));
  g.append(threads);

  // Small calibrated terminals, not a generic neural-node cloud.
  const ports = el("g", { class: "loom-ports" });
  [[78,218],[78,278],[78,393],[722,210],[722,322],[722,432],[224,267],[325,343],[476,337],[575,274]].forEach(([x,y],i) => {
    ports.append(el("circle", { cx:x, cy:y, r:i<6?4:2.8, class:"loom-port" }));
    ports.append(el("circle", { cx:x, cy:y, r:i<6?10:7, class:"loom-port-halo" }));
  });
  g.append(ports);

  // The quiet center is a void: the geometry folds around an intentional aperture.
  const aperture = el("g", { class: "loom-aperture" });
  aperture.append(
    el("ellipse", { cx:390, cy:326, rx:51, ry:27, transform:"rotate(-25 390 326)", class:"loom-aperture-ring" }),
    el("ellipse", { cx:390, cy:326, rx:34, ry:15, transform:"rotate(-25 390 326)", class:"loom-aperture-core" }),
    el("path", { d:"M350 344 C370 326 407 307 431 306", class:"loom-aperture-glint" })
  );
  g.append(aperture);

  const annotations = el("g", { class: "loom-annotations" });
  const label = (x,y,top,bottom,anchor="start") => {
    const a=el("text",{x,y,"text-anchor":anchor,class:"loom-label"});a.textContent=top;
    const b=el("text",{x,y:y+18,"text-anchor":anchor,class:"loom-label-value"});b.textContent=bottom;
    annotations.append(a,b);
  };
  label(92,112,"01 / INGEST","Raw signals");
  label(708,112,"03 / SYNTHESIS","Model space","end");
  label(400,548,"DATA TO INTELLIGENCE","A continuous system","middle");
  g.append(annotations);
  const measure=el("g",{class:"loom-measure"});
  for(let i=0;i<25;i++){const x=278+i*10;measure.append(el("path",{d:`M${x} 574 v${i%4===0?10:4}`}));}
  g.append(measure);
  svg.append(g);
  visual.insertBefore(svg, visual.querySelector(".hero-visual-overlay") || visual.firstChild);

  if (!reduce) {
    document.documentElement.classList.add("motion-enabled");
    const progress=document.createElement("div");
    progress.className="motion-progress";
    progress.setAttribute("aria-hidden","true");
    document.body.append(progress);
  }
  if (window.IntersectionObserver) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}
    }),{threshold:.12,rootMargin:"0px 0px -36px 0px"});
    document.querySelectorAll(".reveal").forEach(node=>observer.observe(node));
  } else document.querySelectorAll(".reveal").forEach(node=>node.classList.add("is-visible"));
})();