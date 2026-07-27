# Personal Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale al-folio Jekyll fork at `hugoriosneto.github.io` with a five-page Astro site built for a football-industry reader, per `docs/superpowers/specs/2026-07-27-personal-website-redesign-design.md`.

**Architecture:** Static Astro site. All content lives in schema-validated content collections (YAML for structured data, MDX for the two long-form posts), so a malformed entry fails the build rather than rendering wrong. Interactivity is three small vanilla `<script>` blocks scoped to their `.astro` components — **no UI framework at all** — plus native `<details>` for expandable rows. Colour lives entirely in CSS custom properties on `:root`, so the deferred dark theme is a variables block rather than a refactor. Deployment keeps the existing `gh-pages`-branch mechanism so no GitHub repo settings need changing.

**Tech Stack:** Astro 5 · Tailwind CSS 4 (via `@tailwindcss/vite`) · MDX · Vitest (unit) · Playwright + axe-core (behaviour + a11y) · `@fontsource-variable` self-hosted fonts · GitHub Actions

**Branch note:** All work happens on `claude/personal-website-redesign-1ead09`. The deploy workflow only publishes on push to `master`/`main`, so the live site stays on the old Jekyll build until this branch is merged. Tasks 3 and 4 delete the Jekyll site — that is safe on this branch and only on this branch.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `astro.config.mjs`, `tsconfig.json` | Project, integrations, redirects |
| `vitest.config.ts`, `playwright.config.ts` | Test runners |
| `src/styles/tokens.css` | **Every** colour, as CSS custom properties. Single source of truth. |
| `src/styles/global.css` | Tailwind import, base element styles, print styles |
| `src/lib/contrast.ts` | WCAG contrast ratio maths (used by tests) |
| `src/lib/bibtex.ts` | Builds a BibTeX string from a paper entry |
| `src/content.config.ts` | Five collections + zod schemas |
| `src/content/roles.yaml` | Career trajectory stops |
| `src/content/papers.yaml` | Four papers |
| `src/content/talks.yaml` | Six talks |
| `src/content/fame.yaml` | Five FAME editions |
| `src/content/writing/*.mdx` | The two migrated posts |
| `src/layouts/Base.astro` | `<head>`, SEO, schema.org, nav + footer wrapper |
| `src/components/Nav.astro`, `Footer.astro`, `TricolourRule.astro`, `SectionHead.astro` | Chrome |
| `src/components/Hero.astro` | The three "firsts" + framing + identity block |
| `src/components/Trajectory.astro` | Signature interaction (has JS) |
| `src/components/FameSwitcher.astro` | Edition tabs (has JS) |
| `src/components/TalkCard.astro` | Lazy embed (has JS) |
| `src/components/PaperRow.astro` | `<details>`, no JS |
| `src/components/Figure.astro`, `VideoEmbed.astro` | MDX helpers for migrated posts |
| `src/pages/*.astro` | The five pages, `writing/[...slug]`, `404` |
| `public/` | Migrated PDFs, images, favicon, robots.txt |
| `tests/unit/*.test.ts` | Vitest |
| `tests/e2e/*.spec.ts` | Playwright |

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.nvmrc`, `src/pages/index.astro`
- Modify: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hugoriosneto-site",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview --port 4322",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/mdx": "^4.2.0",
    "@astrojs/sitemap": "^3.3.0",
    "@fontsource-variable/inter": "^5.2.5",
    "@fontsource-variable/source-serif-4": "^5.2.5",
    "astro": "^5.6.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "@axe-core/playwright": "^4.10.1",
    "@playwright/test": "^1.52.0",
    "@tailwindcss/vite": "^4.1.4",
    "tailwindcss": "^4.1.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.1"
  }
}
```

`@astrojs/check` is not optional. Without it `astro check` prints an install prompt and **exits 0**, so `npm run check` reports success while typechecking nothing — and plain `tsc` does not inspect `.astro` files at all. Verify after install that `npm run check` genuinely runs: `npm run check < /dev/null` must report a file count, not an install prompt.

- [ ] **Step 2: Create `astro.config.mjs`**

Redirects are declared here now so Task 15 only has to add tests. Astro emits a meta-refresh page per entry in static output, which works on GitHub Pages.

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://hugoriosneto.github.io',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/papers': '/research',
    '/blog': '/',
    '/writing': '/',
    '/repositories': '/',
    '/blog/2020/tactical-influence-analytics': '/writing/tactical-influence-of-analytics',
    '/blog/2023/fame-recap': '/writing/fame-23-recap',
    // The old news collection. Astro static redirects do not support wildcards —
    // `'/news/[...slug]'` fails the build with GetStaticPathsRequired — so the four
    // URLs Jekyll actually emitted are enumerated.
    '/news': '/',
    '/news/1_welcome': '/',
    '/news/2_leave_cam': '/',
    '/news/3_join_gemini': '/',
  },
});
```

`build.format` defaults to `'directory'`, so each key emits `dist/<key>/index.html` and the old trailing-slash URLs (`/papers/`, `/blog/2020/tactical-influence-analytics/`) resolve to it directly. `trailingSlash: 'ignore'` is Astro's default and is stated here for documentation.

- [ ] **Step 3: Create `tsconfig.json` and `.nvmrc`**

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

`.nvmrc` — Node 22, the Active LTS. Node 20 reached end of life on 2026-04-30 and CI would otherwise run an unpatched runtime:
```
22
```

- [ ] **Step 4: Create a placeholder `src/pages/index.astro` so the build has a route**

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Hugo Rios-Neto</title></head>
  <body><h1>Hugo Rios-Neto</h1></body>
</html>
```

- [ ] **Step 5: Add Node artefacts to `.gitignore`**

Append these lines to `.gitignore`:
```
node_modules/
dist/
.astro/
test-results/
playwright-report/
```

- [ ] **Step 6: Install and build**

Run: `npm install && npm run build`
Expected: `npm install` completes, then `[build] Complete!` and a `dist/index.html` exists.

- [ ] **Step 7: Verify the built page**

Run: `test -f dist/index.html && grep -c "Hugo Rios-Neto" dist/index.html`
Expected: prints `1` or higher.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .nvmrc .gitignore src/pages/index.astro
git commit -m "build: scaffold Astro project with MDX, sitemap and Tailwind"
```

---

### Task 2: Test tooling

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/unit/smoke.test.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Create `playwright.config.ts`**

Three things here are deliberate and were each got wrong in an earlier draft:

- **Port 4322, not 4321.** `astro dev` defaults to 4321, and with `reuseExistingServer: false` a developer who has `npm run dev` open gets a hard stop whose error message suggests setting `reuseExistingServer: true` — which would defeat the fresh-build guarantee and let a dev server (with its Vite HMR client injected) satisfy Task 19's "ships no JavaScript" test. Separate ports make that impossible.
- **`html` reporter in CI as well as `github`.** The `github` reporter writes no HTML report, so Task 20's `playwright-report/` artefact upload would silently upload nothing.
- **`trace` and `screenshot` on failure.** Tasks 9–19 add roughly 45 assertions. Without these, a CI failure in Task 19's axe run gives you a large nested JSON diff in an annotation and no way to tell which element was at fault.

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

`retries` stays at 0 deliberately. Two tests wait on `networkidle` and are genuinely flake-prone, but one of them (Task 15) asserts the security-relevant invariant that no third-party host is contacted before a click — a retry there would paper over a real intermittent request.

**`devices['iPhone 13']` runs WebKit, not Chromium.** That is the point — it is the only real Safari-engine coverage in the suite, and this design leans on `color-mix()`, `backdrop-filter`, `aspect-ratio` and styled `<details>`, all of which have historically differed in WebKit. It does mean WebKit must be installed everywhere the suite runs.

- [ ] **Step 3: Write a smoke test that proves Vitest runs**

`tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the unit tests**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 5: Install Playwright browsers — both engines**

Run: `npx playwright install chromium webkit`
Expected: both builds reported as installed. WebKit is required by the `mobile` project; installing only Chromium leaves half the suite unable to launch.

- [ ] **Step 6: Prove both projects can actually launch a browser**

Downloading a browser is not the same as launching one, and `playwright test --list` never starts one — so neither step so far would catch a missing engine. Write a throwaway spec, run it on both projects, then delete it.

`tests/e2e/tmp-launch-check.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('the placeholder homepage renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hugo Rios-Neto');
});
```

Run: `npx playwright test tmp-launch-check`
Expected: **2 passed** — one per project. A failure reading `browserType.launch: Executable doesn't exist at .../webkit-*/pw_run.sh` means Step 5 was not run with both engines.

Then delete it and confirm the tree is clean:
```bash
rm -f tests/e2e/tmp-launch-check.spec.ts
rm -rf test-results playwright-report
rmdir tests/e2e 2>/dev/null || true
git status --short
```
Expected: no output from `git status --short` beyond the files this task creates.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts playwright.config.ts tests/unit/smoke.test.ts
git commit -m "test: add vitest and playwright configuration"
```

---

### Task 3: Contrast maths, TDD — then the design tokens

This is the task that catches colour regressions. The spec's first-pass `--faint` measured 2.72:1 and failed AA; these tests exist so that cannot happen again silently.

**Files:**
- Create: `src/lib/contrast.ts`, `tests/unit/contrast.test.ts`, `src/styles/tokens.css`, `tests/unit/tokens.test.ts`

- [ ] **Step 1: Write the failing contrast test**

`tests/unit/contrast.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../../src/lib/contrast';

describe('contrastRatio', () => {
  it('gives 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('gives 1:1 for a colour against itself', () => {
    expect(contrastRatio('#FBF3D5', '#FBF3D5')).toBeCloseTo(1, 2);
  });

  it('is symmetric', () => {
    const a = contrastRatio('#0a7d33', '#FBF3D5');
    const b = contrastRatio('#FBF3D5', '#0a7d33');
    expect(a).toBeCloseTo(b, 6);
  });

  it('measures the link green on cream at roughly 4.7:1', () => {
    expect(contrastRatio('#0a7d33', '#FBF3D5')).toBeGreaterThan(4.6);
    expect(contrastRatio('#0a7d33', '#FBF3D5')).toBeLessThan(4.9);
  });

  it('accepts shorthand hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/contrast.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/contrast"`.

- [ ] **Step 3: Implement `src/lib/contrast.ts`**

```ts
/** Parse `#rgb` or `#rrggbb` into 0-255 channels. */
function parseHex(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two hex colours. Always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/contrast.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Create `src/styles/tokens.css`**

```css
:root {
  /* Surfaces */
  --bg: #FBF3D5;
  --card: #fffdf7;
  --hair: #eee3bd;
  --hair2: #ddd0a4;
  --cardline: #ece1bc;

  /* Text — every one of these is contrast-tested in tests/unit/tokens.test.ts */
  --ink: #151a15;
  --dim: #575849;
  --faint: #6f6c5c;

  /* Accents */
  --acc: #0a7d33;      /* text and links only */
  --accfill: #009739;  /* fills and graphics only — fails AA as text */
  --acc2: #012169;
  --mark: rgba(254, 221, 0, 0.85); /* highlighter fill only */

  /* Type — deliberately NOT named --font-serif / --font-sans. Tailwind's @theme
     declares those same two names, so `--font-sans: var(--font-sans)` would be a
     self-reference that only resolves by cascade accident (unlayered beats
     @layer theme). One `@import './tokens.css' layer(...)` would make the property
     guaranteed-invalid and silently drop the whole site to Times. */
  --font-display: 'Source Serif 4 Variable', Georgia, serif;
  --font-body: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 6: Write the failing token contrast test**

`tests/unit/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../../src/lib/contrast';

// Resolved relative to this file, not the process CWD — Vitest leaves cwd at the
// invocation directory, so a bare relative path only works when run from the repo root.
const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

/**
 * Every declaration in the file, so nothing can be added without being classified.
 *
 * Comments are stripped first, and that is load-bearing rather than tidiness: the
 * header comment in tokens.css quotes the literal text `--font-sans: var(--font-sans)`,
 * which matches the declaration pattern. Worse, `[^;]+` crosses newlines, so the bogus
 * match would run on and swallow the next real `;` — silently erasing a genuine
 * declaration from the map.
 */
const DECLS = new Map<string, string>();
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of withoutComments.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  if (DECLS.has(m[1])) throw new Error(`Token --${m[1]} is declared twice`);
  DECLS.set(m[1], m[2].trim());
}

function raw(name: string): string {
  const v = DECLS.get(name);
  if (!v) throw new Error(`Token --${name} not found`);
  return v;
}

function token(name: string): string {
  const v = raw(name);
  if (!/^#[0-9a-fA-F]{3,6}$/.test(v)) throw new Error(`Token --${name} is not a hex value: ${v}`);
  return v;
}

/** Flatten an `rgba(r, g, b, a)` foreground over an opaque hex background. */
function composite(rgba: string, bgHex: string): string {
  const m = rgba.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s/]+([\d.]+)\s*\)/);
  if (!m) throw new Error(`Not an rgba() value: ${rgba}`);
  const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const bg = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
  const mix = [r, g, b].map((c, i) => Math.round(a * c + (1 - a) * bg[i]));
  return '#' + mix.map((c) => c.toString(16).padStart(2, '0')).join('');
}

