(() => {
  const root = document.documentElement;
  let theme = "light";
  let language = null;
  try { theme = localStorage.getItem("portfolio-theme") === "dark" ? "dark" : "light"; } catch (_) {}
  try { language = localStorage.getItem("portfolio-language"); } catch (_) {}
  const urlLanguage = new URLSearchParams(window.location.search).get("lang")?.toUpperCase();
  if (["EN", "DE", "FA"].includes(urlLanguage)) language = urlLanguage;
  root.dataset.theme = theme;
  if (["EN", "DE", "FA"].includes(language)) {
    root.lang = language === "FA" ? "fa" : language.toLowerCase();
    root.dir = language === "FA" ? "rtl" : "ltr";
  }
})();

const DATA = {
  academicHighlights: [
    { value: "A+", label: "Selected course highlight" },
    { value: "16+", label: "Academic average placeholder" },
    { value: "32+", label: "Completed university units" },
    { value: "01", label: "Current academic direction" }
  ],
  skills: [
    { title: "Data", description: "Core analytics and data workflow tools.", items: [["NumPy","Intermediate"],["Pandas","Intermediate"],["Matplotlib","Beginner"],["Seaborn","Beginner"],["SQL","Beginner+"],["Database","Beginner+"],["ETL","Intermediate"],["API","Beginner"]] },
    { title: "Engineering", description: "Foundational engineering and workflow tools.", items: [["Git","Intermediate"],["GitHub","Intermediate"],["Docker","Beginner"],["Python","Intermediate+"],["Power BI","Intermediate"]] },
    { title: "AI / ML", description: "Applied machine learning direction.", items: [["Machine Learning","Intermediate"],["Model evaluation","Beginner+"],["Feature engineering","Beginner+"],["Data visualization","Intermediate"]] }
  ],
  languages: [
    { name:"German", level:"B1 → B2", note:"Targeting academic study in German.", progress:"62%" },
    { name:"English", level:"A2+", note:"Technical reading and ongoing development.", progress:"42%" },
    { name:"Persian", level:"Native", note:"Native language.", progress:"100%" }
  ],
  projects: [
    { number:"01", title:"Air Quality Monitor", description:"Data-oriented monitoring project focused on cleaning, analysis and presenting environmental measurements.", category:"Data / Engineering", tech:["Python","Pandas","Visualization"], linkLabel:"GitHub" },
    { number:"02", title:"Supermarket Analytics", description:"Interactive business intelligence workflow turning transactional data into a structured multi-page dashboard.", category:"Analytics", tech:["Power BI","CSV","Data Prep"], linkLabel:"Case study" },
    { number:"03", title:"Machine Learning Study", description:"Experimental work covering model evaluation, overfitting and introductory supervised learning workflows.", category:"Machine Learning", tech:["Python","ML","Evaluation"], linkLabel:"Notes" }
  ],
  publications: [
    { date:"2026", type:"Technical note", title:"Data workflow design principles", description:"Placeholder for a concise technical article or academic note." },
    { date:"2026", type:"Presentation", title:"Graph algorithms in practice", description:"Placeholder for an academic presentation or seminar contribution." },
    { date:"Future", type:"Research", title:"Research direction placeholder", description:"Reserved structure for future research, publication or preprint." }
  ]
};

