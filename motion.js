(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visual = document.querySelector(".hero-visual.data-field");
  if (!visual) return;
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => { const node=document.createElementNS(ns,tag); Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value))); return node; };
  const svg=el("svg",{class:"motion-scene",viewBox:"0 0 800 620",role:"presentation","aria-hidden":"true",focusable:"false"});
  const defs=el("defs");
  const wire=el("linearGradient",{id:"wireGradient",x1:"0",y1:"0",x2:"1",y2:"1"});
  [["0%","#68dff4",".12"],["48%","#7b9dff",".95"],["100%","#9c8aff",".12"]].forEach(([offset,color,opacity])=>wire.append(el("stop",{offset,"stop-color":color,"stop-opacity":opacity})));
  const core=el("radialGradient",{id:"coreGradient"});
  [["0%","#d7fbff"],["35%","#65d7f4"],["72%","#347ca9"],["100%","#182c58"]].forEach(([offset,color])=>core.append(el("stop",{offset,"stop-color":color})));
  const bars=el("linearGradient",{id:"barGradient",x1:"0",y1:"0",x2:"1",y2:"0"});
  [["0%","#61d8ee"],["100%","#9a8aff"]].forEach(([offset,color])=>bars.append(el("stop",{offset,"stop-color":color})));
  const glow=el("filter",{id:"nodeGlow",x:"-200%",y:"-200%",width:"500%",height:"500%"}); glow.append(el("feGaussianBlur",{stdDeviation:"4",result:"blur"}));
  const merge=el("feMerge");merge.append(el("feMergeNode",{in:"blur"}),el("feMergeNode",{in:"SourceGraphic"}));glow.append(merge);
  const coreGlow=el("filter",{id:"coreGlow",x:"-100%",y:"-100%",width:"300%",height:"300%"});coreGlow.append(el("feGaussianBlur",{stdDeviation:"13",result:"blur"}));
  const coreMerge=el("feMerge");coreMerge.append(el("feMergeNode",{in:"blur"}),el("feMergeNode",{in:"SourceGraphic"}));coreGlow.append(coreMerge);
  defs.append(wire,core,bars,glow,coreGlow);svg.append(defs);
  const g=el("g");
  [[400,300,210],[400,300,164],[400,300,112]].forEach(([cx,cy,r],i)=>g.append(el("circle",{cx,cy,r,class:i===1?"scene-orbit scene-orbit-strong":"scene-orbit"})));
  g.append(el("ellipse",{cx:400,cy:300,rx:252,ry:90,class:"scene-orbit",transform:"rotate(-28 400 300)"}),el("ellipse",{cx:400,cy:300,rx:252,ry:90,class:"scene-orbit",transform:"rotate(48 400 300)"}));
  const paths=["M145 165 C230 165 245 245 326 260 S470 220 545 155 S630 145 665 195","M132 420 C230 420 255 345 330 330 S475 385 560 450 S630 450 682 405","M255 100 C270 170 330 195 400 188 S520 150 555 95","M245 515 C280 445 335 420 400 430 S530 470 560 530","M120 300 C220 300 255 300 290 300","M510 300 C590 300 620 300 690 300"];
  paths.forEach((d,i)=>g.append(el("path",{d,class:"scene-wire",style:"animation-delay:"+(i*-1.1)+"s"})));
  g.append(el("circle",{cx:400,cy:300,r:76,class:"scene-core"}),el("circle",{cx:400,cy:300,r:94,class:"scene-ring"}),el("circle",{cx:400,cy:300,r:130,class:"scene-ring reverse"}),el("path",{d:"M400 170 L400 430 M270 300 L530 300",class:"scene-orbit"}),el("path",{d:"M400 202 L400 398",class:"scene-scan"}));
  [[145,165],[665,195],[132,420],[682,405],[255,100],[555,95],[245,515],[560,530],[290,300],[510,300],[326,260],[545,155],[330,330],[560,450]].forEach(([cx,cy],i)=>g.append(el("circle",{cx,cy,r:i%3===0?5:3.2,class:i%4===0?"scene-node-soft":"scene-node"})));
  const label=(x,y,top,bottom)=>{const group=el("g"),a=el("text",{x,y,class:"scene-label"}),b=el("text",{x,y:y+23,class:"scene-value"});a.textContent=top;b.textContent=bottom;group.append(a,b);return group;};
  g.append(label(70,90,"INPUT / 01","Raw signals"),label(570,88,"MODEL / 02","Pattern map"),label(590,505,"OUTPUT / 03","Insight"));
  const barsGroup=el("g");[38,60,46,78,54,88,66,100,72].forEach((h,i)=>barsGroup.append(el("rect",{x:295+i*24,y:560-h*.62,width:9,height:h*.62,rx:4,class:"scene-bar",style:"animation-delay:"+(i*.16)+"s"})));g.append(barsGroup);svg.append(g);
  visual.insertBefore(svg,visual.querySelector(".hero-visual-overlay")||visual.firstChild);
  if(!reduce){
    const progress=document.createElement("div");progress.className="motion-progress";progress.setAttribute("aria-hidden","true");document.body.append(progress);
    const glowCursor=document.createElement("div");glowCursor.className="motion-cursor-glow";glowCursor.setAttribute("aria-hidden","true");document.body.append(glowCursor);
    let ticking=false;
    const update=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;document.documentElement.style.setProperty("--page-progress",(max>0?window.scrollY/max:0).toFixed(4));ticking=false;};
    window.addEventListener("scroll",()=>{if(!ticking){requestAnimationFrame(update);ticking=true;}},{passive:true});update();
    if(window.matchMedia("(hover:hover) and (pointer:fine)").matches){
      document.documentElement.classList.add("motion-pointer");
      window.addEventListener("pointermove",event=>{
        glowCursor.style.left=event.clientX+"px";glowCursor.style.top=event.clientY+"px";
        const rect=visual.getBoundingClientRect();
        if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom){
          visual.style.setProperty("--pointer-x",((event.clientX-rect.left)/rect.width*100).toFixed(1)+"%");
          visual.style.setProperty("--pointer-y",((event.clientY-rect.top)/rect.height*100).toFixed(1)+"%");
        }
      },{passive:true});
    }
  }
  if(window.IntersectionObserver){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:"0px 0px -36px 0px"});
    document.querySelectorAll(".reveal").forEach(node=>observer.observe(node));
  }else document.querySelectorAll(".reveal").forEach(node=>node.classList.add("is-visible"));
})();