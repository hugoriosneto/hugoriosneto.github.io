import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://hugoriosneto.github.io',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/papers': '/research',
    '/blog': '/',
    '/repositories': '/',
    // Both posts are deleted, so their URLs land on the homepage rather than a page.
    '/blog/2020/tactical-influence-analytics': '/',
    '/blog/2023/fame-recap': '/',
    // The old news collection. Astro static redirects do not support wildcards —
    // `'/news/[...slug]'` fails the build with GetStaticPathsRequired — so the four
    // URLs Jekyll actually emitted are enumerated.
    '/news': '/',
    '/news/1_welcome': '/',
    '/news/2_leave_cam': '/',
    '/news/3_join_gemini': '/',
  },
});