const I18N = {
  EN: {
    navLabel:"Primary navigation", mobileNavLabel:"Mobile navigation", languageSelection:"Language selection", navHome:"Home", navAbout:"About / Intro", navEducation:"Education", navSkills:"Skills", navLanguages:"Languages", navProjects:"Projects", navPublications:"Publications", navContact:"Contact",
    skip:"Skip to main content", brandSubtitle:"Computer Science · Data · AI", heroEyebrow:"Computer Science / Academic Portfolio", visualData:"DATA / GRAPH / SIGNAL", heroPosition:"Computer Science · Data · AI",
    heroDescription:"A concise academic portfolio for a Computer Science student working across data analysis, machine learning, data engineering and applied technical projects.", viewWork:"View selected work", academicContact:"Academic contact", university:"Shiraz Azad University", dataFocus:"Data & AI focus",
    profile:"Profile", introduction:"Introduction", introTitle:"Focused on computing with data.", introLead:"Placeholder academic statement for a concise introduction. The final version will summarize education, technical direction and research interests without turning the home page into a biography.",
    interestData:"Data Science", interestML:"Machine Learning", interestDE:"Data Engineering", interestAI:"Applied AI",
    educationLabel:"Education", educationTitle:"Academic foundation", current:"Current", undergraduate:"Undergraduate", degree:"Computer Science / Information Technology", academicStatus:"Academic status", undergraduateStudent:"Undergraduate student", direction:"Direction", focus:"Focus", focusValue:"Computing, analytics and technical systems", selectedHighlights:"Selected highlights", highlightsNote:"Curated academic highlights, not a full transcript.",
    skillsLabel:"Skills preview", skillsTitle:"Technical stack, without fake precision.", fullSkills:"Full skill profile", languagesLabel:"Languages", languagesTitle:"Communication for an international academic path.",
    projectsLabel:"Selected projects", projectsTitle:"Technical work with an academic bias.", viewProjects:"View all projects", publicationsLabel:"Publications / Articles", publicationsTitle:"Research notes, technical writing and academic work.",
    contactLabel:"Contact", contactTitle:"For academic conversations and technical opportunities.", contactCopy:"Placeholder contact copy. Keep the final message concise, professional and appropriate for professors, admission committees and technical recruiters.",
    email:"Email", github:"GitHub", linkedin:"LinkedIn", professionalProfile:"Professional profile", academicPortfolio:"Academic portfolio", activeResearch:"active research direction", structuredSystems:"structured systems", native:"Native", targetGerman:"Targeting academic study in German.", technicalReading:"Technical reading and ongoing development.", nativeLanguage:"Native language.",
    dataDesc:"Core analytics and data workflow tools.", engDesc:"Foundational engineering and workflow tools.", mlDesc:"Applied machine learning direction.",
    caseStudy:"Case study", notes:"Notes", technicalNote:"Technical note", presentation:"Presentation", research:"Research", dataEngineering:"Data / Engineering", machineLearning:"Machine Learning", analytics:"Analytics"
  },
  DE: {
    navLabel:"Hauptnavigation", mobileNavLabel:"Mobile Navigation", languageSelection:"Sprachauswahl", navHome:"Startseite", navAbout:"Profil", navEducation:"Ausbildung", navSkills:"Kenntnisse", navLanguages:"Sprachen", navProjects:"Projekte", navPublications:"Publikationen", navContact:"Kontakt",
    skip:"Zum Hauptinhalt", brandSubtitle:"Informatik · Daten · KI", heroEyebrow:"Informatik / Akademisches Portfolio", visualData:"DATEN / GRAPH / SIGNAL", heroPosition:"Informatik · Daten · KI",
    heroDescription:"Ein kompaktes akademisches Portfolio eines Informatikstudenten mit Schwerpunkt auf Datenanalyse, maschinellem Lernen, Data Engineering und angewandten technischen Projekten.", viewWork:"Ausgewählte Arbeiten", academicContact:"Akademischer Kontakt", university:"Islamische Azad-Universität Shiraz", dataFocus:"Fokus: Daten & KI",
    profile:"Profil", introduction:"Einleitung", introTitle:"Fokussiert auf Computing mit Daten.", introLead:"Platzhalter für eine kurze akademische Vorstellung. Die finale Version fasst Ausbildung, technische Ausrichtung und Forschungsinteressen prägnant zusammen.",
    interestData:"Data Science", interestML:"Maschinelles Lernen", interestDE:"Data Engineering", interestAI:"Angewandte KI",
    educationLabel:"Ausbildung", educationTitle:"Akademische Grundlage", current:"Aktuell", undergraduate:"Bachelorstudium", degree:"Informatik / Informationstechnologie", academicStatus:"Studienstatus", undergraduateStudent:"Bachelorstudent", direction:"Ausrichtung", focus:"Schwerpunkt", focusValue:"Computing, Analytik und technische Systeme", selectedHighlights:"Ausgewählte Leistungen", highlightsNote:"Ausgewählte akademische Leistungen, kein vollständiger Notenspiegel.",
    skillsLabel:"Kenntnisse", skillsTitle:"Technischer Stack, ohne künstliche Präzision.", fullSkills:"Vollständiges Profil", languagesLabel:"Sprachen", languagesTitle:"Kommunikation für einen internationalen akademischen Weg.",
    projectsLabel:"Ausgewählte Projekte", projectsTitle:"Technische Arbeiten mit akademischem Schwerpunkt.", viewProjects:"Alle Projekte", publicationsLabel:"Publikationen / Artikel", publicationsTitle:"Forschungsnotizen, technische Texte und akademische Arbeiten.",
    contactLabel:"Kontakt", contactTitle:"Für akademischen Austausch und technische Möglichkeiten.", contactCopy:"Platzhalter für einen kurzen professionellen Kontakttext für Professoren, Zulassungskommissionen und technische Recruiter.",
    email:"E-Mail", github:"GitHub", linkedin:"LinkedIn", professionalProfile:"Professionelles Profil", academicPortfolio:"Akademisches Portfolio", activeResearch:"aktuelle Forschungsrichtung", structuredSystems:"strukturierte Systeme", native:"Muttersprache", targetGerman:"Ziel: akademisches Studium auf Deutsch.", technicalReading:"Technisches Lesen und laufende Weiterentwicklung.", nativeLanguage:"Muttersprache.",
    dataDesc:"Werkzeuge für Datenanalyse und Daten-Workflows.", engDesc:"Grundlagen für Engineering und technische Workflows.", mlDesc:"Ausrichtung auf angewandtes maschinelles Lernen.",
    caseStudy:"Fallstudie", notes:"Notizen", technicalNote:"Technische Notiz", presentation:"Präsentation", research:"Forschung", dataEngineering:"Daten / Engineering", machineLearning:"Maschinelles Lernen", analytics:"Analytik"
  },
  FA: {
    navLabel:"ناوبری اصلی", mobileNavLabel:"ناوبری موبایل", languageSelection:"انتخاب زبان", navHome:"خانه", navAbout:"معرفی", navEducation:"تحصیلات", navSkills:"مهارت‌ها", navLanguages:"زبان‌ها", navProjects:"پروژه‌ها", navPublications:"مقالات", navContact:"ارتباط",
    skip:"رفتن به محتوای اصلی", brandSubtitle:"علوم کامپیوتر · داده · هوش مصنوعی", heroEyebrow:"علوم کامپیوتر / پورتفولیوی آکادمیک", visualData:"داده / گراف / سیگنال", heroPosition:"علوم کامپیوتر · داده · هوش مصنوعی",
    heroDescription:"پورتفولیوی آکادمیک یک دانشجوی علوم کامپیوتر با تمرکز بر تحلیل داده، یادگیری ماشین، مهندسی داده و پروژه‌های فنی کاربردی.", viewWork:"مشاهده پروژه‌های منتخب", academicContact:"ارتباط آکادمیک", university:"دانشگاه آزاد شیراز", dataFocus:"تمرکز: داده و هوش مصنوعی",
    profile:"پروفایل", introduction:"معرفی", introTitle:"تمرکز بر محاسبات و داده.", introLead:"متن موقت برای معرفی کوتاه آکادمیک. نسخه نهایی تحصیلات، مسیر فنی و علایق پژوهشی را به‌صورت خلاصه بیان می‌کند.",
    interestData:"علم داده", interestML:"یادگیری ماشین", interestDE:"مهندسی داده", interestAI:"هوش مصنوعی کاربردی",
    educationLabel:"تحصیلات", educationTitle:"پایه آکادمیک", current:"در حال تحصیل", undergraduate:"کارشناسی", degree:"علوم کامپیوتر / فناوری اطلاعات", academicStatus:"وضعیت تحصیلی", undergraduateStudent:"دانشجوی کارشناسی", direction:"مسیر", focus:"تمرکز", focusValue:"محاسبات، تحلیل و سیستم‌های فنی", selectedHighlights:"برگزیده‌های تحصیلی", highlightsNote:"برگزیده‌ای از سوابق تحصیلی، نه ریزنمرات کامل.",
    skillsLabel:"پیش‌نمایش مهارت‌ها", skillsTitle:"پشته فنی، بدون نمایش دقت مصنوعی.", fullSkills:"پروفایل کامل مهارت‌ها", languagesLabel:"زبان‌ها", languagesTitle:"ارتباط برای یک مسیر آکادمیک بین‌المللی.",
    projectsLabel:"پروژه‌های منتخب", projectsTitle:"کارهای فنی با رویکرد آکادمیک.", viewProjects:"مشاهده همه پروژه‌ها", publicationsLabel:"مقالات / نوشته‌ها", publicationsTitle:"یادداشت‌های پژوهشی، نوشته‌های فنی و کارهای آکادمیک.",
    contactLabel:"ارتباط", contactTitle:"برای گفت‌وگوهای آکادمیک و فرصت‌های فنی.", contactCopy:"متن موقت برای ارتباط حرفه‌ای با استادان، کمیته‌های پذیرش و استخدام‌کنندگان فنی.",
    email:"ایمیل", github:"گیت‌هاب", linkedin:"لینکدین", professionalProfile:"پروفایل حرفه‌ای", academicPortfolio:"پورتفولیوی آکادمیک", activeResearch:"مسیر پژوهشی فعلی", structuredSystems:"سیستم‌های ساختاریافته", native:"زبان مادری", targetGerman:"هدف: تحصیل آکادمیک به زبان آلمانی.", technicalReading:"مطالعه فنی و توسعه مستمر.", nativeLanguage:"زبان مادری",
    dataDesc:"ابزارهای اصلی تحلیل داده و گردش‌کار داده.", engDesc:"مبانی مهندسی و ابزارهای گردش‌کار.", mlDesc:"مسیر یادگیری ماشین کاربردی.",
    caseStudy:"مطالعه موردی", notes:"یادداشت‌ها", technicalNote:"یادداشت فنی", presentation:"ارائه", research:"پژوهش", dataEngineering:"داده / مهندسی", machineLearning:"یادگیری ماشین", analytics:"تحلیل"
  }
};