const TEXT_TOKENS = ['ink', 'dim', 'faint', 'acc', 'acc2'] as const;
const CLASSIFIED = {
  surface: ['bg', 'card', 'hair', 'hair2', 'cardline'],
  text: [...TEXT_TOKENS],
  fill: ['accfill', 'mark'],
  nonColour: ['font-display', 'font-body'],
};

describe('design tokens', () => {
  it.each(TEXT_TOKENS)('--%s passes AA on --bg', (name) => {
    expect(contrastRatio(token(name), token('bg'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEXT_TOKENS)('--%s passes AA on --card', (name) => {
    expect(contrastRatio(token(name), token('card'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the three text tiers visually distinct', () => {
    const ink = contrastRatio(token('ink'), token('bg'));
    const dim = contrastRatio(token('dim'), token('bg'));
    const faint = contrastRatio(token('faint'), token('bg'));
    expect(ink, '--ink must read as a darker tier than --dim').toBeGreaterThan(dim + 2);
    expect(dim, '--dim must read as a darker tier than --faint').toBeGreaterThan(faint + 1);
  });

  it('keeps --accfill graphic-only: usable as a shape, unusable under text', () => {
    // #009739 is 3.83:1 on white and 3.44:1 on cream. Clears 1.4.11 for graphics,
    // fails 1.4.3 for text — in both directions. This test exists so that if anyone
    // "simplifies" --acc and --accfill into one token, it fails loudly.
    expect(contrastRatio(token('accfill'), token('bg'))).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(token('accfill'), token('bg'))).toBeLessThan(4.5);
    expect(contrastRatio('#ffffff', token('accfill'))).toBeLessThan(4.5);
  });

  it('keeps white legible on the two fills that do carry text', () => {
    // --acc is the fill for the CV print button; --acc2 for anything darker.
    expect(contrastRatio('#ffffff', token('acc'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', token('acc2'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps --ink legible over the highlighter, and warns off highlighting links', () => {
    const marked = composite(raw('mark'), token('bg'));
    expect(contrastRatio(token('ink'), marked)).toBeGreaterThanOrEqual(4.5);
    // --acc over the highlighter is only ~3.98:1, so a highlighted link would fail.
    expect(contrastRatio(token('acc'), marked)).toBeLessThan(4.5);
  });

  it('classifies every declared token, so a new one cannot slip in untested', () => {
    expect([...DECLS.keys()].sort()).toEqual(Object.values(CLASSIFIED).flat().sort());
  });
});
```

- [ ] **Step 7: Run it to verify it passes**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: `15 passed` — five text tokens against `--bg`, the same five against `--card`, tier separation, the `--accfill` graphic-only guard, white-on-fills, the highlighter composite, and the exhaustive classification check.

The last four exist because the first draft of this suite tested only one axis — text token against surface token — and that blind spot let a real WCAG 1.4.3 failure into Task 17, where a `text-white` button sat on `--accfill` at 3.83:1.

- [ ] **Step 8: Commit**

```bash
git add src/lib/contrast.ts src/styles/tokens.css tests/unit/contrast.test.ts tests/unit/tokens.test.ts
git commit -m "feat: add design tokens with enforced WCAG AA contrast tests"
```

---

### Task 4: Global styles and remove Jekyll

**Files:**
- Create: `src/styles/global.css`
- Delete: the entire Jekyll site

- [ ] **Step 1: Create `src/styles/global.css`**

```css
@import 'tailwindcss';
@import '@fontsource-variable/source-serif-4';
@import '@fontsource-variable/inter';
@import './tokens.css';

/* Only the two font families are mapped into @theme, because only the `font-serif`
   and `font-sans` utilities are ever used. Colour utilities (`bg-bg`, `text-ink`…)
   appear nowhere in this plan — every consumer writes `text-[var(--acc)]` — so
   mapping 11 --color-* entries would be dead weight. Note the names differ from
   the token names on purpose; see the comment in tokens.css. */
@theme {
  --font-serif: var(--font-display);
  --font-sans: var(--font-body);
}

html {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: 3px;
  border-radius: 2px;
}

.highlight {
  background: linear-gradient(transparent 60%, var(--mark) 60%);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media print {
  .no-print { display: none !important; }
  html { background: #fff; color: #000; }
  a { text-decoration: none; color: #000; }
  a[href^='http']::after { content: ' (' attr(href) ')'; font-size: 0.75em; color: #444; }
}
```

- [ ] **Step 2: Rescue the two blog posts before deleting anything**

Move them now, while they are still on disk. Task 16 edits these files in place, so no `git show` archaeology is needed later.

```bash
mkdir -p src/content/writing
git mv _posts/2020-05-23-tactical-influence-analytics.md src/content/writing/tactical-influence-of-analytics.mdx
git mv _posts/2023-11-27-fame-recap.md src/content/writing/fame-23-recap.mdx
```

Verify: `ls src/content/writing` prints both `.mdx` files.

- [ ] **Step 3: Delete the Jekyll site**

```bash
git rm -r --quiet _config.yml Gemfile _sass _layouts _includes _plugins _data _news _posts _pages _bibliography \
  blog news.html 404.html assets/css assets/js assets/json assets/audio assets/video assets/plotly \
  assets/bibliography reports Dockerfile docker-compose.yml docker-local.yml .dockerignore bin \
  CONTRIBUTING.md .all-contributorsrc .pre-commit-config.yaml
```

- [ ] **Step 4: Verify nothing Jekyll-shaped survives**

Run: `ls | grep -E '^_|Gemfile|Dockerfile' || echo "clean"`
Expected: prints `clean`.

- [ ] **Step 5: Verify the build still works**

Run: `npm run build`
Expected: `[build] Complete!`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove Jekyll site and add global styles"
```

---

### Task 5: Migrate the assets worth keeping

Everything not listed here is a template demo asset and stays deleted.

**Files:**
- Create: `public/assets/pdf/`, `public/img/`, `public/robots.txt`
- Delete: `assets/`

- [ ] **Step 1: Move the three real PDFs, preserving their public URLs**

They go to `public/assets/pdf/`, **not** `public/pdf/`, so the served URL stays `/assets/pdf/eniac23.pdf` exactly as it is today. Papers are the most-linked things on an academic site and those URLs appear in citations and other people's pages. A redirect cannot rescue them: an Astro redirect key ending in `.pdf` would emit `dist/assets/pdf/eniac23.pdf/index.html` and serve HTML in response to a PDF request. Keeping the path is the only clean answer.

```bash
mkdir -p public/assets/pdf public/img/papers public/img/writing
git mv assets/pdf/eniac23.pdf public/assets/pdf/eniac23.pdf
git mv assets/pdf/gabr.pdf public/assets/pdf/gabr.pdf
git mv assets/pdf/obso.pdf public/assets/pdf/obso.pdf
```

Note: the 2024 GraphEPV paper has **no local PDF** — its `papers.yaml` entry links out to Springer instead.

- [ ] **Step 2: Move the four real paper previews and the portrait**

```bash
git mv assets/img/publication_preview/MLSA24.png public/img/papers/graphepv.png
git mv assets/img/publication_preview/ENIAC23.png public/img/papers/eniac23.png
git mv assets/img/publication_preview/gabr.png public/img/papers/gabr.png
git mv assets/img/publication_preview/obso.png public/img/papers/obso.png
git mv assets/img/Hugo-Rios-Neto.jpg public/img/hugo-rios-neto.jpg
```

- [ ] **Step 3: Move the six blog figures**

```bash
for n in 0 1 2 3 4 5; do git mv "assets/img/blog/footure_1_$n.jpg" "public/img/writing/tactical-$n.jpg"; done
```

- [ ] **Step 4: Delete everything left in `assets/`**

```bash
git rm -r --quiet assets
```

- [ ] **Step 5: Create `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://hugoriosneto.github.io/sitemap-index.xml
```

- [ ] **Step 6: Verify the kept files are all present**

Run: `ls public/assets/pdf public/img/papers public/img/writing public/img/hugo-rios-neto.jpg`
Expected: 3 PDFs, 4 paper previews, 6 writing images, 1 portrait. No `example_pdf.pdf`, no `brownian-motion.gif`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: migrate real assets to public/, drop template demo files"
```

---

### Task 6: Content collections and schemas

**Files:**
- Create: `src/content.config.ts`, `tests/unit/content-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

`tests/unit/content-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { roleSchema, paperSchema, talkSchema, fameSchema } from '../../src/content.config';

describe('roleSchema', () => {
  const valid = {
    id: 'anderlecht', org: 'RSC Anderlecht', title: 'Data Recruitment Lead',
    dates: '01/2026 – now', verb: 'Leads', order: 5, position: 93,
    blurb: 'Recruitment analytics.', capabilities: ['Recruitment decision-making'],
  };

  it('accepts a valid role', () => {
    expect(() => roleSchema.parse(valid)).not.toThrow();
  });

  it('rejects a role with no capabilities', () => {
    expect(() => roleSchema.parse({ ...valid, capabilities: [] })).toThrow();
  });

  it('rejects a position outside 0-100', () => {
    expect(() => roleSchema.parse({ ...valid, position: 140 })).toThrow();
  });

  it('rejects a role that mentions headcount or reporting', () => {
    expect(() => roleSchema.parse({ ...valid, blurb: 'A team of one.' })).toThrow();
    expect(() => roleSchema.parse({ ...valid, blurb: 'Reports to the director of scouting.' })).toThrow();
  });
});

describe('paperSchema', () => {
  const valid = {
    id: 'graphepv', title: 'GraphEPV', year: 2024, venue: 'MLSA @ ECML/PKDD',
    authors: ['Bruno M. Sá-Freire', 'Hugo Rios-Neto'], bibtexKey: 'safreire2024graphepv',
    bibtexType: 'inproceedings',
  };

  it('accepts a valid paper', () => {
    expect(() => paperSchema.parse(valid)).not.toThrow();
  });

  it('rejects a paper whose author list omits Hugo', () => {
    expect(() => paperSchema.parse({ ...valid, authors: ['Someone Else'] })).toThrow();
  });

  it('rejects an implausible year', () => {
    expect(() => paperSchema.parse({ ...valid, year: 1850 })).toThrow();
  });
});

describe('talkSchema', () => {
  const valid = {
    id: 'opta', title: 'Opta Pro Forum', description: 'Algorithm Track.',
    provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/819432708',
    language: 'EN', format: 'Conference', order: 1,
  };

  it('accepts a valid talk', () => {
    expect(() => talkSchema.parse(valid)).not.toThrow();
  });

  it('rejects an unknown provider', () => {
    expect(() => talkSchema.parse({ ...valid, provider: 'myspace' })).toThrow();
  });

  it('rejects a non-https embed', () => {
    expect(() => talkSchema.parse({ ...valid, embedUrl: 'http://insecure.test/x' })).toThrow();
  });
});

describe('fameSchema', () => {
  const valid = {
    id: 'fame22', edition: 1, year: 2022, date: '21 October 2022',
    venue: 'CAD3, UFMG Pampulha', status: 'past',
    detail: 'The first football analytics event held in Brazil.', sponsors: [],
  };

  it('accepts a valid edition', () => {
    expect(() => fameSchema.parse(valid)).not.toThrow();
  });

  it('allows an upcoming edition with no detail', () => {
    expect(() => fameSchema.parse({ ...valid, status: 'upcoming', detail: undefined })).not.toThrow();
  });

  it('requires detail on a past edition', () => {
    expect(() => fameSchema.parse({ ...valid, status: 'past', detail: undefined })).toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/content-schema.test.ts`
Expected: FAIL — cannot resolve `src/content.config`.

- [ ] **Step 3: Implement `src/content.config.ts`**

The `blurb` refinement is what mechanically enforces the spec's "remit, never headcount, no reporting lines" rule — a future edit that reintroduces either fails the build.

```ts
import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

const BANNED_IN_BLURB = /\b(team of \w+|reports? to|reported to|reporting to|headcount|direct reports?)\b/i;

// NOTE: `id` is optional in every schema below. The `file()` loader consumes the YAML
// `id` key to build the entry ID and may not pass it through to `data`; making it
// required would break the build depending on loader version.
export const roleSchema = z.object({
  id: z.string().optional(),
  org: z.string(),
  title: z.string(),
  dates: z.string(),
  verb: z.string(),
  order: z.number().int().min(1),
  position: z.number().min(0).max(100),
  blurb: z.string().min(1).refine((s) => !BANNED_IN_BLURB.test(s), {
    message: 'Role blurbs must state remit only — no headcount and no reporting lines (spec §3).',
  }),
  capabilities: z.array(z.string()).min(1),
});

export const paperSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  year: z.number().int().min(1990).max(2100),
  venue: z.string(),
  authors: z.array(z.string()).min(1)
    .refine((a) => a.some((n) => n.includes('Rios-Neto')), {
      message: 'Author list must include Hugo Rios-Neto.',
    }),
  pdf: z.string().optional(),
  url: z.string().url().optional(),
  preview: z.string().optional(),
  bibtexKey: z.string(),
  bibtexType: z.enum(['inproceedings', 'article', 'mastersthesis']),
  booktitle: z.string().optional(),
  publisher: z.string().optional(),
});

export const talkSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  provider: z.enum(['youtube', 'vimeo', 'spotify']),
  embedUrl: z.string().url().startsWith('https://'),
  date: z.string().optional(),
  language: z.enum(['EN', 'PT']),
  format: z.enum(['Conference', 'Podcast', 'Webinar', 'Live']),
  award: z.string().optional(),
  role: z.string().optional(),
  order: z.number().int(),
});

export const fameSchema = z.object({
  id: z.string().optional(),
  edition: z.number().int().min(1),
  year: z.number().int(),
  date: z.string(),
  venue: z.string(),
  status: z.enum(['past', 'upcoming']),
  detail: z.string().optional(),
  sponsors: z.array(z.string()).default([]),
  note: z.string().optional(),
}).refine((e) => e.status === 'upcoming' || (e.detail && e.detail.length > 0), {
  message: 'A past FAME edition must have detail.',
  path: ['detail'],
});

export const collections = {
  roles: defineCollection({ loader: file('src/content/roles.yaml'), schema: roleSchema }),
  papers: defineCollection({ loader: file('src/content/papers.yaml'), schema: paperSchema }),
  talks: defineCollection({ loader: file('src/content/talks.yaml'), schema: talkSchema }),
  fame: defineCollection({ loader: file('src/content/fame.yaml'), schema: fameSchema }),
  writing: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/writing' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      description: z.string(),
      originallyPublished: z.string().optional(),
    }),
  }),
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/content-schema.test.ts`
Expected: `13 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts tests/unit/content-schema.test.ts
git commit -m "feat: add content collections with schemas enforcing the positioning rules"
```

---

### Task 7: The content data

Every fact here comes from spec §7 and §8. Nothing is invented.

**Files:**
- Create: `src/content/roles.yaml`, `papers.yaml`, `talks.yaml`, `fame.yaml`

- [ ] **Step 1: Create `src/content/roles.yaml`**

```yaml
- id: atletico
  org: Atlético Mineiro
  title: Data Scientist
  dates: 04/2021 – 07/2023
  verb: Built
  order: 1
  position: 4
  blurb: >-
    Joined as the analytics department was created — the first at any Brazilian club —
    and built the function from nothing inside a top-flight side.
  capabilities:
    - Built a department from zero
    - Inside a top-flight club
    - Working to coaching staff

- id: salab-fame
  org: SALab & FAME · UFMG
  title: Co-founder
  dates: 2022 – now
  verb: Founded
  order: 2
  position: 18
  blurb: >-
    Brazil's first sports analytics lab, and the country's first football analytics
    conference — FAME, now in its fifth edition.
  capabilities:
    - Founded a lasting institution
    - Ran a 5-edition event
    - Sponsors and partners
    - Developed people

- id: gemini
  org: Gemini Sports Analytics
  title: Intelligence Engineer
  dates: 07/2023 – 06/2025
  verb: Scaled
  order: 3
  position: 45
  blurb: >-
    Moved from one club to many — taking analytics work from research through to
    product that clubs across leagues actually used.
  capabilities:
    - Worked across many clubs
    - Research to shipped product
    - Facing club decision-makers

- id: orlando
  org: Orlando City SC
  title: Manager, Insights & Analytics
  dates: 07/2025 – 12/2025
  verb: Owned
  order: 4
  position: 80
  blurb: >-
    Owned the club's insights and analytics function — the first time the whole
    thing was mine to shape.
  capabilities:
    - Owned a club function
    - North American market

- id: anderlecht
  org: RSC Anderlecht
  title: Data Recruitment Lead
  dates: 01/2026 – now
  verb: Leads
  order: 5
  position: 93
  blurb: >-
    Recruitment analytics at one of Belgium's biggest clubs — the data behind who
    the club signs, and why.
  capabilities:
    - Recruitment decision-making
    - European first division
    - Squad-building input
```

- [ ] **Step 2: Create `src/content/papers.yaml`**

```yaml
- id: graphepv
  title: 'GraphEPV: A Framework for Estimating the Expected Possession Value in Basketball Using Graph Neural Networks'
  year: 2024
  venue: MLSA @ ECML/PKDD
  booktitle: Workshop on Machine Learning and Data Mining for Sports Analytics at ECML/PKDD 2024
  publisher: Springer
  authors:
    - Bruno M. Sá-Freire
    - Gabriel Reis
    - João L. L. Gonçalves
    - Jake Schuster
    - Hugo Rios-Neto
  preview: /img/papers/graphepv.png
  bibtexKey: safreire2024graphepv
  bibtexType: inproceedings

- id: eniac23
  title: "Characterizing Soccer Strategies based on Moves' Frequency, Importance and Effectiveness"
  year: 2023
  venue: ENIAC
  booktitle: Encontro Nacional de Inteligência Artificial e Computacional
  authors:
    - Gabriel Valadão
    - João L. L. Gonçalves
    - João L. L. Megale
    - Vinícius M. Paula
    - Hugo Rios-Neto
    - Adriano C. M. Pereira
    - Wagner Meira Jr.
  pdf: /assets/pdf/eniac23.pdf
  preview: /img/papers/eniac23.png
  bibtexKey: valadao2023characterizing
  bibtexType: inproceedings

- id: gabr
  title: Generalized Action-based Ball Recovery Model using 360º data
  year: 2022
  venue: StatsBomb Conference
  booktitle: StatsBomb Conference
  authors:
    - Ricardo Furbino M. Nascimento
    - Hugo Rios-Neto
  pdf: /assets/pdf/gabr.pdf
  preview: /img/papers/gabr.png
  bibtexKey: furbino2022generalized
  bibtexType: inproceedings

- id: obso
  title: 'A new look into Off-ball Scoring Opportunity: taking into account the continuous nature of the game'
  year: 2020
  venue: FC Barcelona Analytics in Sports Tomorrow Congress
  booktitle: FC Barcelona Analytics in Sports Tomorrow Congress
  authors:
    - Hugo Rios-Neto
    - Wagner Meira Jr.
    - Pedro O. S. Vaz-de-Melo
  pdf: /assets/pdf/obso.pdf
  preview: /img/papers/obso.png
  bibtexKey: riosneto2020new
  bibtexType: inproceedings
```

- [ ] **Step 3: Create `src/content/talks.yaml`**

```yaml
- id: opta-2023
  title: Opta Pro Forum — Algorithm Track
  description: Stats Perform, March 2023, with Maaike Van Roy, Wagner Meira Jr. and Jesse Davis.
  provider: vimeo
  embedUrl: https://player.vimeo.com/video/819432708?h=1ac4fd9fb4&title=0&byline=0&portrait=0
  date: 2023-03
  language: EN
  format: Conference
  award: Winner
  order: 1

- id: data-footure
  title: Data Footure
  description: Podcast I host with Caio Batatinha, for Footure, on the current and future state of football analytics.
  provider: youtube
  embedUrl: https://www.youtube.com/embed/videoseries?list=PL5Xa3vHksUiyGtMnSo2H05YlpG5vdp5SC
  language: PT
  format: Podcast
  role: Host
  order: 2

- id: winning-with-data
  title: Winning With Data
  description: Co-host of the February 2024 episode, with Jesse Davis as the guest.
  provider: spotify
  embedUrl: https://open.spotify.com/embed/episode/5XGkEVHPcN7hxFQZiwrZeE?si=404dbca0dadd4b65
  date: 2024-02
  language: EN
  format: Podcast
  role: Co-host
  order: 3

- id: barca-innovation-hub
  title: Barça Innovation Hub webinar
  description: FC Barcelona, June 2021 — opening a webinar series promoting the 2021 Sports Tomorrow Congress.
  provider: youtube
  embedUrl: https://www.youtube.com/embed/JC38450JDlc
  date: 2021-06
  language: EN
  format: Webinar
  order: 4

- id: footstats
  title: Footstats live
  description: Invited to a Footstats YouTube live, March 2022.
  provider: youtube
  embedUrl: https://www.youtube.com/embed/BtLmS6IDsHk
  date: 2022-03
  language: PT
  format: Live
  order: 5

- id: sports-tomorrow-2020
  title: Analytics in Sports Tomorrow Congress
  description: FC Barcelona, November 2020 — presenting the off-ball scoring opportunity work.
  provider: youtube
  embedUrl: https://www.youtube.com/embed/MyqzmCHs_iw
  date: 2020-11
  language: EN
  format: Conference
  order: 6
```

- [ ] **Step 4: Create `src/content/fame.yaml`**

```yaml
- id: fame22
  edition: 1
  year: 2022
  date: 21 October 2022
  venue: CAD3, Auditorium B101/102 — UFMG Pampulha
  status: past
  detail: >-
    The first football analytics event ever held in Brazil. Ran 09:00–14:00, with a
    nominal R$5 entry through Sympla.
  sponsors: []

- id: fame23
  edition: 2
  year: 2023
  date: 17 November 2023
  venue: CAD3, Auditorium B101/102 — UFMG Pampulha
  status: past
  detail: >-
    A full day, 09:00–18:30 — lectures, panels, presentations of submitted work, and a
    published compendium of every contribution. The symbolic R$5 fee was donated to CAMAV.
  sponsors:
    - Gemini Sports Analytics

- id: fame24
  edition: 3
  year: 2024
  date: 5 September 2024
  venue: CAD3 — UFMG Pampulha
  status: past
  detail: >-
    Ran as the Future of Football Conference — FAME '24: Business of Global Football, in
    collaboration with NYU. 08:30–18:30, with a pre-event workshop on 3 September.
  sponsors:
    - Gemini Sports Analytics
    - OneFan

- id: fame25
  edition: 4
  year: 2025
  date: 3 September 2025
  venue: CAD3 — UFMG Pampulha
  status: past
  detail: >-
    08:30–18:30, preceded by a free hands-on preparatory workshop on 2 September covering
    data science applied to sport.
  sponsors:
    - Gemini Sports Analytics
    - Gradient Sports

- id: fame26
  edition: 5
  year: 2026
  date: 28 September 2026
  venue: CAD3 — UFMG Pampulha
  status: upcoming
  note: Programme to be announced.
  sponsors: []
```

- [ ] **Step 5: Verify every entry passes its schema**

Run: `npm run build`
Expected: `[build] Complete!` with no content-collection errors. (Astro validates all collections at build time.)

- [ ] **Step 6: Prove the build-time guard rail actually bites**

Temporarily break a role blurb so the banned-phrase rule fires, confirm the build fails, then restore.

```bash
cp src/content/roles.yaml /tmp/roles.bak
sed -i.tmp 's/Recruitment analytics at one/A team of one doing recruitment analytics at one/' src/content/roles.yaml
npm run build; echo "exit=$?"
cp /tmp/roles.bak src/content/roles.yaml && rm -f src/content/roles.yaml.tmp
```
Expected: the build **fails** with a content-collection error naming `blurb` and "remit only", and prints `exit=1`. After restoring, `npm run build` succeeds again.

- [ ] **Step 7: Commit**

```bash
git add src/content/
git commit -m "content: add roles, papers, talks and FAME editions"
```

---

### Task 8: BibTeX generation, TDD

**Files:**
- Create: `src/lib/bibtex.ts`, `tests/unit/bibtex.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/bibtex.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toBibtex } from '../../src/lib/bibtex';

const paper = {
  title: 'Generalized Action-based Ball Recovery Model using 360º data',
  year: 2022,
  authors: ['Ricardo Furbino M. Nascimento', 'Hugo Rios-Neto'],
  booktitle: 'StatsBomb Conference',
  bibtexKey: 'furbino2022generalized',
  bibtexType: 'inproceedings' as const,
};

describe('toBibtex', () => {
  it('opens with the type and key', () => {
    expect(toBibtex(paper)).toMatch(/^@inproceedings\{furbino2022generalized,/);
  });

  it('joins authors with " and "', () => {
    expect(toBibtex(paper)).toContain('author   = {Ricardo Furbino M. Nascimento and Hugo Rios-Neto}');
  });

  it('includes title, year and booktitle', () => {
    const out = toBibtex(paper);
    expect(out).toContain('title    = {Generalized Action-based Ball Recovery Model using 360º data}');
    expect(out).toContain('year     = {2022}');
    expect(out).toContain('booktitle = {StatsBomb Conference}');
  });

  it('omits optional fields that are absent', () => {
    expect(toBibtex(paper)).not.toContain('publisher');
  });

  it('includes publisher when present', () => {
    expect(toBibtex({ ...paper, publisher: 'Springer' })).toContain('publisher = {Springer}');
  });

  it('closes the entry', () => {
    expect(toBibtex(paper).trimEnd().endsWith('}')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/bibtex.test.ts`
Expected: FAIL — cannot resolve `src/lib/bibtex`.

- [ ] **Step 3: Implement `src/lib/bibtex.ts`**

```ts
export interface BibtexInput {
  title: string;
  year: number;
  authors: string[];
  bibtexKey: string;
  bibtexType: 'inproceedings' | 'article' | 'mastersthesis';
  booktitle?: string;
  publisher?: string;
}

export function toBibtex(p: BibtexInput): string {
  const lines: string[] = [`@${p.bibtexType}{${p.bibtexKey},`];
  lines.push(`  title    = {${p.title}},`);
  lines.push(`  author   = {${p.authors.join(' and ')}},`);
  lines.push(`  year     = {${p.year}},`);
  if (p.booktitle) lines.push(`  booktitle = {${p.booktitle}},`);
  if (p.publisher) lines.push(`  publisher = {${p.publisher}},`);
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push('}');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/bibtex.test.ts`
Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bibtex.ts tests/unit/bibtex.test.ts
git commit -m "feat: generate BibTeX entries from paper content"
```

---

### Task 9: Base layout, nav, footer

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/TricolourRule.astro`, `src/components/SectionHead.astro`
- Test: `tests/e2e/chrome.spec.ts`

- [ ] **Step 1: Create `src/components/TricolourRule.astro`**

```astro
---
interface Props { class?: string }
const { class: cls = '' } = Astro.props;
---
<div class={`flex h-[3px] ${cls}`} aria-hidden="true">
  <i class="flex-[2] bg-[var(--accfill)]"></i>
  <i class="flex-1 bg-[#FEDD00]"></i>
  <i class="flex-[1.4] bg-[var(--acc2)]"></i>
</div>
```

- [ ] **Step 2: Create `src/components/Nav.astro`**

```astro
---
const { current } = Astro.props as { current?: string };
const links = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/research', label: 'Research', key: 'research' },
  { href: '/salab-fame', label: 'SALab & FAME', key: 'salab-fame' },
  { href: '/talks', label: 'Talks', key: 'talks' },
  { href: '/cv', label: 'CV', key: 'cv' },
];
---
<nav class="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm
            border-b border-[var(--hair)] bg-[var(--bg)]/90 backdrop-blur no-print"
     aria-label="Primary">
  <a href="/" class="mr-auto font-semibold tracking-tight text-[var(--ink)] no-underline">Hugo Rios-Neto</a>
  {links.slice(1).map((l) => (
    <a href={l.href}
       class="no-underline text-[var(--dim)] hover:text-[var(--acc)]"
       aria-current={current === l.key ? 'page' : undefined}>{l.label}</a>
  ))}
</nav>
```

- [ ] **Step 3: Create `src/components/Footer.astro`**

Per spec §7, there is **no email address**; LinkedIn is first because it is now the de facto inbox.

```astro
---
const links = [
  { href: 'https://www.linkedin.com/in/hugoriosneto', label: 'LinkedIn' },
  { href: 'https://github.com/hugoriosneto', label: 'GitHub' },
  { href: 'https://x.com/hugoriosneto', label: 'X' },
  { href: 'https://scholar.google.com/citations?user=jtR1qv4AAAAJ', label: 'Google Scholar' },
];
---
<footer class="mt-16 flex flex-wrap items-end gap-8 border-t border-[var(--hair)] px-6 py-10 no-print">
  <div>
    <div class="font-semibold text-[var(--ink)]">Hugo Rios-Neto</div>
    <div class="text-sm text-[var(--faint)]">Data Recruitment Lead, RSC Anderlecht</div>
  </div>
  <ul class="ml-auto flex flex-wrap gap-5 text-sm list-none p-0 m-0">
    {links.map((l) => (
      <li><a class="text-[var(--dim)] no-underline hover:text-[var(--acc)]"
             href={l.href} rel="me noopener" target="_blank">{l.label}</a></li>
    ))}
  </ul>
</footer>
```

- [ ] **Step 4: Create `src/components/SectionHead.astro`**

```astro
---
interface Props { kicker: string; sub?: string; moreHref?: string; moreLabel?: string }
const { kicker, sub, moreHref, moreLabel } = Astro.props;
---
<div class="mb-6 flex flex-wrap items-baseline gap-3">
  <span class="text-[0.62rem] font-bold uppercase tracking-[0.13em] text-[var(--acc)]">{kicker}</span>
  {sub && <span class="text-sm text-[var(--faint)]">{sub}</span>}
  {moreHref && (
    <a class="ml-auto text-sm text-[var(--acc)] no-underline hover:underline" href={moreHref}>
      {moreLabel ?? 'More'} →
    </a>
  )}
</div>
```

- [ ] **Step 5: Create `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import TricolourRule from '../components/TricolourRule.astro';

interface Props { title: string; description: string; current?: string }
const { title, description, current } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site).href;

const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Hugo Rios-Neto',
  jobTitle: 'Data Recruitment Lead',
  worksFor: { '@type': 'Organization', name: 'RSC Anderlecht' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'Universidade Federal de Minas Gerais' },
  url: 'https://hugoriosneto.github.io',
  sameAs: [
    'https://www.linkedin.com/in/hugoriosneto',
    'https://github.com/hugoriosneto',
    'https://x.com/hugoriosneto',
    'https://scholar.google.com/citations?user=jtR1qv4AAAAJ',
  ],
};
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={new URL('/img/og.png', Astro.site).href} />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json" set:html={JSON.stringify(person)} />
  </head>
  <body class="min-h-screen">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:m-3 focus:rounded focus:bg-[var(--card)] focus:px-3 focus:py-2">Skip to content</a>
    <Nav current={current} />
    <TricolourRule />
    <main id="main" class="mx-auto max-w-4xl px-6">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 6: Update `src/pages/index.astro` to use the layout**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Hugo Rios-Neto" description="Data Recruitment Lead at RSC Anderlecht." current="home">
  <h1 class="py-16 font-serif text-4xl">Hugo Rios-Neto</h1>
</Base>
```

- [ ] **Step 7: Write the chrome test**

`tests/e2e/chrome.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('nav exposes all five pages and marks the current one', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const label of ['Research', 'SALab & FAME', 'Talks', 'CV']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }
});

test('footer shows social links and no email address', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  const html = await page.content();
  expect(html).not.toMatch(/mailto:/);
  expect(html).not.toMatch(/@dcc\.ufmg\.br/);
});

test('page declares schema.org Person data', async ({ page }) => {
  await page.goto('/');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(ld!)['@type']).toBe('Person');
});
```

- [ ] **Step 8: Run the test**

Run: `npx playwright test tests/e2e/chrome.spec.ts --project=desktop`
Expected: `3 passed`.

- [ ] **Step 9: Establish the mobile baseline now, not at Task 19**

Every subsequent task runs `--project=desktop` only, so without this the WebKit half of the suite would first execute at Task 19 — after roughly seventeen tasks of markup had been written against Chromium alone. Run it once here, on the first real page, so any WebKit divergence surfaces against three simple assertions instead of forty-five.

Run: `npx playwright test tests/e2e/chrome.spec.ts --project=mobile`
Expected: `3 passed`. If WebKit fails here, fix it now — do not defer.

- [ ] **Step 10: Commit**

```bash
git add src/layouts src/components src/pages/index.astro tests/e2e/chrome.spec.ts
git commit -m "feat: add base layout, nav and footer"
```

---

### Task 10: Hero

**Files:**
- Create: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing hero test**

`tests/e2e/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('hero states the three firsts', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByTestId('hero');
  await expect(hero).toContainText("Brazil's first club analytics department.");
  await expect(hero).toContainText('Its first sports analytics lab.');
  await expect(hero).toContainText('Its first football analytics conference.');
});

test('hero highlights exactly three words', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero').locator('.highlight')).toHaveCount(3);
});

test('identity legend links to SALab, FAME and MLSA', async ({ page }) => {
  await page.goto('/');
  const legend = page.getByTestId('legend');
  await expect(legend.getByRole('link', { name: 'SALab' })).toHaveAttribute('href', 'https://salabufmg.github.io/');
  await expect(legend.getByRole('link', { name: 'FAME' })).toHaveAttribute('href', 'https://salabufmg.github.io/FAME26/');
  await expect(legend.getByRole('link', { name: /MLSA/ })).toHaveAttribute('href', /dtai\.cs\.kuleuven\.be/);
});

test('page states no ambition or forward-looking claim', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Seleção|what's next|technical director|football director|aspire/i);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/home.spec.ts --project=desktop`
Expected: FAIL — no element with `data-testid="hero"`.

- [ ] **Step 3: Create `src/components/Hero.astro`**

```astro
---
const legendLinks = {
  salab: 'https://salabufmg.github.io/',
  fame: 'https://salabufmg.github.io/FAME26/',
  mlsa: 'https://dtai.cs.kuleuven.be/events/MLSA26/index.php',
};
const a = 'text-[var(--acc)] no-underline border-b border-[var(--acc)]/45 hover:border-[var(--acc)]';
---
<section data-testid="hero" class="py-16">
  <h1 class="mb-6 max-w-[23ch] font-serif text-[clamp(1.9rem,5vw,2.35rem)] font-normal leading-[1.24] tracking-[-0.022em]">
    <span class="block">Brazil's <span class="highlight">first</span> club analytics department.</span>
    <span class="block">Its <span class="highlight">first</span> sports analytics lab.</span>
    <span class="block">Its <span class="highlight">first</span> football analytics conference.</span>
  </h1>

  <p class="mb-8 max-w-[56ch] text-[1.02rem] leading-[1.66] text-[var(--dim)]">
    I've spent my career building the parts of a football operation that didn't exist yet —
    <b class="font-semibold text-[var(--ink)]">a department, a research lab, a conference now in its fifth edition</b>
    — and then running them. These days I lead data recruitment at RSC Anderlecht.
  </p>

  <div class="max-w-[56ch] border-t-2 border-[var(--ink)] pt-4">
    <div class="mb-1 text-lg font-semibold tracking-tight">Hugo Rios-Neto</div>
    <p data-testid="legend" class="text-sm leading-[1.7] text-[var(--dim)]">
      Data Recruitment Lead, RSC Anderlecht
      <span class="mx-2 text-[var(--hair2)]">·</span>
      Co-founder, <a class={a} href={legendLinks.salab} target="_blank" rel="noopener">SALab</a>
      &amp; <a class={a} href={legendLinks.fame} target="_blank" rel="noopener">FAME</a>
      <span class="mx-2 text-[var(--hair2)]">·</span>
      Co-organizer, <a class={a} href={legendLinks.mlsa} target="_blank" rel="noopener">MLSA @ ECML/PKDD</a>
    </p>
  </div>
</section>
```

- [ ] **Step 4: Use it in `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
---
<Base title="Hugo Rios-Neto" description="Data Recruitment Lead at RSC Anderlecht. Built Brazil's first club analytics department, its first sports analytics lab and its first football analytics conference." current="home">
  <Hero />
</Base>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/home.spec.ts --project=desktop`
Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hero.astro src/pages/index.astro tests/e2e/home.spec.ts
git commit -m "feat: add hero with the three firsts and identity legend"
```

---

### Task 11: The trajectory — the signature interaction

Accumulating, not ascending. Keyboard-operable with arrow keys, per spec §6.

**Files:**
- Create: `src/components/Trajectory.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/trajectory.spec.ts`

- [ ] **Step 1: Write the failing trajectory test**

`tests/e2e/trajectory.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('starts on the most recent role', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('trajectory-detail')).toContainText('RSC Anderlecht');
});

test('capabilities accumulate rather than replace', async ({ page }) => {
  await page.goto('/');
  const chips = page.getByTestId('trajectory-chips').locator('li');

  await page.getByRole('button', { name: /Atlético Mineiro/ }).click();
  const first = await chips.count();
  await expect(chips).toContainText(['Built a department from zero']);

  await page.getByRole('button', { name: /RSC Anderlecht/ }).click();
  const last = await chips.count();

  expect(last).toBeGreaterThan(first);
  // The earliest capability is still on screen at the final stop.
  await expect(page.getByTestId('trajectory-chips')).toContainText('Built a department from zero');
  await expect(page.getByTestId('trajectory-chips')).toContainText('Recruitment decision-making');
});

test('selecting a stop updates the detail panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Orlando City SC/ }).click();
  const detail = page.getByTestId('trajectory-detail');
  await expect(detail).toContainText('Orlando City SC');
  await expect(detail).toContainText('Owned');
});

test('never shows headcount or reporting lines', async ({ page }) => {
  await page.goto('/');
  for (const org of ['Atlético Mineiro', 'Gemini Sports Analytics', 'Orlando City SC', 'RSC Anderlecht']) {
    await page.getByRole('button', { name: new RegExp(org) }).click();
    const text = await page.getByTestId('trajectory-detail').innerText();
    expect(text).not.toMatch(/team of|reports? to|reported to/i);
  }
});

test('is keyboard operable with arrow keys', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Atlético Mineiro/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('trajectory-detail')).toContainText('SALab');
});

test('marks the selected stop for assistive tech', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Gemini/ }).click();
  await expect(page.getByRole('button', { name: /Gemini/ })).toHaveAttribute('aria-current', 'true');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/trajectory.spec.ts --project=desktop`
Expected: FAIL — no `trajectory-detail` element.

- [ ] **Step 3: Create `src/components/Trajectory.astro`**

```astro
---
import { getCollection } from 'astro:content';
import SectionHead from './SectionHead.astro';

const roles = (await getCollection('roles')).sort((a, b) => a.data.order - b.data.order);
const data = roles.map((r) => r.data);
const last = data.length - 1;
---
<section class="border-t border-[var(--hair)] py-12">
  <SectionHead kicker="Trajectory" sub="click through — what each role added stays on screen" />

  <div class="relative mb-1 h-10" data-testid="trajectory-rail">
    <div class="absolute left-2 right-2 top-[19px] h-0.5 bg-[var(--hair2)]"></div>
    <div id="traj-progress" class="absolute left-2 top-[19px] h-0.5 transition-[width] duration-500"
         style="background:linear-gradient(90deg,var(--accfill),#FEDD00)"></div>
    {data.map((r, i) => (
      <button type="button"
              class="traj-stop absolute top-2.5 -ml-2.5 h-5 w-5 rounded-full border-2 border-[var(--hair2)] bg-[var(--card)] transition-transform duration-200 hover:border-[var(--acc)]"
              style={`left:${r.position}%`}
              data-index={i}
              aria-label={`${r.org}, ${r.dates}`}
              aria-current={i === last ? 'true' : 'false'}></button>
    ))}
  </div>

  <div class="mb-7 flex justify-between text-xs text-[var(--faint)]">
    <span>2021</span><span>2023</span><span>2025</span><span>now</span>
  </div>

  <div class="grid gap-8 md:grid-cols-[1.15fr_1fr]">
    <div data-testid="trajectory-detail"></div>
    <div>
      <div class="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[var(--faint)]">What it added</div>
      <ul data-testid="trajectory-chips" class="m-0 flex list-none flex-wrap gap-1.5 p-0"></ul>
    </div>
  </div>
</section>

<script is:inline define:vars={{ data }}>
  (() => {
    const stops = Array.from(document.querySelectorAll('.traj-stop'));
    const detail = document.querySelector('[data-testid="trajectory-detail"]');
    const chips = document.querySelector('[data-testid="trajectory-chips"]');
    const progress = document.getElementById('traj-progress');
    if (!stops.length || !detail || !chips || !progress) return;

    function select(i) {
      stops.forEach((el, j) => {
        el.setAttribute('aria-current', j === i ? 'true' : 'false');
        el.classList.toggle('scale-125', j === i);
        el.style.background = j === i ? 'var(--accfill)' : 'var(--card)';
        el.style.borderColor = j <= i ? 'var(--acc)' : 'var(--hair2)';
      });
      progress.style.width = `calc(${data[i].position}% - 8px)`;

      const r = data[i];
      detail.innerHTML =
        `<div class="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-[var(--acc2)]">${r.verb}</div>` +
        `<div class="text-2xl font-semibold tracking-tight">${r.org}</div>` +
        `<div class="mb-2 text-sm font-semibold text-[var(--acc)]">${r.title} · ${r.dates}</div>` +
        `<p class="max-w-[46ch] leading-relaxed text-[var(--dim)]">${r.blurb}</p>`;

      chips.innerHTML = data.slice(0, i + 1).flatMap((role, k) =>
        role.capabilities.map((c) => {
          const fresh = k === i
            ? 'border-[var(--acc)] text-[var(--acc)] font-semibold'
            : 'border-[var(--cardline)] text-[var(--dim)]';
          return `<li class="rounded-full border bg-[var(--card)] px-2.5 py-1 text-xs ${fresh}">${c}</li>`;
        })
      ).join('');
    }

    stops.forEach((el, i) => {
      el.addEventListener('click', () => select(i));
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = e.key === 'ArrowRight'
          ? Math.min(i + 1, stops.length - 1)
          : Math.max(i - 1, 0);
        stops[next].focus();
        select(next);
      });
    });

    select(stops.length - 1);
  })();
</script>
```

- [ ] **Step 4: Add it to `src/pages/index.astro`**

Replace the file with:
```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import Trajectory from '../components/Trajectory.astro';
---
<Base title="Hugo Rios-Neto" description="Data Recruitment Lead at RSC Anderlecht. Built Brazil's first club analytics department, its first sports analytics lab and its first football analytics conference." current="home">
  <Hero />
  <Trajectory />
</Base>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/trajectory.spec.ts --project=desktop`
Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Trajectory.astro src/pages/index.astro tests/e2e/trajectory.spec.ts
git commit -m "feat: add accumulating career trajectory"
```

---

### Task 12: Finish the homepage

**Files:**
- Modify: `src/pages/index.astro`
- Test: append to `tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/e2e/home.spec.ts`:
```ts
test('shows the two things built from nothing', async ({ page }) => {
  await page.goto('/');
  const built = page.getByTestId('built');
  await expect(built).toContainText('Sports Analytics Lab');
  await expect(built).toContainText('FAME');
  await expect(built).toContainText('5');
});

test('Why Brazil uses the approved W2 copy', async ({ page }) => {
  await page.goto('/');
  const why = page.getByTestId('why-brazil');
  await expect(why).toContainText('No country has won more World Cups than Brazil');
  await expect(why).toContainText('Closing that gap is what my career has been');
});

test('teasers link to the full pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /All research/ })).toHaveAttribute('href', '/research');
  await expect(page.getByRole('link', { name: /All talks/ })).toHaveAttribute('href', '/talks');
  await expect(page.getByRole('link', { name: /SALab & FAME/ }).last()).toHaveAttribute('href', '/salab-fame');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/home.spec.ts --project=desktop`
Expected: 3 new tests FAIL, the original 4 pass.

- [ ] **Step 3: Extend `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import Trajectory from '../components/Trajectory.astro';
import SectionHead from '../components/SectionHead.astro';
import { getCollection } from 'astro:content';

const papers = (await getCollection('papers')).sort((a, b) => b.data.year - a.data.year).slice(0, 3);
const talks = (await getCollection('talks')).sort((a, b) => a.data.order - b.data.order).slice(0, 3);
const fame = await getCollection('fame');
---
<Base title="Hugo Rios-Neto" description="Data Recruitment Lead at RSC Anderlecht. Built Brazil's first club analytics department, its first sports analytics lab and its first football analytics conference." current="home">
  <Hero />
  <Trajectory />

  <section class="border-t border-[var(--hair)] py-12">
    <SectionHead kicker="Built from nothing" sub="and still running" moreHref="/salab-fame" moreLabel="SALab & FAME" />
    <div data-testid="built" class="grid gap-4 sm:grid-cols-2">
      <article class="rounded-xl border border-[var(--cardline)] bg-[var(--card)] p-6">
        <h3 class="text-lg font-semibold tracking-tight">Sports Analytics Lab (SALab)</h3>
        <p class="mb-3 text-xs text-[var(--faint)]">UFMG · co-founded 2022</p>
        <p class="text-sm leading-relaxed text-[var(--dim)]">
          Brazil's first sports analytics lab. Research, teaching, and a route into the industry
          for students who previously had none.
        </p>
      </article>
      <article class="rounded-xl border border-[var(--cardline)] bg-[var(--card)] p-6">
        <h3 class="text-lg font-semibold tracking-tight">FAME</h3>
        <p class="mb-3 text-xs text-[var(--faint)]">Football Analytics: Modeling &amp; Experience · 2022–2026</p>
        <p class="text-sm leading-relaxed text-[var(--dim)]">
          The first football analytics conference in Brazil, across {fame.length} editions —
          the 2024 edition ran alongside NYU's Institute for Global Sport.
        </p>
      </article>
    </div>
  </section>

  <section class="border-t border-[var(--hair)] py-12">
    <SectionHead kicker="Research" sub="peer-reviewed and conference work" moreHref="/research" moreLabel="All research" />
    <ul class="m-0 list-none border-t border-[var(--hair)] p-0">
      {papers.map((p) => (
        <li class="flex items-baseline gap-4 border-b border-[var(--hair)] py-3">
          <span class="w-10 shrink-0 text-sm tabular-nums text-[var(--faint)]">{p.data.year}</span>
          <span>
            <span class="text-[0.9rem] font-medium leading-snug">{p.data.title}</span>
            <span class="block text-xs text-[var(--faint)]">{p.data.venue}</span>
          </span>
        </li>
      ))}
    </ul>
  </section>

  <section class="border-t border-[var(--hair)] py-12">
    <SectionHead kicker="Talks & media" sub="in English and Portuguese" moreHref="/talks" moreLabel="All talks" />
    <ul class="m-0 list-none border-t border-[var(--hair)] p-0">
      {talks.map((t) => (
        <li class="flex items-baseline gap-4 border-b border-[var(--hair)] py-3">
          <span>
            <span class="text-[0.9rem] font-medium leading-snug">{t.data.title}</span>
            <span class="block text-xs text-[var(--faint)]">{t.data.description}</span>
          </span>
          {t.data.award && (
            <span class="ml-auto shrink-0 rounded-full border border-[#d9bb45] bg-[#FEDD00]/30 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[#7a5f00]">
              {t.data.award}
            </span>
          )}
        </li>
      ))}
    </ul>
  </section>

  <section class="border-t border-[var(--hair)] py-12">
    <div class="mb-5 h-[3px] w-12" style="background:linear-gradient(90deg,var(--accfill) 55%,#FEDD00 55%)"></div>
    <p data-testid="why-brazil" class="max-w-[60ch] font-serif text-[1.28rem] leading-[1.62]">
      No country has won more World Cups than Brazil, or produced more great footballers.
      None of it was matched by any analytics infrastructure — no club department, no research
      lab, no conference. <em class="italic text-[var(--acc)]">Closing that gap is what my career has been</em>,
      and everything on this page came out of it.
    </p>
  </section>
</Base>
```

- [ ] **Step 4: Run the tests**

Run: `npx playwright test tests/e2e/home.spec.ts --project=desktop`
Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/e2e/home.spec.ts
git commit -m "feat: complete the homepage with teasers and Why Brazil"
```

---

### Task 13: Research page

**Files:**
- Create: `src/components/PaperRow.astro`, `src/pages/research.astro`
- Test: `tests/e2e/research.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/e2e/research.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('lists all four papers newest first', async ({ page }) => {
  await page.goto('/research');
  const years = await page.getByTestId('paper-year').allInnerTexts();
  expect(years).toEqual(['2024', '2023', '2022', '2020']);
});

test('a paper row expands to show authors and links', async ({ page }) => {
  await page.goto('/research');
  const row = page.getByTestId('paper-gabr');
  await expect(row.getByText('Ricardo Furbino')).toBeHidden();
  await row.locator('summary').click();
  await expect(row.getByText('Ricardo Furbino')).toBeVisible();
  await expect(row.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', '/assets/pdf/gabr.pdf');
});

test('the 2024 paper has no local PDF link', async ({ page }) => {
  await page.goto('/research');
  const row = page.getByTestId('paper-graphepv');
  await row.locator('summary').click();
  await expect(row.getByRole('link', { name: 'PDF' })).toHaveCount(0);
});

test('shows the thesis with supervisor and co-supervisors', async ({ page }) => {
  await page.goto('/research');
  const thesis = page.getByTestId('thesis');
  await expect(thesis).toContainText('Towards Learning Representations from Spatiotemporal Grids in Soccer');
  await expect(thesis).toContainText('Wagner Meira Jr.');
  await expect(thesis).toContainText('Jesse Davis');
  await expect(thesis).toContainText('Adriano C. M. Pereira');
});

test('shows MLSA service with both editions', async ({ page }) => {
  await page.goto('/research');
  const service = page.getByTestId('service');
  await expect(service).toContainText('13th edition');
  await expect(service).toContainText('12th edition');
  await expect(service).toContainText('Naples');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/research.spec.ts --project=desktop`
Expected: FAIL — `/research` 404s.

- [ ] **Step 3: Create `src/components/PaperRow.astro`**

Native `<details>` gives keyboard operability and correct semantics with zero JavaScript.

```astro
---
import { toBibtex } from '../lib/bibtex';
const { paper, id } = Astro.props;
const bib = toBibtex(paper);
const pill = 'rounded-full border border-[var(--cardline)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--dim)] no-underline hover:border-[var(--acc)] hover:text-[var(--acc)]';
---
<div data-testid={`paper-${id}`} class="border-b border-[var(--hair)]">
  <details class="group">
    <summary class="flex cursor-pointer list-none items-baseline gap-4 py-3.5">
      <span data-testid="paper-year" class="w-10 shrink-0 text-sm tabular-nums text-[var(--faint)]">{paper.year}</span>
      <span>
        <span class="text-[0.9rem] font-medium leading-snug group-hover:text-[var(--acc)]">{paper.title}</span>
        <span class="block text-xs text-[var(--faint)]">{paper.venue}</span>
      </span>
      <span class="ml-auto shrink-0 text-[var(--faint)] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
    </summary>
    <div class="pb-5 pl-14">
      <p class="mb-2 text-sm leading-relaxed text-[var(--dim)]">
        {paper.authors.map((n: string, i: number) => (
          <>{i > 0 && ', '}{n.includes('Rios-Neto') ? <b class="font-semibold text-[var(--ink)]">{n}</b> : n}</>
        ))}
      </p>
      <div class="flex flex-wrap gap-1.5">
        {paper.pdf && <a class={pill} href={paper.pdf}>PDF</a>}
        {paper.url && <a class={pill} href={paper.url} target="_blank" rel="noopener">Publisher</a>}
        <button type="button" class={pill} data-bibtex={bib}>Copy BibTeX</button>
      </div>
    </div>
  </details>
</div>
```

**No `<script>` in this component.** It renders once per paper, and an `is:inline` script inside a repeated component is emitted once per instance — four copies each running `querySelectorAll` over all four buttons would attach sixteen listeners. The handler lives once on the page instead.

- [ ] **Step 4: Create `src/pages/research.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import SectionHead from '../components/SectionHead.astro';
import PaperRow from '../components/PaperRow.astro';
import { getCollection } from 'astro:content';

const papers = (await getCollection('papers')).sort((a, b) => b.data.year - a.data.year);
const writing = (await getCollection('writing')).sort((a, b) => +b.data.date - +a.data.date);
const tactical = writing.find((w) => w.id.includes('tactical'));
---
<Base title="Research — Hugo Rios-Neto" description="Peer-reviewed and conference work in football and basketball analytics, plus the MLSA workshop." current="research">
  <h1 class="pt-12 font-serif text-3xl font-normal tracking-tight">Research</h1>
  <p class="mb-8 mt-1 max-w-[56ch] text-sm leading-relaxed text-[var(--dim)]">
    Peer-reviewed and conference work in football and basketball analytics, plus the workshop I help organize.
  </p>

  <div class="border-t border-[var(--hair)]">
    {papers.map((p) => <PaperRow paper={p.data} id={p.id} />)}
  </div>

  <section class="pt-10">
    <SectionHead kicker="Thesis" />
    <div data-testid="thesis" class="rounded-xl border border-[var(--cardline)] bg-[var(--card)] p-6">
      <p class="font-serif text-lg leading-snug">Towards Learning Representations from Spatiotemporal Grids in Soccer</p>
      <p class="mt-1 text-sm text-[var(--acc)]">MSc, Computer Science — UFMG · defended February 2026</p>
      <p class="mt-2 text-sm text-[var(--dim)]">
        Supervisor: Wagner Meira Jr. Co-supervisors: Jesse Davis and Adriano C. M. Pereira.
      </p>
    </div>
  </section>

  <section class="pt-10">
    <SectionHead kicker="Service" />
    <div data-testid="service" class="rounded-xl border border-[var(--cardline)] bg-[var(--card)] p-6">
      <p class="font-medium">Co-organizer — Machine Learning &amp; Data Mining for Sports Analytics</p>
      <p class="mt-1 text-sm text-[var(--acc)]">13th edition · ECML/PKDD · Naples · 7 September 2026</p>
      <p class="mt-2 text-sm text-[var(--dim)]">
        With Pieter Robberechts, Maaike Van Roy and Albrecht Zimmermann. Second year as an
        organizer, following the 12th edition in 2025.
      </p>
    </div>
  </section>

  {tactical && (
    <section class="pt-10 pb-4">
      <SectionHead kicker="Writing" />
      <a class="block rounded-xl border border-[var(--cardline)] bg-[var(--card)] p-6 no-underline"
         href={`/writing/${tactical.id}`}>
        <span class="font-medium text-[var(--ink)]">{tactical.data.title}</span>
        <span class="mt-1 block text-sm text-[var(--dim)]">{tactical.data.description}</span>
      </a>
    </section>
  )}
</Base>

<script is:inline>
  document.querySelectorAll('button[data-bibtex]').forEach((b) => {
    b.addEventListener('click', async () => {
      await navigator.clipboard.writeText(b.getAttribute('data-bibtex') || '');
      const original = b.textContent;
      b.textContent = 'Copied';
      setTimeout(() => { b.textContent = original; }, 1500);
    });
  });
</script>
```

- [ ] **Step 5: Run the test**

Run: `npx playwright test tests/e2e/research.spec.ts --project=desktop`
Expected: `5 passed`. (The writing section renders only after Task 16; the tests above do not depend on it.)

- [ ] **Step 6: Commit**

```bash
git add src/components/PaperRow.astro src/pages/research.astro tests/e2e/research.spec.ts
git commit -m "feat: add research page with expandable paper rows"
```

---

### Task 14: SALab & FAME page

**Files:**
- Create: `src/components/FameSwitcher.astro`, `src/pages/salab-fame.astro`
- Test: `tests/e2e/salab-fame.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/e2e/salab-fame.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('offers all five editions as tabs', async ({ page }) => {
  await page.goto('/salab-fame');
  await expect(page.getByRole('tab')).toHaveCount(5);
});

test('opens on the most recent edition', async ({ page }) => {
  await page.goto('/salab-fame');
  await expect(page.getByTestId('fame-panel')).toContainText('28 September 2026');
});

test('switching edition swaps the panel', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2022/ }).click();
  const panel = page.getByTestId('fame-panel');
  await expect(panel).toContainText('21 October 2022');
  await expect(panel).toContainText('first football analytics event');
});

test('shows sponsors where there are any and omits the row where there are none', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2024/ }).click();
  await expect(page.getByTestId('fame-panel')).toContainText('OneFan');
  await page.getByRole('tab', { name: /2022/ }).click();
  await expect(page.getByTestId('fame-sponsors')).toHaveCount(0);
});

test('renders the upcoming edition without a programme', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2026/ }).click();
  const panel = page.getByTestId('fame-panel');
  await expect(panel).toContainText('Programme to be announced');
  await expect(panel).toContainText('Upcoming');
});

test('tabs are keyboard navigable', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2022/ }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('fame-panel')).toContainText('17 November 2023');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/salab-fame.spec.ts --project=desktop`
Expected: FAIL — `/salab-fame` 404s.

- [ ] **Step 3: Create `src/components/FameSwitcher.astro`**

```astro
---
import { getCollection } from 'astro:content';
const editions = (await getCollection('fame')).sort((a, b) => a.data.edition - b.data.edition);
const data = editions.map((e) => e.data);
const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
---
<div>
  <div role="tablist" aria-label="FAME editions" class="mb-5 flex flex-wrap gap-1.5">
    {data.map((e, i) => (
      <button type="button" role="tab" id={`fame-tab-${i}`}
              aria-controls="fame-panel"
              aria-selected={i === data.length - 1 ? 'true' : 'false'}
              tabindex={i === data.length - 1 ? 0 : -1}
              data-index={i}
              class="fame-tab rounded-full border border-[var(--cardline)] bg-[var(--card)] px-3 py-1.5 text-sm tabular-nums text-[var(--dim)] hover:border-[var(--acc)]">
        {e.year}
      </button>
    ))}
  </div>
  <div id="fame-panel" role="tabpanel" data-testid="fame-panel" class="min-h-[8rem]"></div>
