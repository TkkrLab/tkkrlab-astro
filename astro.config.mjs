// @ts-check
import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import redirects from './src/data/redirects.json' with { type: 'json' };

// The public site is prerendered; only /oauth/* (Sveltia's GitHub sign-in) runs on
// the Node server. The Keystatic admin (/keystatic) is only included in dev, or in
// a build with KEYSTATIC=true.
const withAdmin = process.env.KEYSTATIC === 'true' || process.argv.includes('dev');

export default defineConfig({
  site: 'https://tkkrlab.nl',
  redirects,
  integrations: [react(), markdoc(), sitemap(), ...(withAdmin ? [keystatic()] : [])],
  adapter: node({ mode: 'standalone' }),
});
