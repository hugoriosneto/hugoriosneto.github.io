# hugoriosneto.github.io

Personal site — Astro, static, deployed to GitHub Pages on push to `master`.

## Develop

    npm install
    npm run dev

## Test

    npm test          # unit — contrast, schemas, BibTeX
    npx playwright test   # behaviour, accessibility, routing

## Content

All content lives in `src/content/` and is schema-validated at build time.
Adding a paper, talk or FAME edition means adding a YAML entry — no template changes.

Design decisions and their reasoning: `docs/superpowers/specs/2026-07-27-personal-website-redesign-design.md`