</div>

<script is:inline define:vars={{ data, ordinals }}>
  (() => {
    const tabs = Array.from(document.querySelectorAll('.fame-tab'));
    const panel = document.getElementById('fame-panel');
    if (!tabs.length || !panel) return;

    function select(i) {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        t.style.background = on ? 'var(--accfill)' : 'var(--card)';
        t.style.borderColor = on ? 'var(--accfill)' : 'var(--cardline)';
        t.style.color = on ? '#fff' : 'var(--dim)';
      });
      panel.setAttribute('aria-labelledby', `fame-tab-${i}`);

      const e = data[i];
      const badge = e.status === 'upcoming'
        ? '<span class="ml-2 rounded-full border border-[var(--acc2)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--acc2)]">Upcoming</span>'
        : '';
      const sponsors = e.sponsors && e.sponsors.length
        ? `<p data-testid="fame-sponsors" class="mt-3 text-xs text-[var(--faint)]">Sponsored by ${e.sponsors.join(' and ')}</p>`
        : '';
      const body = e.detail
        ? `<p class="max-w-[58ch] leading-relaxed text-[var(--dim)]">${e.detail}</p>`
        : `<p class="max-w-[58ch] leading-relaxed text-[var(--faint)]">${e.note || ''}</p>`;

      panel.innerHTML =
        `<div class="text-lg font-semibold tracking-tight">FAME '${String(e.year).slice(2)} — ${ordinals[e.edition - 1]} edition${badge}</div>` +
        `<div class="mb-2.5 text-xs text-[var(--faint)]">${e.date} · ${e.venue}</div>` +
        body + sponsors;
    }

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        ev.preventDefault();
        const n = ev.key === 'ArrowRight' ? Math.min(i + 1, tabs.length - 1) : Math.max(i - 1, 0);
        tabs[n].focus();
        select(n);
      });
    });

    select(tabs.length - 1);
  })();
