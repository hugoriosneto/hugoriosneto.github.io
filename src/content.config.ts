import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { roleSchema, paperSchema, talkSchema, fameSchema } from './lib/schemas';

export const collections = {
  roles: defineCollection({ loader: file('src/content/roles.yaml'), schema: roleSchema }),
  papers: defineCollection({ loader: file('src/content/papers.yaml'), schema: paperSchema }),
  talks: defineCollection({ loader: file('src/content/talks.yaml'), schema: talkSchema }),
  fame: defineCollection({ loader: file('src/content/fame.yaml'), schema: fameSchema }),
};
