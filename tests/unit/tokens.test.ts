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
/* --award-fg sits on the yellow badge fill, not on --bg or --card, so it is classified
   as text but checked against its own surface in a dedicated case below.

   --frame is classified `edge`, NOT text, and that classification is the point: it is a
   photo hairline at 2.62:1, so the moment it appears in TEXT_TOKENS the AA suite goes
   red. Keeping it out of `text` is therefore not an exemption from testing — the `edge`
   case below pins it inside a 2.4–3.0:1 band, which is a tighter constraint than 4.5:1
   would be, because it has a ceiling as well as a floor. */
const CLASSIFIED = {
  surface: ['bg', 'card', 'hair', 'hair2', 'cardline'],
  text: [...TEXT_TOKENS, 'award-fg'],
  edge: ['frame'],
  fill: ['accfill', 'mark', 'award-line', 'poster'],
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

  it('keeps --frame a visible photo hairline: not invisible, not a black box', () => {
    // The portrait is a cream subject against a cream wall on a cream page, so its edge
    // is drawn, not natural. --cardline was doing that job at 1.18:1 on --bg, which is
    // no edge at all: the photo's pale top corners dissolved into the background.
    //
    // Two-sided on purpose. A floor alone lets someone "soften" it back toward
    // --cardline; a ceiling alone lets it drift to near-black, which turns a hairline
    // into a frame that outshouts the photograph. 2.4–3.0 brackets the measured 2.62:1
    // on --bg closely enough that either drift fails on the next run.
    const onBg = contrastRatio(token('frame'), token('bg'));
    expect(onBg, `--frame is ${onBg.toFixed(2)}:1 on --bg`).toBeGreaterThanOrEqual(2.4);
    expect(onBg, `--frame is ${onBg.toFixed(2)}:1 on --bg`).toBeLessThanOrEqual(3.0);
    // It must also out-contrast the token it replaced, or the change was cosmetic.
    expect(onBg).toBeGreaterThan(contrastRatio(token('cardline'), token('bg')));
    // And it is emphatically not a text colour — this is the assertion that keeps a
    // later "reuse --frame for the separators" from passing review.
    expect(onBg, '--frame must never become legible enough to invite text use')
      .toBeLessThan(4.5);
  });

  it('keeps the award badge legible on its own fill, on both surfaces it sits on', () => {
    // Flag yellow at 30%, composited over whichever surface is behind it: --bg on the
    // homepage teaser, --card inside a talk card. Both are checked because the badge
    // renders on both and --award-fg sits on neither directly.
    for (const surface of ['bg', 'card'] as const) {
      const badgeFill = composite('rgba(254, 221, 0, 0.3)', token(surface));
      expect(contrastRatio(token('award-fg'), badgeFill),
        `award badge over --${surface}`).toBeGreaterThanOrEqual(4.5);
    }
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