const DYNAMIC = {
  EN: {
    highlights:["Selected course highlight","Academic average placeholder","Completed university units","Current academic direction"],
    skillGroups:["Data","Engineering","AI / ML"], skillLevels:["Intermediate","Beginner","Beginner+"],
    langNames:["German","English","Persian"],
    projects:[
      ["Air Quality Monitor","Data-oriented monitoring project focused on cleaning, analysis and presenting environmental measurements.","Data / Engineering"],
      ["Supermarket Analytics","Interactive business intelligence workflow turning transactional data into a structured multi-page dashboard.","Analytics"],
      ["Machine Learning Study","Experimental work covering model evaluation, overfitting and introductory supervised learning workflows.","Machine Learning"]
    ],
    pubs:[
      ["Data workflow design principles","Placeholder for a concise technical article or academic note."],
      ["Graph algorithms in practice","Placeholder for an academic presentation or seminar contribution."],
      ["Research direction placeholder","Reserved structure for future research, publication or preprint."]
    ]
  },
  DE: {
    highlights:["Ausgewählte Kursleistung","Akademischer Notendurchschnitt (Platzhalter)","Abgeschlossene Universitätseinheiten","Aktuelle akademische Ausrichtung"],
    skillGroups:["Daten","Engineering","KI / ML"], skillLevels:["Fortgeschritten","Anfänger","Anfänger+"],
    langNames:["Deutsch","Englisch","Persisch"],
    projects:[
      ["Luftqualitätsmonitor","Datenorientiertes Monitoring-Projekt mit Fokus auf Bereinigung, Analyse und Darstellung von Umweltdaten.","Daten / Engineering"],
      ["Supermarkt-Analyse","Interaktiver Business-Intelligence-Workflow, der Transaktionsdaten in ein strukturiertes mehrseitiges Dashboard überführt.","Analytik"],
      ["Machine-Learning-Studie","Experimentelle Arbeit zu Modellevaluation, Overfitting und grundlegenden überwachten Lernverfahren.","Maschinelles Lernen"]
    ],
    pubs:[
      ["Prinzipien für Daten-Workflows","Platzhalter für einen kompakten technischen Artikel oder eine akademische Notiz."],
      ["Graphalgorithmen in der Praxis","Platzhalter für eine akademische Präsentation oder einen Seminarbeitrag."],
      ["Platzhalter für Forschungsrichtung","Struktur für zukünftige Forschung, Publikationen oder Preprints."]
    ]
  },
  FA: {
    highlights:["درس منتخب","میانگین تحصیلی (موقت)","واحدهای گذرانده دانشگاه","مسیر آکادمیک فعلی"],
    skillGroups:["داده","مهندسی","هوش مصنوعی / یادگیری ماشین"], skillLevels:["متوسط","مقدماتی","مقدماتی+"],
    langNames:["آلمانی","انگلیسی","فارسی"],
    projects:[
      ["پایش کیفیت هوا","پروژه‌ای داده‌محور با تمرکز بر پاک‌سازی، تحلیل و ارائه داده‌های محیط‌زیستی.","داده / مهندسی"],
      ["تحلیل سوپرمارکت","گردش‌کار هوش تجاری که داده‌های تراکنشی را به یک داشبورد ساختاریافته چندصفحه‌ای تبدیل می‌کند.","تحلیل داده"],
      ["مطالعه یادگیری ماشین","کار آزمایشی درباره ارزیابی مدل، بیش‌برازش و گردش‌کارهای مقدماتی یادگیری نظارت‌شده.","یادگیری ماشین"]
    ],
    pubs:[
      ["اصول طراحی گردش‌کار داده","متن موقت برای یک مقاله فنی کوتاه یا یادداشت آکادمیک."],
      ["الگوریتم‌های گراف در عمل","متن موقت برای یک ارائه دانشگاهی یا مشارکت در سمینار."],
      ["مسیر پژوهشی در آینده","ساختار رزرو شده برای پژوهش، مقاله یا پیش‌چاپ آینده."]
    ]
  }
};

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
let currentLanguage = "EN";