</script>
```

- [ ] **Step 4: Create `src/pages/salab-fame.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import SectionHead from '../components/SectionHead.astro';
import FameSwitcher from '../components/FameSwitcher.astro';
import { getCollection } from 'astro:content';

const writing = await getCollection('writing');
const recap = writing.find((w) => w.id.includes('fame'));
---
<Base title="SALab & FAME — Hugo Rios-Neto" description="Brazil's first sports analytics lab and its first football analytics conference, both built at UFMG." current="salab-fame">
  <h1 class="pt-12 font-serif text-3xl font-normal tracking-tight">SALab &amp; FAME</h1>
  <p class="mb-10 mt-1 max-w-[56ch] text-sm leading-relaxed text-[var(--dim)]">
    A research lab and a conference, both built from nothing at UFMG, both still running.
  </p>

  <section class="border-t border-[var(--hair)] py-10">
    <SectionHead kicker="Sports Analytics Lab" sub="founded 2022" />
    <p class="max-w-[58ch] leading-relaxed text-[var(--dim)]">
      Brazil's first sports analytics lab, co-founded in 2022 and supervised by Wagner Meira Jr.
      and Adriano César Pereira of UFMG's Computer Science Department. Research, teaching, and a
      route into the industry for students who previously had none.
    </p>
  </section>

  <section class="border-t border-[var(--hair)] py-10">
    <SectionHead kicker="FAME" sub="Football Analytics: Modeling & Experience" />
    <FameSwitcher />
  </section>

  {recap && (
    <section class="border-t border-[var(--hair)] py-10">
      <SectionHead kicker="Writing" />
      <a class="block rounded-xl border border-[var(--cardline)] bg-[var(--card)] p-6 no-underline"
         href={`/writing/${recap.id}`}>
        <span class="font-medium text-[var(--ink)]">{recap.data.title}</span>
        <span class="mt-1 block text-sm text-[var(--dim)]">{recap.data.description}</span>
      </a>
    </section>
  )}
