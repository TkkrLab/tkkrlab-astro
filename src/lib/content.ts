import { createReader } from '@keystatic/core/reader';
import { getCollection, type CollectionEntry } from 'astro:content';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

export const getSettings = async () => (await reader.singletons.settings.readOrThrow());
export const getHome = async () => (await reader.singletons.home.readOrThrow());

export type DatedCollection = 'posts' | 'projects' | 'tools' | 'cybersaturdays';

// Where each collection lives on the site, and its overview page.
export const routes: Record<DatedCollection, { base: string; label: string }> = {
  posts: { base: '/blog/', label: 'Blog' },
  projects: { base: '/projecten/', label: 'Projecten' },
  tools: { base: '/gereedschap/', label: 'Werkplaats' },
  cybersaturdays: { base: '/cybersaturdays/', label: 'Cybersaturdays' },
};

export async function getSorted<C extends DatedCollection>(name: C) {
  const entries = (await getCollection(name)) as CollectionEntry<C>[];
  // Tools read best alphabetically; everything else newest first.
  return name === 'tools'
    ? entries.sort((a, b) => a.data.title.localeCompare(b.data.title, 'nl'))
    : entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