function t(key) { return I18N[currentLanguage][key] ?? I18N.EN[key] ?? key; }

function renderAcademicHighlights() {
  const labels = DYNAMIC[currentLanguage].highlights;
  qsa("#academic-highlights [data-dynamic]").forEach((el, i) => { el.textContent = labels[i] ?? ""; });
}

function renderSkills() {
  const d = DYNAMIC[currentLanguage];
  qsa("#skill-groups [data-dynamic^='skill-group-']").forEach((el, i) => { el.textContent = d.skillGroups[i] ?? ""; });
  qsa("#skill-groups [data-dynamic^='skill-desc-']").forEach((el, i) => { el.textContent = [t("dataDesc"), t("engDesc"), t("mlDesc")][i] ?? ""; });
  qsa("#skill-groups [data-level-key]").forEach(el => {
    const level = el.dataset.levelKey;
    const index = level === "Intermediate" || level === "Intermediate+" ? 0 : level === "Beginner" ? 1 : 2;
    el.textContent = level === "Intermediate+" ? (d.skillLevels[0] ?? level) + "+" : (d.skillLevels[index] ?? level);
  });
}

function renderLanguages() {
  const d = DYNAMIC[currentLanguage];
  const notes = [t("targetGerman"), t("technicalReading"), t("nativeLanguage")];
  qsa("#language-list [data-dynamic^='lang-name-']").forEach((el, i) => { el.textContent = d.langNames[i] ?? ""; });
  qsa("#language-list [data-dynamic^='lang-note-']").forEach((el, i) => { el.textContent = notes[i] ?? ""; });
  qsa("#language-list .language-meter").forEach((el, i) => {
    const name = d.langNames[i] ?? "";
    el.setAttribute("aria-label", `${name} level indicator`);
  });
}

