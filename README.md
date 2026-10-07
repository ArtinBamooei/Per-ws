# Artin Bamooei — Academic Portfolio

Static multilingual academic portfolio built with semantic HTML, CSS and vanilla JavaScript.

## Structure

- `index.html` — semantic page structure, SEO metadata and crawlable content
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

The repository includes ESLint configuration and a GitHub Actions workflow for JavaScript syntax/lint checks and basic HTML/link validation.
