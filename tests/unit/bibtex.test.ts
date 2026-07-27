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