function renderProjects() {
  const d = DYNAMIC[currentLanguage];
  const links = [t("github"), t("caseStudy"), t("notes")];
  qsa("#project-grid [data-dynamic^='project-title-']").forEach((el, i) => {
    el.textContent = d.projects[i]?.[0] ?? "";
  });
  qsa("#project-grid [data-dynamic^='project-desc-']").forEach((el, i) => {
    el.textContent = d.projects[i]?.[1] ?? "";
  });
  qsa("#project-grid [data-dynamic^='project-cat-']").forEach((el, i) => {
    el.textContent = d.projects[i]?.[2] ?? "";
  });
  qsa("#project-grid [data-dynamic^='project-link-']").forEach((el, i) => {
    el.textContent = `${links[i] ?? ""} ↗`;
    el.setAttribute("aria-label", `${links[i] ?? ""} for ${d.projects[i]?.[0] ?? ""}`);
  });
}

function renderPublications() {
  const d = DYNAMIC[currentLanguage];
  const types = [t("technicalNote"), t("presentation"), t("research")];
  qsa("#publication-list [data-dynamic^='pub-title-']").forEach((el, i) => {
    el.textContent = d.pubs[i]?.[0] ?? "";
  });
  qsa("#publication-list [data-dynamic^='pub-desc-']").forEach((el, i) => {
    el.textContent = d.pubs[i]?.[1] ?? "";
  });
  qsa("#publication-list [data-dynamic^='pub-type-']").forEach((el, i) => {
    el.textContent = types[i] ?? "";
  });
}

