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
    expect(toBibtex(paper)).toContain('author    = {{Ricardo Furbino M. Nascimento} and {Hugo Rios-Neto}}');
  });

  it('includes title, year and booktitle', () => {
    const out = toBibtex(paper);
    expect(out).toContain('title     = {{Generalized Action-based Ball Recovery Model using 360º data}}');
    expect(out).toContain('year      = {2022}');
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

  it('braces each author so BibTeX does not re-parse the name', () => {
    // Unbraced, abbrv.bst reads "Wagner Meira Jr." as surname "Jr." and renders
    // "W. M. Jr." — a co-author's surname, deleted.
    const out = toBibtex({ ...paper, authors: ['Wagner Meira Jr.', 'Pedro O. S. Vaz-de-Melo'] });
    expect(out).toContain('{Wagner Meira Jr.} and {Pedro O. S. Vaz-de-Melo}');
  });

  it('brace-protects the title against case-folding styles', () => {
    // plain.bst renders an unprotected "GraphEPV" as "Graphepv".
    expect(toBibtex({ ...paper, title: 'GraphEPV: Expected Possession Value' }))
      .toContain('title     = {{GraphEPV: Expected Possession Value}}');
  });

  it('escapes LaTeX special characters', () => {
    // An unescaped % comments out the rest of the line, silently.
    const out = toBibtex({ ...paper, title: 'Improving xG by 30% & the xG_total metric' });
    expect(out).toContain('30\\%');
    expect(out).toContain('\\&');
    expect(out).toContain('xG\\_total');
  });

  it('leaves accented characters as raw UTF-8', () => {
    // Verified against TeX Live 2025 under both biber and classic bibtex.
    const out = toBibtex({ ...paper, authors: ['Bruno M. Sá-Freire', 'Gabriel Valadão'] });
    expect(out).toContain('Sá-Freire');
    expect(out).toContain('Valadão');
    expect(out).not.toContain("\\'a");
  });

  it('aligns every equals sign in the same column', () => {
    // This output gets pasted into other people's .bib files; ragged columns read
    // as sloppy from someone whose whole positioning is rigour.
    const cols = toBibtex({ ...paper, publisher: 'Springer' })
      .split('\n')
      .filter((l) => l.includes(' = '))
      .map((l) => l.indexOf('='));
    expect(new Set(cols).size).toBe(1);
  });
});