</Base>
```

- [ ] **Step 5: Run the test**

Run: `npx playwright test tests/e2e/salab-fame.spec.ts --project=desktop`
Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/FameSwitcher.astro src/pages/salab-fame.astro tests/e2e/salab-fame.spec.ts
git commit -m "feat: add SALab & FAME page with five-edition switcher"
```

---

### Task 15: Talks page with click-to-load embeds

**Files:**
- Create: `src/components/TalkCard.astro`, `src/pages/talks.astro`
- Test: `tests/e2e/talks.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/e2e/talks.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('lists all six talks', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card')).toHaveCount(6);
});

test('loads no iframes until a card is clicked', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('clicking a card loads exactly that one embed', async ({ page }) => {
  await page.goto('/talks');
  await page.getByRole('button', { name: /Load .*Opta Pro Forum/ }).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('iframe')).toHaveAttribute('src', /player\.vimeo\.com/);
});

test('makes no third-party requests before a click', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).host;
    if (!host.includes('localhost')) external.push(host);
  });
  await page.goto('/talks');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('tags language and format', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Data Footure' })).toContainText('PT');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Opta Pro Forum' })).toContainText('Winner');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/talks.spec.ts --project=desktop`
Expected: FAIL — `/talks` 404s.

- [ ] **Step 3: Create `src/components/TalkCard.astro`**

