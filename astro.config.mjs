// @ts-check
import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import redirects from './src/data/redirects.json' with { type: 'json' };

// The public site is prerendered; only /oauth/* (Sveltia's GitHub sign-in) runs on
// the Node server.
export default defineConfig({
  site: 'https://tkkrlab.nl',
  redirects,
  integrations: [markdoc(), sitemap()],
  adapter: node({ mode: 'standalone' }),
});