function applyStaticLanguage() {
  const dict = I18N[currentLanguage];
  qsa("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  qsa("[data-i18n-aria]").forEach(el => {
    const key = el.dataset.i18nAria;
    if (dict[key] !== undefined) el.setAttribute("aria-label", dict[key]);
  });
  document.title = currentLanguage === "FA" ? "آرتین بموئی — علوم کامپیوتر · داده · هوش مصنوعی" : currentLanguage === "DE" ? "Artin Bamooei — Informatik · Daten · KI" : "Artin Bamooei — Computer Science · Data · AI";
  const meta = qs('meta[name="description"]');
  if (meta) meta.content = currentLanguage === "FA" ? "پورتفولیوی آکادمیک آرتین بموئی در حوزه علوم کامپیوتر، داده و هوش مصنوعی." : currentLanguage === "DE" ? "Akademisches Portfolio von Artin Bamooei mit Schwerpunkt auf Informatik, Daten und KI." : "Academic portfolio of Artin Bamooei focused on Computer Science, Data and AI.";

  const ogTitle = qs('meta[property="og:title"]');
  const ogDescription = qs('meta[property="og:description"]');
  const twitterTitle = qs('meta[name="twitter:title"]');
  const twitterDescription = qs('meta[name="twitter:description"]');
  const locale = qs('meta[property="og:locale"]');
  if (ogTitle) ogTitle.content = document.title;
  if (ogDescription) ogDescription.content = meta ? meta.content : document.title;
  if (twitterTitle) twitterTitle.content = document.title;
  if (twitterDescription) twitterDescription.content = meta ? meta.content : document.title;
  if (locale) locale.content = currentLanguage === "FA" ? "fa_IR" : currentLanguage === "DE" ? "de_DE" : "en_US";
}

