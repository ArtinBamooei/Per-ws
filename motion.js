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
  const svg = el("svg", { class: "motion-scene neural-scene", viewBox: "0 0 800 620", role: "presentation", "aria-hidden": "true", focusable: "false" });
  const defs = el("defs");
  const addGradient = (id, stops, radial = false) => {
    const gradient = el(radial ? "radialGradient" : "linearGradient", { id, ...(radial ? {} : { x1: "0", y1: "0", x2: "1", y2: "1" }) });
    stops.forEach(([offset, color, opacity]) => gradient.append(el("stop", { offset, "stop-color": color, ...(opacity ? { "stop-opacity": opacity } : {}) })));
    defs.append(gradient);
  };
  addGradient("neuralTop", [["0%", "#d9fbff"], ["100%", "#62cde9"]]);
  addGradient("neuralLeft", [["0%", "#3c9fc9"], ["100%", "#163f70"]]);
  addGradient("neuralRight", [["0%", "#7f9aff"], ["100%", "#342e78"]]);
  addGradient("neuralWire", [["0%", "#64e4f5", ".08"], ["50%", "#83cfff", ".9"], ["100%", "#a49aff", ".08"]]);
  addGradient("neuralGlow", [["0%", "#6be5ff", ".24"], ["100%", "#6be5ff", "0"]], true);
  const blur = el("filter", { id: "neuralBlur", x: "-150%", y: "-150%", width: "400%", height: "400%" });
  blur.append(el("feGaussianBlur", { stdDeviation: "7" }));
  defs.append(blur);
  svg.append(defs);
  const scene = el("g", { class: "neural-depth" });
  // Technical floor: a mathematically regular perspective grid.
  const floor = el("g", { class: "neural-floor" });
  for (let i = -6; i <= 6; i++) {
    floor.append(el("path", { d: `M${400 + i * 32} 398 L${400 + i * 74} 566` }));
    floor.append(el("path", { d: `M${150 + i * 42} ${482 + Math.abs(i) * 7} L650 ${482 + Math.abs(i) * 7}` }));
  }
  scene.append(floor);
  // Layered isometric compute core — three clean planes with crisp edges.
  const cube = el("g", { class: "neural-cube" });
  cube.append(
    el("path", { d: "M400 120 L548 205 L400 290 L252 205 Z", class: "cube-top" }),
    el("path", { d: "M252 205 L400 290 L400 458 L252 372 Z", class: "cube-left" }),
    el("path", { d: "M548 205 L400 290 L400 458 L548 372 Z", class: "cube-right" }),
    el("path", { d: "M400 120 L548 205 L548 372 L400 458 L252 372 L252 205 Z", class: "cube-outline" })
  );
  // Precise internal subdivisions create a sense of engineered depth.
  ["M326 163 L474 248", "M474 163 L326 248", "M326 247 L400 290 L474 247", "M326 289 L400 332 L474 289", "M326 331 L400 374 L474 331"].forEach((d, i) => cube.append(el("path", { d, class: "cube-grid cube-grid-" + i })));
  scene.append(cube);
  // Neural pathways connect input, model layers and output ports.
  const links = [
    "M92 190 C170 190 188 226 252 226", "M92 310 C170 310 195 300 252 300",
    "M92 430 C170 430 195 360 252 360", "M548 226 C612 226 630 190 708 190",
    "M548 300 C612 300 630 310 708 310", "M548 360 C612 360 630 430 708 430",
    "M400 82 L400 120", "M400 458 L400 520"
  ];
  const network = el("g", { class: "neural-links" });
  links.forEach((d, i) => network.append(el("path", { d, class: "neural-link link-" + (i + 1) })));
  scene.append(network);
  const nodes = [
    [92,190],[92,310],[92,430],[252,226],[252,300],[252,360],
    [326,163],[400,120],[474,163],[548,226],[548,300],[548,360],
    [708,190],[708,310],[708,430],[326,331],[400,458],[474,331]
  ];
  const nodeGroup = el("g", { class: "neural-nodes" });
  nodes.forEach(([x,y], i) => {
    nodeGroup.append(el("circle", { cx:x, cy:y, r:i%3===0?5:3.4, class:"neural-node node-"+(i%4) }));
    if (i % 3 === 0) nodeGroup.append(el("circle", { cx:x, cy:y, r:11, class:"neural-node-halo" }));
  });
  scene.append(nodeGroup);
  // Inner compute lattice: a compact, symmetric neural graph.
  const brain = el("g", { class: "neural-lattice" });
  const latticeNodes = [[400,205],[365,226],[435,226],[348,260],[400,260],[452,260],[365,294],[435,294],[400,326],[374,352],[426,352]];
  [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,4],[4,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8],[8,9],[8,10],[9,10]].forEach(([a,b],i) => {
    const p=latticeNodes[a],q=latticeNodes[b];
    brain.append(el("path",{d:`M${p[0]} ${p[1]} L${q[0]} ${q[1]}`,class:"lattice-link lattice-"+(i%4)}));
  });
  latticeNodes.forEach(([x,y],i)=>brain.append(el("circle",{cx:x,cy:y,r:i===4?8:4,class:"lattice-node"})));
  brain.append(el("circle",{cx:400,cy:260,r:34,class:"lattice-focus"}));
  scene.append(brain);
  // Floating data labels and calibration marks.
  const label=(x,y,k,v,anchor="start")=>{
    const group=el("g",{class:"neural-label", "text-anchor":anchor});
    const a=el("text",{x,y,class:"neural-label-key"});a.textContent=k;
    const b=el("text",{x,y:y+21,class:"neural-label-value"});b.textContent=v;
    group.append(a,b);return group;
  };
  scene.append(label(70,118,"INGEST / 01","Structured streams"),label(730,118,"INFER / 03","Model output","end"),label(400,555,"NEURAL COMPUTE  /  02","Feature space","middle"));
  const ticks=el("g",{class:"neural-ticks"});
  for(let i=0;i<17;i++){const x=280+i*15;ticks.append(el("path",{d:`M${x} 585 v${i%4===0?9:4}`}));}
  scene.append(ticks);
  svg.append(scene);
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