```astro
---
const { talk } = Astro.props;
const tag = 'rounded-full border border-[var(--acc2)]/40 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--acc2)]';
---
<article data-testid="talk-card" class="overflow-hidden rounded-xl border border-[var(--cardline)] bg-[var(--card)]">
  <div class="talk-frame aspect-video bg-[#ece0b8]" data-embed={talk.embedUrl}>
    <button type="button"
            class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 border-0 bg-transparent"
            aria-label={`Load ${talk.provider} embed for ${talk.title}`}>
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accfill)] text-white" aria-hidden="true">▶</span>
      <span class="text-xs text-[#7d7358]">click to load {talk.provider}</span>
    </button>
  </div>
  <div class="p-4">
    <h3 class="text-[0.9rem] font-semibold leading-snug">{talk.title}</h3>
    <p class="mt-1 text-xs leading-relaxed text-[var(--faint)]">{talk.description}</p>
    <div class="mt-2.5 flex flex-wrap gap-1.5">
      {talk.award && <span class="rounded-full border border-[#d9bb45] bg-[#FEDD00]/30 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[#7a5f00]">{talk.award}</span>}
      <span class={tag}>{talk.language}</span>
      <span class={tag}>{talk.format}</span>
      {talk.role && <span class={tag}>{talk.role}</span>}
    </div>
  </div>
</article>
```