function syncThemeLabels() {
  const toggle = qs("[data-theme-toggle]");
  if (!toggle) return;
  const isDark = document.documentElement.dataset.theme === "dark";
  const label = isDark
    ? (currentLanguage === "FA" ? "تغییر به حالت روشن" : currentLanguage === "DE" ? "Zum hellen Modus wechseln" : "Switch to light mode")
    : (currentLanguage === "FA" ? "تغییر به حالت تیره" : currentLanguage === "DE" ? "Zum dunklen Modus wechseln" : "Switch to dark mode");
  toggle.setAttribute("aria-label", label);
  toggle.setAttribute("title", label);
}

function setupLanguages() {
  const buttons = qsa("[data-lang]");
  const applyLanguage = lang => {
    currentLanguage = ["EN", "DE", "FA"].includes(lang) ? lang : "EN";
    document.documentElement.lang = currentLanguage === "FA" ? "fa" : currentLanguage.toLowerCase();
    document.documentElement.dir = currentLanguage === "FA" ? "rtl" : "ltr";

    buttons.forEach(button => {
      const active = button.dataset.lang === currentLanguage;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
    qsa(".desktop-nav .nav-link").forEach(link => link.removeAttribute("aria-current"));
    const activeHash = window.location.hash || "#home";
    const activeLink = qs(`.desktop-nav .nav-link[href="${activeHash}"]`) || qs('.desktop-nav .nav-link[href="#home"]');
    if (activeLink) activeLink.setAttribute("aria-current", "page");

    applyStaticLanguage();
    renderAcademicHighlights();
    renderSkills();
    renderLanguages();
    renderProjects();
    renderPublications();
    syncThemeLabels();
    setupReveal();

    try { localStorage.setItem("portfolio-language", currentLanguage); } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set("lang", currentLanguage.toLowerCase());
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  };

  buttons.forEach(button => button.addEventListener("click", () => applyLanguage(button.dataset.lang)));

  let saved = null;
  try { saved = localStorage.getItem("portfolio-language"); } catch (_) {}
  const queryLanguage = new URLSearchParams(window.location.search).get("lang")?.toUpperCase();
  const initialLanguage = ["EN", "DE", "FA"].includes(queryLanguage) ? queryLanguage : saved;
  applyLanguage(initialLanguage && ["EN", "DE", "FA"].includes(initialLanguage) ? initialLanguage : "EN");
}

function setupReveal() {
  const items = qsa(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window)) { items.forEach(item => item.classList.add("is-visible")); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -30px" });
  items.forEach(item => observer.observe(item));
}

function setupNav() {
  const header = qs("[data-header]");
  const menuToggle = qs("[data-menu-toggle]");
  const mobileNav = qs("[data-mobile-nav]");
  const links = qsa(".desktop-nav .nav-link");
  const sections = qsa("main section[id]");

  if (!header || !menuToggle || !mobileNav) return;

  const closeMenu = () => {
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  };

  menuToggle.addEventListener("click", () => {
    const open = !mobileNav.classList.contains("is-open");
    mobileNav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  qsa("a", mobileNav).forEach(link => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && mobileNav.classList.contains("is-open")) closeMenu();
  });

  const mobileQuery = window.matchMedia("(max-width: 1100px)");
  const syncViewport = () => {
    if (!mobileQuery.matches) closeMenu();
  };
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", syncViewport);
  }

  const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 12);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if ("IntersectionObserver" in window && links.length && sections.length) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = "#" + entry.target.id;
        links.forEach(link => {
          const active = link.getAttribute("href") === target;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -58% 0px", threshold: 0 });

    sections.forEach(section => navObserver.observe(section));
  }
}

function setYear() { const year = qs("#current-year"); if (year) year.textContent = String(new Date().getFullYear()); }

document.addEventListener("DOMContentLoaded", () => { setYear(); setupLanguages(); setupNav(); });