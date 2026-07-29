import { z } from 'astro/zod';

/* Applied to BOTH `blurb` and every `capabilities` entry. Spec §3 forbids reporting
   lines and headcount on a role, not merely in one field — and the chips are the other
   surface where role copy reaches the page. Guarding only the blurb left the chips with
   no enforcement at any layer: Task 11's e2e reads the detail panel, and the CV never
   renders capabilities at all. */
const BANNED_PHRASE = /\b(team of \w+|reports? to|reported to|reporting to|headcount|direct reports?)\b/i;

/* No `id` field. The `file()` loader sets `entry.id` from the YAML `id` key regardless
   of the schema, and nothing reads `entry.data.id` — Task 13 keys previews off
   `entry.id`, Task 17 filters on `entry.id`. Declaring it would only duplicate a value
   that already exists one level up. */
export const roleSchema = z.object({
  org: z.string(),
  title: z.string(),
  dates: z.string(),
  verb: z.string(),
  order: z.number().int().min(1),
  // 0 and 100 clip: dots carry -ml-2.5 inside a left-2 right-2 rail.
  position: z.number().min(2).max(98),
  blurb: z.string().min(1).refine((s) => !BANNED_PHRASE.test(s), {
    message: 'Role blurbs must state remit only — no headcount and no reporting lines (spec §3).',
  }),
  capabilities: z.array(
    z.string().refine((s) => !BANNED_PHRASE.test(s), {
      message: 'Capability chips must state remit only — no headcount and no reporting lines (spec §3).',
    }),
  ).min(1),
});

export const paperSchema = z.object({
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

const EMBED_HOSTS = { youtube: 'www.youtube.com', vimeo: 'player.vimeo.com', spotify: 'open.spotify.com' };
/* The canonical watch page, which is a different host from the player for Vimeo. Without
   it the talks page has no <a> anywhere: with scripts off it renders posters that
   never load and no way to reach any of the media it exists to surface. */
const WATCH_HOSTS = { youtube: 'www.youtube.com', vimeo: 'vimeo.com', spotify: 'open.spotify.com' };

export const talkSchema = z.object({
  title: z.string(),
  description: z.string(),
  provider: z.enum(['youtube', 'vimeo', 'spotify']),
  embedUrl: z.string().url().startsWith('https://'),
  url: z.string().url().startsWith('https://'),
  language: z.enum(['EN', 'PT']),
  format: z.enum(['Conference', 'Podcast', 'Webinar', 'Live']),
  award: z.string().optional(),
  // Not `role` — `roles` is the career collection and `role` is also the ARIA
  // attribute used throughout the adjacent components. This is a billing credit.
  credit: z.string().optional(),
  order: z.number().int(),
}).refine((t) => EMBED_HOSTS[t.provider] === new URL(t.embedUrl).host, {
  message: 'embedUrl host must match provider — this value goes straight into iframe.src.',
  path: ['embedUrl'],
}).refine((t) => WATCH_HOSTS[t.provider] === new URL(t.url).host, {
  message: 'url must be the canonical watch page on the provider’s own host.',
  path: ['url'],
});

export const fameSchema = z.object({
  edition: z.number().int().min(1),
  year: z.number().int(),
  date: z.string(),
  venue: z.string(),
  status: z.enum(['past', 'upcoming']),
  detail: z.string().optional(),
  sponsors: z.array(z.string()).default([]),
  note: z.string().optional(),
}).refine((e) => (e.status === 'past' ? !!e.detail : !!e.note), {
  message: 'A past FAME edition needs `detail`; an upcoming one needs `note`. Otherwise the panel renders blank.',
  path: ['detail'],
});
