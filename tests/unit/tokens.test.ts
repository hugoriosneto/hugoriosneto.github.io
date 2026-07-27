import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../../src/lib/contrast';

// Resolved relative to this file, not the process CWD — Vitest leaves cwd at the
// invocation directory, so a bare relative path only works when run from the repo root.
const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`));
  if (!m) throw new Error(`Token --${name} not found or not a hex value`);
  return m[1];
}

const TEXT_TOKENS = ['ink', 'dim', 'faint', 'acc', 'acc2'] as const;

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
    expect(ink).toBeGreaterThan(dim + 2);
    expect(dim).toBeGreaterThan(faint + 1);
  });

  it('documents that --accfill must never be used as text', () => {
    // #009739 is 3.83:1 on white and 3.9:1 on cream. This test exists so that if
    // anyone "simplifies" --acc and --accfill into one token, it fails loudly.
    expect(contrastRatio(token('accfill'), token('bg'))).toBeLessThan(4.5);
  });
});
