#!/usr/bin/env node
// One-off migration: pulls all content from the WordPress REST API of
// tkkrlab.nl and writes it as Markdoc files.
//
//   node scripts/migrate-wordpress.mjs [--base https://www.tkkrlab.nl]
//
// Re-running overwrites migrated files, so only do that before people
// start editing in the CMS.
import fs from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const BASE = (process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'https://www.tkkrlab.nl').replace(/\/$/, '');
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UA = { 'User-Agent': 'Mozilla/5.0 (tkkrlab-migration)' };

// WordPress type -> our collection, plus the URL prefixes old and new.
const TYPES = {
  posts: { collection: 'posts', oldPrefix: '/', newPrefix: '/blog/' },
  pages: { collection: 'pages', oldPrefix: '/', newPrefix: '/' },
  project: { collection: 'projects', oldPrefix: '/project/', newPrefix: '/projecten/' },
  wikiwiki: { collection: 'tools', oldPrefix: '/wikiwiki/', newPrefix: '/gereedschap/' },
  cybersaturday: { collection: 'cybersaturdays', oldPrefix: '/cybersaturday/', newPrefix: '/cybersaturdays/' },
};

// Pages whose content is rebuilt by Astro rather than migrated as-is.
const SKIP_PAGES = new Set(['landing-page', 'newsletter']); // newsletter was a WP plugin shortcode; hand-written instead
// Pages that list a collection: we keep the intro text and drop the WP query loop.
const LISTING_PAGES = { blog: 'posts', projecten: 'projects', gereedschap: 'tools', cybersaturdays: 'cybersaturdays' };

const log = (...a) => console.log(...a);

async function fetchAll(type) {
  const out = [];
  for (let page = 1; ; page++) {
    const url = `${BASE}/wp-json/wp/v2/${type}?per_page=100&page=${page}&_embed=wp:featuredmedia`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) break;
    const items = await res.json();
    out.push(...items);
    if (page >= Number(res.headers.get('x-wp-totalpages') || 1)) break;
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .trim();

const stripTags = (s) => decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

// ---- link map (old URL path -> new URL path) ------------------------------

const linkMap = new Map();
const redirects = {};

function normalizePath(href) {
  try {
    const u = new URL(href, BASE);
    if (!/(^|\.)tkkrlab\.nl$/.test(u.hostname)) return null;
    return { path: u.pathname.endsWith('/') ? u.pathname : u.pathname + '/', hash: u.hash };
  } catch {
    return null;
  }
}

// ---- downloads -------------------------------------------------------------

const downloaded = new Map(); // remote url -> local public path

async function tryDownload(url, dest) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return false;
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

// Downloads a WP upload into public/<dir>/<file>. For images we try the
// original (without the -300x200 size suffix) first.
async function localize(url, dir, filename) {
  const key = `${url}|${dir}|${filename ?? ""}`;
  if (downloaded.has(key)) return downloaded.get(key);
  const clean = url.split(/[?#]/)[0];
  const original = clean.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');
  // Cover images are stored as `coverImage.<ext>`, so keep that casing exactly.
  const name = filename ?? path.basename(original).toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  const dest = path.join(ROOT, 'public', dir, name);
  const publicPath = `/${dir}/${name}`;
  let ok = false;
  try {
    await fs.access(dest);
    ok = true;
  } catch {
    ok = (original !== clean && (await tryDownload(original, dest))) || (await tryDownload(clean, dest));
  }
  if (!ok) {
    log(`  ! could not download ${url}`);
    downloaded.set(key, url);
    return url;
  }
  downloaded.set(key, publicPath);
  return publicPath;
}

const isUpload = (u) => /\/wp-content\/uploads\//.test(u);
const isImage = (u) => /\.(jpe?g|png|gif|webp|svg|avif)(\?|#|$)/i.test(u);

function bestSrc(img) {
  const srcset = img.getAttribute('srcset');
  if (srcset) {
    const best = srcset
      .split(',')
      .map((s) => s.trim().split(/\s+/))
      .map(([u, w]) => ({ u, w: parseInt(w) || 0 }))
      .sort((a, b) => b.w - a.w)[0];
    if (best?.u) return best.u;
  }
  return img.getAttribute('src');
}

// ---- HTML -> Markdoc -------------------------------------------------------

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
  });
  td.use(gfm);
  td.remove(['script', 'style', 'svg', 'button', 'nav']);

  // Strip images from headings/paragraph wrappers is handled by Turndown already;
  // these rules map WP blocks to our Markdoc tags.
  td.addRule('youtube', {
    filter: (node) => node.nodeName === 'FIGURE' && /wp-block-embed/.test(node.getAttribute('class') || ''),
    replacement: (_c, node) => {
      const iframe = node.querySelector('iframe');
      const src = iframe?.getAttribute('src') || '';
      const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
      if (yt) return `\n\n{% youtube id="${yt[1]}" /%}\n\n`;
      const a = node.querySelector('blockquote a') || node.querySelector('a');
      if (a) return `\n\n[${a.textContent.trim()}](${a.getAttribute('href')})\n\n`;
      return '';
    },
  });
  td.addRule('button', {
    filter: (node) => node.nodeName === 'A' && /wp-block-button__link/.test(node.getAttribute('class') || ''),
    replacement: (content, node) => {
      const label = content.replace(/\s+/g, ' ').replace(/"/g, "'").trim();
      return `\n\n{% button href="${node.getAttribute('href')}" label="${label}" /%}\n\n`;
    },
  });
  td.addRule('emptyParagraph', {
    filter: (node) => node.nodeName === 'P' && !node.textContent.trim() && !node.querySelector('img'),
    replacement: () => '',
  });
  td.addRule('pullquoteCite', {
    filter: 'cite',
    replacement: (content) => (content.trim() ? `\n\n— ${content.trim()}` : ''),
  });
  return td;
}

// Rewrites the HTML in place: downloads uploads, rewrites internal links.
async function rewriteHtml(html, { imageDir }) {
  // Turndown ships a DOM implementation; reuse it for pre-processing.
  const { default: domino } = await import('@mixmark-io/domino');
  const doc = domino.createDocument(`<body>${html}</body>`);

  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = bestSrc(img);
    if (!src) continue;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    if (isUpload(src)) img.setAttribute('src', await localize(src, imageDir));
    else img.setAttribute('src', src);
  }
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = a.getAttribute('href');
    if (isUpload(href)) {
      a.setAttribute('href', await localize(href, isImage(href) ? imageDir : 'files'));
      continue;
    }
    const norm = normalizePath(href);
    if (!norm) continue;
    const mapped = linkMap.get(norm.path) ?? norm.path;
    a.setAttribute('href', mapped + norm.hash);
  }
  return doc.body.innerHTML;
}

