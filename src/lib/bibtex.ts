export interface BibtexInput {
  title: string;
  year: number;
  authors: string[];
  bibtexKey: string;
  bibtexType: 'inproceedings' | 'article' | 'mastersthesis';
  booktitle?: string;
  publisher?: string;
}

/* Field names pad to the width of the longest one (`booktitle`/`publisher`, 9 chars)
   so every `=` lands in the same column. An earlier version padded title/author/year
   to a different width from booktitle/publisher, which put the `=` signs one column
   apart — ragged output that ends up pasted into other people's .bib files. */
const field = (name: string, value: string | number) => `  ${name.padEnd(9)} = {${value}},`;

/* LaTeX special characters. Backslashes are parked on a sentinel first, so the
   backslashes this function introduces are not themselves re-escaped by the brace
   rule that follows. Applied to human text only — never to bibtexKey or bibtexType,
   which are identifiers.

   Not hypothetical: an unescaped `%` silently comments out the rest of the title with
   no error at the .bib layer, and `&` vanishes. "Machine Learning & Data Mining"
   already appears on the Research page, one content edit from a booktitle. */
const esc = (s: string) => s
  .replace(/\\/g, '\u0000')
  .replace(/([&%$#_{}])/g, '\\$1')
  .replace(/~/g, '\\textasciitilde{}')
  .replace(/\^/g, '\\textasciicircum{}')
  .replace(/\u0000/g, '\\textbackslash{}');

export function toBibtex(p: BibtexInput): string {
  const lines: string[] = [`@${p.bibtexType}{${p.bibtexKey},`];
  /* The extra brace pair around the title stops classic .bst styles case-folding it.
     Without it `plain.bst` renders GraphEPV as "Graphepv" — the paper's own name,
     mangled, in someone else's bibliography. `booktitle` needs no such guard: plain
     does not case-fold it, so ECML/PKDD and StatsBomb survive as they are. */
  lines.push(field('title', `{${esc(p.title)}}`));
  /* Each author braced individually so BibTeX treats the name as one literal unit
     rather than re-parsing it. Unbraced, `abbrv.bst` reads "Wagner Meira Jr." as
     surname "Jr." and renders "W. M. Jr.", and "Pedro O. S. Vaz-de-Melo" loses its
     hyphens to von-particle handling. Cost: braced names are no longer abbreviated
     by `abbrv`. Un-abbreviated and correct beats abbreviated and wrong. */
  lines.push(field('author', p.authors.map((a) => `{${esc(a)}}`).join(' and ')));
  lines.push(field('year', p.year));
  if (p.booktitle) lines.push(field('booktitle', esc(p.booktitle)));
  if (p.publisher) lines.push(field('publisher', esc(p.publisher)));
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push('}');
  return lines.join('\n');
}

/* Accented characters are emitted as raw UTF-8 rather than \'a-style escapes.
   Verified against TeX Live 2025: both biber and classic pdflatex+bibtex typeset
   Sá-Freire, Valadão, João, Vinícius and 360º correctly. Escaping them would make the
   copied text unreadable in the button preview and in Zotero, to protect against
   pre-2018 distributions without inputenc. */
