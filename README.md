# Artin Bamooei — Academic Portfolio

Static multilingual academic portfolio built with semantic HTML, CSS and vanilla JavaScript.

## Structure

- `index.html` — portfolio landing page, semantic structure and SEO metadata
- `projects.html` — multilingual project case studies with scope, workflow, evidence and limitations
- `styles.css` — responsive visual system, light/dark themes and reduced-motion support
- `theme-init.js` — minimal pre-paint theme/language bootstrap
- `script.js` — language, theme controls, navigation and progressive enhancement
- `assets/` — favicon and social preview artwork
- `robots.txt` / `sitemap.xml` — search-engine discovery
- `404.html` — branded GitHub Pages fallback

## Local development

Serve the repository with any static HTTP server. No framework or build step is required for deployment. GitHub Pages serves the static files directly; the quality workflow runs linting and validation in CI.

## Languages

EN, DE and FA are available. The selected language is stored in localStorage. Explicit `?lang=en`, `?lang=de` or `?lang=fa` URLs take precedence and are persisted; changing language updates the query parameter while preserving the current hash anchor.

## Content updates

Update the static HTML first so important content remains crawlable without JavaScript. Keep translation keys synchronized in `script.js`.

## Quality checks

The repository includes ESLint configuration and a GitHub Actions workflow for JavaScript syntax/lint checks and static HTML/link validation, content checks and JavaScript syntax/lint checks.


## Project evidence and case studies

The public case-study page documents three selected projects using a consistent structure: scope, approach, what the work demonstrates, and limitations/next steps. It intentionally avoids fabricated metrics. Add quantitative results only when they can be reproduced from the linked repository or source artifact.

For each project repository, keep its README actionable:
1. Problem statement and intended outcome.
2. Data/source provenance and license, with sensitive data excluded.
3. Environment and exact setup/run commands.
4. Pipeline or architecture, including key assumptions.
5. Validation method and measured results, with the evaluation protocol.
6. Known limitations and next steps.
7. Screenshots or a demo only when they represent the current version.
8. Direct links between the portfolio case study and the canonical repository/demo.

## Academic profile integrity

Keep education, coursework, language levels, certificates and grades accurate and current. Only list a certificate when it has been earned and can be verified; distinguish a learning target from a certified language level. Do not publish GPA, rank, project impact, publication or award claims without supporting evidence.

## Accessibility and responsive review

Automated checks cover page semantics, local paths and fragments, language/theme persistence, RTL, keyboard skip navigation, reduced motion, external-link safety and payload budgets. Release review should additionally inspect 320 px, 390 px, tablet and desktop widths; keyboard-only navigation; EN/DE/FA on both pages; and light/dark mode after reload.

## Release checklist

- [ ] Clean dependency installation and configured advisory audit pass.
- [ ] npm run check, npm run lint and npm run check:syntax pass.
- [ ] EN, DE and FA work on landing and case-study pages.
- [ ] Language/theme persist after reload; FA uses RTL and EN/DE use LTR.
- [ ] Mobile navigation closes after selecting a link and with Escape.
- [ ] No broken local links, missing assets, console errors or horizontal overflow at 320 px.
- [ ] Project outcomes are backed by reproducible artifacts; no invented figures.
- [ ] GitHub Pages serves the merged commit and cache-versioned assets.