function tidyMarkdown(md) {
  return (
    md
      // Markdoc treats {% as tag openers; escape any that aren't ours.
      .replace(/\{%(?!\s*\/?\s*(youtube|button)\b)/g, '\\{%')
      // Icon-only links (social icons, logos) end up empty.
      .replace(/(?<!!)\[\]\([^)]*\)/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, (m) => (m === '  ' ? m : ''))
      .trim() + '\n'
  );
}

const yaml = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`)
    .join('\n');

async function writeEntry(collection, slug, frontmatter, body) {
  const file = path.join(ROOT, 'src/content', collection, `${slug}.mdoc`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `---\n${yaml(frontmatter)}\n---\n\n${body}`);
}

// The media endpoint returns 401 for some attachments, so fall back to the
// post thumbnail in the rendered page.
async function featuredImageUrl(item) {
  const media = item._embedded?.['wp:featuredmedia']?.[0];
  if (media?.source_url) return media.source_url;
  const res = await fetch(item.link, { headers: UA });
  if (!res.ok) return null;
  const img = (await res.text()).match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*>/)?.[0];
  return img?.match(/\ssrc="([^"]+)"/)?.[1] ?? null;
}

// ---- main ------------------------------------------------------------------

async function main() {
  log(`Migrating from ${BASE}`);
  const all = {};
  for (const type of Object.keys(TYPES)) {
    all[type] = await fetchAll(type);
    log(`  ${type}: ${all[type].length}`);
  }

  // Build the link map first so cross-links resolve regardless of order.
  for (const [type, items] of Object.entries(all)) {
    const { oldPrefix, newPrefix } = TYPES[type];
    for (const item of items) {
      const oldPath = `${oldPrefix}${item.slug}/`;
      const newPath = `${newPrefix}${item.slug}/`;
      if (type === 'pages' && item.slug === 'landing-page') continue;
      linkMap.set(oldPath, newPath);
      if (oldPath !== newPath) redirects[oldPath] = newPath;
    }
  }
  linkMap.set('/', '/');
  // Old theme-era URLs that still show up in content.
  linkMap.set('/projects/', '/projecten/');

  const td = makeTurndown();

  for (const [type, items] of Object.entries(all)) {
    const { collection } = TYPES[type];
    for (const item of items) {
      if (type === 'pages' && SKIP_PAGES.has(item.slug)) continue;
      const slug = item.slug;
      const imageDir = `images/${collection}/${slug}`;
      let html = item.content.rendered;
      if (type === 'pages' && LISTING_PAGES[slug]) {
        const cut = html.search(/<div class="gb-grid-wrapper[^"]*gb-query-loop-wrapper/);
        if (cut >= 0) html = html.slice(0, cut);
      }
      const rewritten = await rewriteHtml(html, { imageDir });
      let body = tidyMarkdown(td.turndown(rewritten));

      const title = decode(item.title.rendered);
      // Drop a leading heading that only repeats the title.
      body = body.replace(new RegExp(`^#{1,2} ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`, 'i'), '');

      const fm = { title };
      if (type !== 'pages') fm.date = item.date.slice(0, 10);

      const coverUrl = item.featured_media ? await featuredImageUrl(item) : null;
      if (coverUrl) {
        const ext = path.extname(coverUrl.split('?')[0]).toLowerCase() || '.jpg';
        fm.coverImage = await localize(coverUrl, imageDir, `coverImage${ext}`);
        // The theme already shows the cover, so drop it when the body opens with it.
        const coverFile = path.basename(coverUrl.split('?')[0]).toLowerCase().replace(/\.[a-z0-9]+$/, '');
        body = body.replace(/^!\[[^\]]*\]\(([^)]+)\)\s*\n+/, (m, src) =>
          src === fm.coverImage || path.basename(src).startsWith(coverFile) ? '' : m,
        );
      }
      if (item.excerpt?.rendered && type !== 'pages') {
        const ex = stripTags(item.excerpt.rendered).replace(/\s*\[…\]\s*$|\s*…\s*$/, '…');
        fm.excerpt = ex.length > 280 ? ex.slice(0, 277).replace(/\s+\S*$/, '') + '…' : ex;
      }
      if (type === 'pages' && LISTING_PAGES[slug]) fm.listing = LISTING_PAGES[slug];

      await writeEntry(collection, slug, fm, body);
      log(`  ✓ ${collection}/${slug}`);
    }
  }

  await fs.mkdir(path.join(ROOT, 'src/data'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'src/data/redirects.json'), JSON.stringify(redirects, null, 2) + '\n');
  log(`Wrote ${Object.keys(redirects).length} redirects to src/data/redirects.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
