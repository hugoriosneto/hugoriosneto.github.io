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

export function toBibtex(p: BibtexInput): string {
  const lines: string[] = [`@${p.bibtexType}{${p.bibtexKey},`];
  lines.push(field('title', p.title));
  lines.push(field('author', p.authors.join(' and ')));
  lines.push(field('year', p.year));
  if (p.booktitle) lines.push(field('booktitle', p.booktitle));
  if (p.publisher) lines.push(field('publisher', p.publisher));
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push('}');
  return lines.join('\n');
}