**No `<script>` here** — same reason as `PaperRow`. Six cards would emit six copies of the handler and bind thirty-six listeners. It goes on the page once.

- [ ] **Step 4: Create `src/pages/talks.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import TalkCard from '../components/TalkCard.astro';
import { getCollection } from 'astro:content';

const talks = (await getCollection('talks')).sort((a, b) => a.data.order - b.data.order);
---
<Base title="Talks & media — Hugo Rios-Neto" description="Conference talks, podcasts and webinars in English and Portuguese." current="talks">
  <h1 class="pt-12 font-serif text-3xl font-normal tracking-tight">Talks &amp; media</h1>
  <p class="mb-8 mt-1 max-w-[56ch] text-sm leading-relaxed text-[var(--dim)]">
    Conference talks, podcasts and webinars — in English and Portuguese. Nothing loads from
    YouTube, Vimeo or Spotify until you ask for it.
  </p>
  <div class="grid gap-4 pb-6 sm:grid-cols-2">
    {talks.map((t) => <TalkCard talk={t.data} />)}
  </div>
</Base>

<script is:inline>
  document.querySelectorAll('.talk-frame').forEach((frame) => {
    const button = frame.querySelector('button');
    if (!button) return;
    button.addEventListener('click', () => {
      const src = frame.getAttribute('data-embed');
      if (!src) return;
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.loading = 'lazy';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.style.border = '0';
      frame.replaceChildren(iframe);
    });
  });
</script>
```

- [ ] **Step 5: Run the test**

Run: `npx playwright test tests/e2e/talks.spec.ts --project=desktop`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/TalkCard.astro src/pages/talks.astro tests/e2e/talks.spec.ts
git commit -m "feat: add talks page with click-to-load embeds"
```

---

### Task 16: Migrate the two posts

The 2020 post uses six `{% include figure.html %}` tags, three `{% include video.html %}` tags and one `{% twitter %}` embed. The tweet becomes a plain link — an embedded tweet would load third-party script on page view, which breaks the "no external requests at runtime" rule from spec §9. The 2023 recap is plain markdown with no Liquid at all.

**Files:**
- Create: `src/components/Figure.astro`, `src/components/VideoEmbed.astro`, `src/content/writing/tactical-influence-of-analytics.mdx`, `src/content/writing/fame-23-recap.mdx`, `src/pages/writing/[...slug].astro`
- Test: `tests/e2e/writing.spec.ts`

- [ ] **Step 1: Create `src/components/Figure.astro`**

```astro
---
interface Props { src: string; alt: string; caption?: string }
const { src, alt, caption } = Astro.props;
---
<figure class="my-8">
  <img src={src} alt={alt} loading="lazy" decoding="async"
       class="w-full rounded-xl border border-[var(--cardline)]" />
  {caption && <figcaption class="mt-2 text-xs text-[var(--faint)]">{caption}</figcaption>}
</figure>
```

- [ ] **Step 2: Create `src/components/VideoEmbed.astro`**

Same click-to-load rule as the Talks page.

```astro
---
interface Props { src: string; title: string }
const { src, title } = Astro.props;
---
<div class="video-embed my-8 aspect-video overflow-hidden rounded-xl border border-[var(--cardline)] bg-[#ece0b8]" data-embed={src}>
  <button type="button" class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 border-0 bg-transparent"
          aria-label={`Load video: ${title}`}>
    <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accfill)] text-white" aria-hidden="true">▶</span>
    <span class="text-xs text-[#7d7358]">{title}</span>
  </button>
</div>
```

**No `<script>` here either** — the 2020 post uses this component three times. The handler goes on the post layout, in the next step.

- [ ] **Step 3: Create `src/pages/writing/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import Base from '../../layouts/Base.astro';

export async function getStaticPaths() {
  const posts = await getCollection('writing');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const date = post.data.date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
---
<Base title={`${post.data.title} — Hugo Rios-Neto`} description={post.data.description}>
  <article class="py-12">
    <h1 class="font-serif text-3xl font-normal leading-tight tracking-tight">{post.data.title}</h1>
    <p class="mt-2 text-sm text-[var(--faint)]">
      {date}{post.data.originallyPublished && ` · ${post.data.originallyPublished}`}
    </p>
    <div class="prose-custom mt-8 max-w-[64ch] leading-[1.75] text-[var(--dim)]
                [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-[var(--ink)]
                [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--ink)]
                [&_p]:mb-4 [&_a]:text-[var(--acc)] [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
      <Content />
    </div>
  </article>
</Base>

<script is:inline>
  document.querySelectorAll('.video-embed').forEach((el) => {
    el.querySelector('button')?.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = el.getAttribute('data-embed') || '';
      iframe.width = '100%'; iframe.height = '100%'; iframe.loading = 'lazy';
      iframe.setAttribute('allowfullscreen', ''); iframe.style.border = '0';
      el.replaceChildren(iframe);
    });
  });
</script>
```

- [ ] **Step 4: Rewrite the frontmatter of `src/content/writing/fame-23-recap.mdx`**

Task 4 already moved this file here. Its body is plain markdown with no Liquid, so **leave the body exactly as it is** and replace only the frontmatter block at the top of the file (everything between the first two `---` lines) with:

```mdx
---
title: FAME '23 Recap
date: 2023-11-27
description: 'A personal recap of Football Analytics: Modeling and Experience 2023.'
---
```

This drops the old `layout: distill`, `authors:` and `tags:` keys. The `authors` block is what carried the affiliation apparatus the spec removes.

Verify: `head -6 src/content/writing/fame-23-recap.mdx` shows the new frontmatter and no `layout:` key.

- [ ] **Step 5: Convert `src/content/writing/tactical-influence-of-analytics.mdx`**

Task 4 already moved this file here too. Apply these mechanical replacements throughout the body:

| Original Liquid | Replacement |
|---|---|
| `{% include figure.html path="assets/img/blog/footure_1_N.jpg" ... %}` plus its surrounding `<div class="row mt-3">` / `<div class="caption">` wrapper | `<Figure src="/img/writing/tactical-N.jpg" alt="..." caption="..." />` — move the caption text out of the `.caption` div |
| `{% include video.html path="URL" ... %}` | `<VideoEmbed src="URL" title="..." />` |
| `{% twitter https://twitter.com/FootureFC/status/1264217046293843968 %}` | `[the original Footure thread](https://twitter.com/FootureFC/status/1264217046293843968)` |

Then replace the whole existing frontmatter block with this one, and add the two imports directly beneath it (MDX imports must sit above first use):

```mdx
---
title: The Tactical Influence of Analytics in Soccer
date: 2020-05-23
description: A brief overview of the soccer analytics landscape, and a use case for Pitch Control in evaluating decision-making.
originallyPublished: Originally published in Portuguese at Footure, 2020
---

import Figure from '../../components/Figure.astro';
import VideoEmbed from '../../components/VideoEmbed.astro';
```

There are exactly **six** `figure.html` includes (`footure_1_0` … `footure_1_5` → `/img/writing/tactical-0.jpg` … `tactical-5.jpg`), **three** `video.html` includes, and **one** `{% twitter %}` tag. The old `authors:`/`toc:`/`layout: distill` keys all go — the `authors` block is what carried the Atlético affiliation predating 04/2021, which is the inconsistency spec §4 flags. `originallyPublished` replaces it honestly.

Verify no Liquid survives: `grep -c '{%' src/content/writing/tactical-influence-of-analytics.mdx` must print `0`.

- [ ] **Step 6: Write the test**

`tests/e2e/writing.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('both posts render at their own URLs', async ({ page }) => {
  await page.goto('/writing/tactical-influence-of-analytics');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tactical Influence');

  await page.goto('/writing/fame-23-recap');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('FAME');
});

test('the 2020 post notes it was originally published elsewhere', async ({ page }) => {
  await page.goto('/writing/tactical-influence-of-analytics');
  await expect(page.getByText(/Originally published in Portuguese/)).toBeVisible();
});

test('no Liquid tags survived the migration', async ({ page }) => {
  await page.goto('/writing/tactical-influence-of-analytics');
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('{%');
  expect(body).not.toContain('include figure.html');
});

test('post images resolve', async ({ page }) => {
  await page.goto('/writing/tactical-influence-of-analytics');
  const images = page.locator('article img');
  const n = await images.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const ok = await images.nth(i).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(ok).toBe(true);
  }
});
```

- [ ] **Step 7: Run the test**

Run: `npx playwright test tests/e2e/writing.spec.ts --project=desktop`
Expected: `4 passed`.

- [ ] **Step 8: Commit**

```bash
git add src/components/Figure.astro src/components/VideoEmbed.astro src/content/writing src/pages/writing tests/e2e/writing.spec.ts
git commit -m "feat: migrate the two long-form posts to MDX"
```

---

### Task 17: CV page

**Files:**
- Create: `src/pages/cv.astro`
- Test: `tests/e2e/cv.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/e2e/cv.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('lists every role with correct dates', async ({ page }) => {
  await page.goto('/cv');
  const cv = page.getByTestId('cv');
  await expect(cv).toContainText('01/2026 – now');
  await expect(cv).toContainText('07/2025 – 12/2025');
  await expect(cv).toContainText('07/2023 – 06/2025');
  await expect(cv).toContainText('04/2021 – 07/2023');
});

test('shows both degrees with the confirmed BSc dates', async ({ page }) => {
  await page.goto('/cv');
  const cv = page.getByTestId('cv');
  await expect(cv).toContainText('03/2018 – 08/2022');
  await expect(cv).toContainText('Computational Mathematics');
  await expect(cv).toContainText('defended 02/2026');
});

test('states no headcount and no reporting lines anywhere', async ({ page }) => {
  await page.goto('/cv');
  const text = await page.getByTestId('cv').innerText();
  expect(text).not.toMatch(/team of|reports? to|reported to|direct reports?/i);
});

test('contains no trace of the old Einstein template', async ({ page }) => {
  await page.goto('/cv');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Einstein|Nobel|Max Planck|Zurich/i);
});

test('lists both MLSA editions and the Opta win', async ({ page }) => {
  await page.goto('/cv');
  const cv = page.getByTestId('cv');
  await expect(cv).toContainText('12th and 13th editions');
  await expect(cv).toContainText('Opta Pro Forum');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/cv.spec.ts --project=desktop`
Expected: FAIL — `/cv` 404s.

- [ ] **Step 3: Create `src/pages/cv.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import SectionHead from '../components/SectionHead.astro';
import { getCollection } from 'astro:content';

const roles = (await getCollection('roles'))
  .sort((a, b) => b.data.order - a.data.order)
  .filter((r) => r.id !== 'salab-fame');

const founded = [
  { when: '2022 – now', role: 'Co-founder', org: 'Sports Analytics Lab (SALab), UFMG', note: "Brazil's first sports analytics lab." },
  { when: '2022 – now', role: 'Co-founder & organizer', org: 'FAME', note: "Brazil's first football analytics conference. Five editions." },
];
const education = [
  { when: 'defended 02/2026', role: 'MSc, Computer Science', org: 'UFMG', note: 'Towards Learning Representations from Spatiotemporal Grids in Soccer. Supervisor: Wagner Meira Jr. Co-supervisors: Jesse Davis and Adriano C. M. Pereira.' },
  { when: '03/2018 – 08/2022', role: 'BSc, Computational Mathematics', org: 'UFMG', note: '' },
];
const service = [
  { when: '2025, 2026', role: 'Co-organizer', org: 'MLSA @ ECML/PKDD', note: '12th and 13th editions.' },
  { when: '2023', role: 'Winner, Algorithm Track', org: 'Opta Pro Forum', note: 'With Maaike Van Roy, Wagner Meira Jr. and Jesse Davis.' },
];
---
<Base title="CV — Hugo Rios-Neto" description="Curriculum vitae — football analytics, from Belo Horizonte to Brussels." current="cv">
  <div data-testid="cv" class="py-12">
    <div class="mb-8 flex flex-wrap items-start gap-4">
      <div>
        <h1 class="font-serif text-3xl font-normal tracking-tight">Curriculum Vitae</h1>
        <p class="mt-1 text-sm text-[var(--dim)]">Belo Horizonte → Brussels.</p>
      </div>
      <button type="button" id="cv-print"
              class="no-print ml-auto rounded-full bg-[var(--acc)] px-4 py-2 text-sm font-semibold text-white">
        Print / save as PDF
      </button>
    </div>

    <SectionHead kicker="Experience" />
    {roles.map((r) => (
      <div class="grid grid-cols-1 gap-x-5 border-t border-[var(--hair)] py-3 sm:grid-cols-[9rem_1fr]">
        <div class="text-sm tabular-nums text-[var(--faint)]">{r.data.dates}</div>
        <div>
          <div class="font-semibold">{r.data.title}</div>
          <div class="text-sm font-medium text-[var(--acc)]">{r.data.org}</div>
          <p class="mt-1 text-sm text-[var(--dim)]">{r.data.blurb}</p>
        </div>
      </div>
    ))}

    {[['Founded', founded], ['Education', education], ['Service & awards', service]].map(([kicker, rows]: any) => (
      <div class="mt-10">
        <SectionHead kicker={kicker} />
        {rows.map((row: any) => (
          <div class="grid grid-cols-1 gap-x-5 border-t border-[var(--hair)] py-3 sm:grid-cols-[9rem_1fr]">
            <div class="text-sm tabular-nums text-[var(--faint)]">{row.when}</div>
            <div>
              <div class="font-semibold">{row.role}</div>
              <div class="text-sm font-medium text-[var(--acc)]">{row.org}</div>
              {row.note && <p class="mt-1 text-sm text-[var(--dim)]">{row.note}</p>}
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
</Base>

<script is:inline>
  document.getElementById('cv-print')?.addEventListener('click', () => window.print());
</script>
```

- [ ] **Step 4: Run the test**

Run: `npx playwright test tests/e2e/cv.spec.ts --project=desktop`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/cv.astro tests/e2e/cv.spec.ts
git commit -m "feat: add CV page with print styles"
```

---

### Task 18: Favicon, 404, OG image, redirects

**Files:**
- Create: `public/favicon.svg`, `public/img/og.png`, `src/pages/404.astro`
- Test: `tests/e2e/routing.spec.ts`

- [ ] **Step 1: Create `public/favicon.svg`**

The tricolour rule motif from spec §5, replacing the SALab logo.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#FBF3D5"/>
  <rect x="5" y="9"  width="22" height="4" rx="2" fill="#009739"/>
  <rect x="5" y="15" width="15" height="4" rx="2" fill="#FEDD00"/>
  <rect x="5" y="21" width="19" height="4" rx="2" fill="#012169"/>
</svg>
```

- [ ] **Step 2: Create `src/pages/404.astro`**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Not found — Hugo Rios-Neto" description="That page doesn't exist.">
  <section class="py-24">
    <h1 class="font-serif text-3xl font-normal tracking-tight">That page doesn't exist</h1>
    <p class="mt-3 text-[var(--dim)]">
      Try <a class="text-[var(--acc)]" href="/">the homepage</a>,
      <a class="text-[var(--acc)]" href="/research">research</a>, or
      <a class="text-[var(--acc)]" href="/cv">the CV</a>.
    </p>
  </section>
</Base>
```

- [ ] **Step 3: Generate the Open Graph image**

```bash
npm run build
npx --yes serve dist -l 4322 & SERVER=$!
sleep 3
npx playwright screenshot --viewport-size=1200,630 --wait-for-timeout=1500 \
  http://localhost:4322/ public/img/og.png
kill $SERVER
```
Expected: `public/img/og.png` exists. Confirm with `file public/img/og.png` — it should report `1200 x 630`.

- [ ] **Step 4: Write the routing test**

`tests/e2e/routing.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

// Must stay in lockstep with the `redirects` map in astro.config.mjs. A redirect
// missing from both is invisible to this test, so check the config when editing.
const REDIRECTS: [string, string][] = [
  ['/papers', '/research'],
  ['/blog', '/'],
  ['/writing', '/'],
  ['/repositories', '/'],
  ['/blog/2020/tactical-influence-analytics', '/writing/tactical-influence-of-analytics'],
  ['/blog/2023/fame-recap', '/writing/fame-23-recap'],
  ['/news', '/'],
  ['/news/1_welcome', '/'],
  ['/news/2_leave_cam', '/'],
  ['/news/3_join_gemini', '/'],
];

for (const [from, to] of REDIRECTS) {
  test(`${from} redirects to ${to}`, async ({ page }) => {
    await page.goto(from);
    await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === to.replace(/\/$/, '') || url.pathname === to);
    expect(page.url()).toContain(to === '/' ? '' : to);
  });
}

