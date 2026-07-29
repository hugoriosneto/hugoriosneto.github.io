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
