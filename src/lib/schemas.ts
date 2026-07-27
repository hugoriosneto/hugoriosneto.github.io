import { z } from 'astro/zod';

const BANNED_IN_BLURB = /\b(team of \w+|reports? to|reported to|reporting to|headcount|direct reports?)\b/i;

// NOTE: `id` is optional in every schema below. The `file()` loader consumes the YAML
// `id` key to build the entry ID and may not pass it through to `data`; making it
// required would break the build depending on loader version.
export const roleSchema = z.object({
  id: z.string().optional(),
  org: z.string(),
  title: z.string(),
  dates: z.string(),
  verb: z.string(),
  order: z.number().int().min(1),
  position: z.number().min(0).max(100),
  blurb: z.string().min(1).refine((s) => !BANNED_IN_BLURB.test(s), {
    message: 'Role blurbs must state remit only — no headcount and no reporting lines (spec §3).',
  }),
  capabilities: z.array(z.string()).min(1),
});

export const paperSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  year: z.number().int().min(1990).max(2100),
  venue: z.string(),
  authors: z.array(z.string()).min(1)
    .refine((a) => a.some((n) => n.includes('Rios-Neto')), {
      message: 'Author list must include Hugo Rios-Neto.',
    }),
  pdf: z.string().optional(),
  url: z.string().url().optional(),
  bibtexKey: z.string(),
  bibtexType: z.enum(['inproceedings', 'article', 'mastersthesis']),
  booktitle: z.string().optional(),
  publisher: z.string().optional(),
});

export const talkSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  provider: z.enum(['youtube', 'vimeo', 'spotify']),
  embedUrl: z.string().url().startsWith('https://'),
  date: z.string().optional(),
  language: z.enum(['EN', 'PT']),
  format: z.enum(['Conference', 'Podcast', 'Webinar', 'Live']),
  award: z.string().optional(),
  role: z.string().optional(),
  order: z.number().int(),
});

export const fameSchema = z.object({
  id: z.string().optional(),
  edition: z.number().int().min(1),
  year: z.number().int(),
  date: z.string(),
  venue: z.string(),
  status: z.enum(['past', 'upcoming']),
  detail: z.string().optional(),
  sponsors: z.array(z.string()).default([]),
  note: z.string().optional(),
}).refine((e) => e.status === 'upcoming' || (e.detail && e.detail.length > 0), {
  message: 'A past FAME edition must have detail.',
  path: ['detail'],
});
