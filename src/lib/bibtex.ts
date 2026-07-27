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
