/* Spec §8 facts of record. Rendered on the homepage teaser, the research page and the CV
   — three surfaces that previously held three independent copies with nothing comparing
   them. Change a fact here and every surface follows. */
export const thesis = {
  title: 'Towards Learning Representations from Spatiotemporal Grids in Soccer',
  degree: 'MSc, Computer Science',
  institution: 'UFMG',
  defended: 'February 2026',
  supervisor: 'Wagner Meira Jr.',
  coSupervisors: ['Jesse Davis', 'Adriano C. M. Pereira'],
} as const;

export const mlsa = {
  name: 'Machine Learning & Data Mining for Sports Analytics',
  edition: 13,
  priorEdition: 12,
  priorYear: 2025,
  venue: 'ECML/PKDD',
  city: 'Naples',
  date: '7 September 2026',
  organisers: ['Pieter Robberechts', 'Maaike Van Roy', 'Albrecht Zimmermann'],
} as const;