test('unknown URLs render the 404 page', async ({ page }) => {
  const res = await page.goto('/nope-not-here');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("doesn't exist");
});

test('sitemap is generated', async ({ request }) => {
  const res = await request.get('/sitemap-index.xml');
  expect(res.status()).toBe(200);
});

test('every internal link on every page resolves', async ({ page, request }) => {
  const pages = ['/', '/research', '/salab-fame', '/talks', '/cv'];
  const seen = new Set<string>();
  for (const p of pages) {
    await page.goto(p);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    for (const h of hrefs) seen.add(h);
  }
  for (const href of seen) {
    const res = await request.get(href);
    expect(res.status(), `${href} should not 404`).toBeLessThan(400);
  }
});

test('paper PDFs keep the URLs they are cited at', async ({ request }) => {
  // These paths appear in external citations. A redirect cannot rescue them —
  // an Astro redirect key ending in .pdf emits a directory containing index.html
  // and would answer a PDF request with HTML. Task 5 must place them at
  // public/assets/pdf/ so these URLs survive untouched.
  for (const f of ['eniac23', 'gabr', 'obso']) {
    const res = await request.get(`/assets/pdf/${f}.pdf`);
    expect(res.status(), `/assets/pdf/${f}.pdf should still resolve`).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  }
});
```

- [ ] **Step 5: Run the routing test**

Run: `npx playwright test tests/e2e/routing.spec.ts --project=desktop`
Expected: `14 passed` — 10 redirects, the 404, the sitemap, the internal-link sweep, and the PDF URL check.

- [ ] **Step 6: Commit**

```bash
git add public/favicon.svg public/img/og.png src/pages/404.astro tests/e2e/routing.spec.ts
git commit -m "feat: add favicon, 404, OG image and redirect coverage"
```

---

### Task 19: Accessibility and performance gate

**Files:**
- Create: `tests/e2e/a11y.spec.ts`

- [ ] **Step 1: Write the accessibility test**

`tests/e2e/a11y.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/research', '/salab-fame', '/talks', '/cv', '/writing/fame-23-recap'];

for (const path of PAGES) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('every page has exactly one h1', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('h1'), `${path} should have one h1`).toHaveCount(1);
  }
});

test('the body never scrolls horizontally on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows at 375px`).toBeLessThanOrEqual(1);
  }
});

test('pages without an island ship no JavaScript bundle', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('/cv');
  await page.waitForLoadState('networkidle');
  // The CV has only the inline print handler, so no external bundle should load.
  expect(scripts.filter((s) => s.endsWith('.js'))).toEqual([]);
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/e2e/a11y.spec.ts`
Expected: all pass. **If axe reports violations, fix the markup — do not weaken the assertion.**

- [ ] **Step 3: Run the whole suite on both viewports**

Run: `npm test && npx playwright test`
Expected: all unit tests pass, all e2e tests pass on `desktop` and `mobile`.

- [ ] **Step 4: Add the Lighthouse budget**

Spec §9 requires Lighthouse ≥ 95 on all four categories. Create `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": [
        "http://localhost/index.html",
        "http://localhost/research/index.html",
        "http://localhost/salab-fame/index.html",
        "http://localhost/talks/index.html",
        "http://localhost/cv/index.html"
      ],
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": ".lighthouseci" }
  }
}
```

Add `"lighthouse": "lhci autorun"` to the `scripts` block in `package.json`, and `"@lhci/cli": "^0.14.0"` to `devDependencies`. Then run `npm install`.

- [ ] **Step 5: Run Lighthouse**

Run: `npm run build && npm run lighthouse`
Expected: all assertions pass. **If a category falls below 0.95, fix the site — do not lower the threshold.** Add `.lighthouseci/` to `.gitignore`.

- [ ] **Step 6: Check the production bundle size**

Run: `npm run build && du -sh dist && find dist -name '*.js' -exec ls -la {} \;`
Expected: total `dist` well under 20 MB (dominated by the three PDFs), and only small per-component scripts.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/a11y.spec.ts lighthouserc.json package.json package-lock.json .gitignore
git commit -m "test: add accessibility, Lighthouse and bundle gates"
```

---

### Task 20: Replace the deploy workflow

Keeps the existing `gh-pages`-branch mechanism, so **no GitHub Pages repo setting needs changing**. Only the build changes: Ruby out, Node in.

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Delete: `.github/workflows/deploy-image.yml`, `.github/workflows/deploy-docker-tag.yml`, `.github/stale.yml`

- [ ] **Step 1: Replace `.github/workflows/deploy.yml`**

```yaml
name: deploy

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install
        run: npm ci

      - name: Unit tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium webkit

      - name: End-to-end tests
        run: npx playwright test

      - name: Lighthouse budget
        run: npm run lighthouse

      - name: Upload test report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7

      - name: Deploy 🚀
        if: github.event_name != 'pull_request'
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
```

- [ ] **Step 2: Delete the Docker workflows and stale bot**

```bash
git rm --quiet .github/workflows/deploy-image.yml .github/workflows/deploy-docker-tag.yml .github/stale.yml
```

- [ ] **Step 3: Verify the workflow parses**

Run: `npx --yes js-yaml .github/workflows/deploy.yml > /dev/null && echo "valid yaml"`
Expected: prints `valid yaml`.

- [ ] **Step 4: Reproduce the CI sequence locally**

Run: `npm ci && npm test && npm run build && npx playwright test && npm run lighthouse`
Expected: every step exits 0.

- [ ] **Step 5: Commit**

```bash
git add .github
git commit -m "ci: build and test the Astro site instead of Jekyll"
```

---

### Task 21: Final sweep

- [ ] **Step 1: Confirm no Einstein, no template residue, no stale role anywhere in the build**

Run:
```bash
npm run build
grep -ril "einstein\|al-folio\|lorem ipsum\|I currently hold a Intelligence Engineer role\|Nobel Prize\|going into its 3rd edition" dist || echo "clean"
```
Expected: prints `clean`. (Those last three are the exact stale strings from the old homepage and `_data/cv.yml`.)

- [ ] **Step 2: Confirm the five pages and both posts exist in `dist`**

Run:
```bash
for p in "" research salab-fame talks cv writing/tactical-influence-of-analytics writing/fame-23-recap; do
  f="dist/${p:+$p/}index.html"
  test -f "$f" && echo "ok  $f" || echo "MISSING  $f"
done
```
Expected: seven `ok` lines, no `MISSING`.

- [ ] **Step 3: Confirm no external hosts are contacted on any page**

Run: `npx playwright test tests/e2e/talks.spec.ts -g "third-party" --project=desktop`
Expected: PASS.

- [ ] **Step 4: Update the README**

Replace `README.md` with:
```markdown
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
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the Astro site"
```

---

## Verification checklist

Before opening a PR, all of these must be true:

- [ ] `npm test` — unit tests pass (contrast, token AA compliance, schemas, BibTeX)
- [ ] `npx playwright test` — passes on both `desktop` and `mobile` projects
- [ ] `npm run build` — clean, no content-collection errors
- [ ] `npm run lighthouse` — all four categories ≥ 95 on all five pages
- [ ] No axe violations on any of the six tested pages
- [ ] Every old permalink redirects; no internal link 404s
- [ ] No page contacts a third-party host before a user click
- [ ] `dist` contains no reference to Einstein, al-folio, or Gemini as a current role
- [ ] No page states headcount, a reporting line, or any forward-looking ambition
- [ ] Checked by eye at 375px, 768px and 1280px

## Deferred to a later plan

- **Dark mode.** Tokens are structured for it; the warm dark palette is recorded in spec §5.
- **FAME '26 programme.** Add to `fame.yaml` and flip `status` to `past` after 28 September 2026.
- **Custom domain.** Not discussed; `hugoriosneto.github.io` retained.
