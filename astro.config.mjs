// @ts-check
import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import redirects from './src/data/redirects.json' with { type: 'json' };

// The public site is fully static. The Keystatic admin (/keystatic) needs a
// server, so it is only included in dev, or in a build with KEYSTATIC=true
// (e.g. a small Node container that editors log into with GitHub).
const withAdmin = process.env.KEYSTATIC === 'true' || process.argv.includes('dev');

export default defineConfig({
  site: 'https://tkkrlab.nl',
  redirects,
  integrations: [react(), markdoc(), sitemap(), ...(withAdmin ? [keystatic()] : [])],
  adapter: withAdmin ? node({ mode: 'standalone' }) : undefined,
});
