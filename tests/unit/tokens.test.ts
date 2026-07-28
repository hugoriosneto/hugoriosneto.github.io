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
   as text but checked against its own surface in a dedicated case below. */
const CLASSIFIED = {
  surface: ['bg', 'card', 'hair', 'hair2', 'cardline'],
  text: [...TEXT_TOKENS, 'award-fg'],
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

  it('keeps the award badge legible on its own fill', () => {
    // The badge fill composites flag yellow at 30% over cream. Checked explicitly
    // because --award-fg sits on neither --bg nor --card.
    const badgeFill = composite('rgba(254, 221, 0, 0.3)', token('bg'));
    expect(contrastRatio(token('award-fg'), badgeFill)).toBeGreaterThanOrEqual(4.5);
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
