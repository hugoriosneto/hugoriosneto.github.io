import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://hugoriosneto.github.io',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/papers': '/research',
    '/blog': '/',
    '/writing': '/',
    '/repositories': '/',
    '/blog/2020/tactical-influence-analytics': '/writing/tactical-influence-of-analytics',
    '/blog/2023/fame-recap': '/writing/fame-23-recap',
  },
});
