const DATA = {
  academicHighlights: [
    { value: "A+", label: "Selected course highlight" },
    { value: "16+", label: "Academic average placeholder" },
    { value: "32+", label: "Completed university units" },
    { value: "01", label: "Current academic direction" }
  ],
  skills: [
    {
      title: "Data",
      description: "Core analytics and data workflow tools.",
      items: [
        ["NumPy", "Intermediate"],
        ["Pandas", "Intermediate"],
        ["Matplotlib", "Beginner"],
        ["Seaborn", "Beginner"],
        ["SQL", "Beginner+"],
        ["Database", "Beginner+"],
        ["ETL", "Intermediate"],
        ["API", "Beginner"]
      ]
    },
    {
      title: "Engineering",
      description: "Foundational engineering and workflow tools.",
      items: [
        ["Git", "Intermediate"],
        ["GitHub", "Intermediate"],
        ["Docker", "Beginner"],
        ["Python", "Intermediate+"],
        ["Power BI", "Intermediate"]
      ]
    },
    {
      title: "AI / ML",
      description: "Applied machine learning direction.",
      items: [
        ["Machine Learning", "Intermediate"],
        ["Model evaluation", "Beginner+"],
        ["Feature engineering", "Beginner+"],
        ["Data visualization", "Intermediate"]
      ]
    }
  ],
  languages: [
    { name: "German", level: "B1 → B2", note: "Targeting academic study in German.", progress: "62%" },
    { name: "English", level: "A2+", note: "Technical reading and ongoing development.", progress: "42%" },
    { name: "Persian", level: "Native", note: "Native language.", progress: "100%" }
  ],
  projects: [
    {
      number: "01",
      title: "Air Quality Monitor",
      description: "Data-oriented monitoring project focused on cleaning, analysis and presenting environmental measurements.",
      category: "Data / Engineering",
      tech: ["Python", "Pandas", "Visualization"],
      linkLabel: "GitHub"
    },
    {
      number: "02",
      title: "Supermarket Analytics",
      description: "Interactive business intelligence workflow turning transactional data into a structured multi-page dashboard.",
      category: "Analytics",
      tech: ["Power BI", "CSV", "Data Prep"],
      linkLabel: "Case study"
    },
    {
      number: "03",
      title: "Machine Learning Study",
      description: "Experimental work covering model evaluation, overfitting and introductory supervised learning workflows.",
      category: "Machine Learning",
      tech: ["Python", "ML", "Evaluation"],
      linkLabel: "Notes"
    }
  ],
  publications: [
    { date: "2026", type: "Technical note", title: "Data workflow design principles", description: "Placeholder for a concise technical article or academic note." },
    { date: "2026", type: "Presentation", title: "Graph algorithms in practice", description: "Placeholder for an academic presentation or seminar contribution." },
    { date: "Future", type: "Research", title: "Research direction placeholder", description: "Reserved structure for future research, publication or preprint." }
  ]
};

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function renderAcademicHighlights() {
  const el = qs("#academic-highlights");
  el.innerHTML = DATA.academicHighlights.map(item => `
    <div class="highlight-item">
      <strong>${item.value}</strong>
      <span>${item.label}</span>
    </div>
  `).join("");
}

function renderSkills() {
  const el = qs("#skill-groups");
  el.innerHTML = DATA.skills.map(group => `
    <article class="skill-group reveal">
      <h3>${group.title}</h3>
      <p>${group.description}</p>
      <div class="skill-list">
        ${group.items.map(([name, level]) => `
          <div class="skill-item">
            <span>${name}</span>
            <span class="skill-level">${level}</span>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderLanguages() {
  const el = qs("#language-list");
  el.innerHTML = DATA.languages.map(language => `
    <article class="language-item">
      <div class="language-top">
        <strong>${language.name}</strong>
        <span class="language-level">${language.level}</span>
      </div>
      <p class="language-note">${language.note}</p>
      <div class="language-meter" aria-label="${language.name} level indicator" role="img">
        <span style="--progress:${language.progress}"></span>
      </div>
    </article>
  `).join("");
}

function renderProjects() {
  const el = qs("#project-grid");
  el.innerHTML = DATA.projects.map(project => `
    <article class="project-card reveal">
      <span class="project-number">${project.number}</span>
      <h3>${project.title}</h3>
      <p>${project.description}</p>
      <div class="project-tech">
        ${project.tech.map(item => `<span>${item}</span>`).join("")}
      </div>
      <div class="project-footer">
        <span class="project-category">${project.category}</span>
        <a class="project-link" href="#contact" aria-label="${project.linkLabel} for ${project.title}">${project.linkLabel} ↗</a>
      </div>
    </article>
  `).join("");
}

function renderPublications() {
  const el = qs("#publication-list");
  el.innerHTML = DATA.publications.map(item => `
    <article class="publication-item reveal">
      <time class="publication-date">${item.date}</time>
      <div class="publication-copy">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
      <span class="publication-type">${item.type}</span>
    </article>
  `).join("");
}

function setupReveal() {
  const items = qsa(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(item => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px" });
  items.forEach(item => observer.observe(item));
}

function setupNav() {
  const header = qs("[data-header]");
  const menuToggle = qs("[data-menu-toggle]");
  const mobileNav = qs("[data-mobile-nav]");
  const links = qsa(".desktop-nav .nav-link");
  const sections = qsa("main section[id]");

  const closeMenu = () => {
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  qsa("a", mobileNav).forEach(link => link.addEventListener("click", closeMenu));

  const updateHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 12);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-35% 0px -58% 0px", threshold: 0 });
    sections.forEach(section => navObserver.observe(section));
  }
}

function setupLanguages() {
  const buttons = qsa("[data-lang]");
  const applyLanguageState = (lang) => {
    const isFA = lang === "FA";
    document.documentElement.lang = lang.toLowerCase();
    document.documentElement.dir = isFA ? "rtl" : "ltr";
    buttons.forEach(button => {
      const active = button.dataset.lang === lang;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
    try { localStorage.setItem("portfolio-language", lang); } catch (_) {}
  };

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang;
      applyLanguageState(lang);
    });
  });

  let saved = null;
  try { saved = localStorage.getItem("portfolio-language"); } catch (_) {}
  if (["EN", "DE", "FA"].includes(saved)) applyLanguageState(saved);
}

function setYear() {
  const year = qs("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  renderAcademicHighlights();
  renderSkills();
  renderLanguages();
  renderProjects();
  renderPublications();
  setYear();
  setupLanguages();
  setupNav();
  setupReveal();
});
