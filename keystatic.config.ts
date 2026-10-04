import { collection, config, fields, singleton } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

// Storage: lokaal (bestanden in deze repo) tijdens `npm run dev`.
// Zet PUBLIC_KEYSTATIC_GITHUB_REPO=<owner>/<repo> om via GitHub te bewerken,
// dan maakt elke wijziging in /keystatic een commit (of PR) aan.
const githubRepo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as `${string}/${string}` | undefined;

// Markdoc-tags die ook in markdoc.config.mjs gerenderd worden.
const components = {
  button: block({
    label: 'Knop',
    schema: {
      label: fields.text({ label: 'Tekst', validation: { length: { min: 1 } } }),
      href: fields.text({ label: 'Link', description: 'Bijv. /deelnemer-worden/ of https://…' }),
    },
  }),
  youtube: block({
    label: 'YouTube video',
    schema: {
      id: fields.text({ label: 'Video ID', description: 'Het stukje na watch?v= in de YouTube-URL' }),
    },
  }),
};

// Inline afbeeldingen in de tekst komen in public/images/<collectie>/<slug>/.
const content = (collectionName: string) =>
  fields.markdoc({
    label: 'Inhoud',
    options: {
      image: {
        directory: `public/images/${collectionName}`,
        publicPath: `/images/${collectionName}/`,
      },
    },
    components,
  });

const coverImage = (collectionName: string) =>
  fields.image({
    label: 'Uitgelichte afbeelding',
    directory: `public/images/${collectionName}`,
    publicPath: `/images/${collectionName}/`,
  });

const dated = (collectionName: string, label: string, extra = {}) =>
  collection({
    label,
    slugField: 'title',
    path: `src/content/${collectionName}/*`,
    format: { contentField: 'content' },
    entryLayout: 'content',
    columns: ['title', 'date'],
    schema: {
      title: fields.slug({ name: { label: 'Titel' } }),
      date: fields.date({ label: 'Datum', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
      excerpt: fields.text({ label: 'Samenvatting', description: 'Korte tekst voor overzichtspagina’s', multiline: true }),
      coverImage: coverImage(collectionName),
      ...extra,
      content: content(collectionName),
    },
  });

const link = fields.object({
  label: fields.text({ label: 'Tekst' }),
  href: fields.text({ label: 'Link' }),
});

export default config({
  storage: githubRepo ? { kind: 'github', repo: githubRepo } : { kind: 'local' },
  ui: {
    brand: { name: 'TkkrLab' },
    navigation: {
      Inhoud: ['posts', 'pages', 'projects', 'tools', 'cybersaturdays'],
      Instellingen: ['home', 'settings'],
    },
  },
  collections: {
    posts: dated('posts', 'Blog'),
    projects: dated('projects', 'Projecten'),
    tools: dated('tools', 'Gereedschap'),
    cybersaturdays: dated('cybersaturdays', 'Cybersaturdays'),
    pages: collection({
      label: 'Pagina’s',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        description: fields.text({ label: 'Omschrijving (SEO)', multiline: true }),
        listing: fields.select({
          label: 'Overzicht onder de tekst',
          description: 'Toon automatisch een lijst van items onder deze pagina',
          defaultValue: 'none',
          options: [
            { label: 'Geen', value: 'none' },
            { label: 'Blog', value: 'posts' },
            { label: 'Projecten', value: 'projects' },
            { label: 'Gereedschap', value: 'tools' },
            { label: 'Cybersaturdays', value: 'cybersaturdays' },
          ],
        }),
        content: content('pages'),
      },
    }),
  },
  singletons: {
    home: singleton({
      label: 'Homepage',
      path: 'src/data/home',
      format: 'yaml',
      schema: {
        heroTitle: fields.text({ label: 'Titel' }),
        heroImage: fields.image({ label: 'Achtergrondfoto', directory: 'public/images/home', publicPath: '/images/home/' }),
        heroButton: link,
        sections: fields.array(
          fields.object({
            title: fields.text({ label: 'Titel' }),
            body: fields.text({ label: 'Tekst', multiline: true, description: 'Lege regel = nieuwe alinea' }),
            image: fields.image({ label: 'Afbeelding', directory: 'public/images/home', publicPath: '/images/home/' }),
            dark: fields.checkbox({ label: 'Donkere achtergrond' }),
            buttons: fields.array(link, { label: 'Knoppen', itemLabel: (p) => p.fields.label.value }),
          }),
          { label: 'Secties', itemLabel: (p) => p.fields.title.value },
        ),
      },
    }),
    settings: singleton({
      label: 'Site-instellingen',
      path: 'src/data/settings',
      format: 'yaml',
      schema: {
        navigation: fields.array(
          fields.object({
            label: fields.text({ label: 'Tekst' }),
            href: fields.text({ label: 'Link' }),
            children: fields.array(link, { label: 'Submenu', itemLabel: (p) => p.fields.label.value }),
          }),
          { label: 'Menu', itemLabel: (p) => p.fields.label.value },
        ),
        address: fields.text({ label: 'Adres (footer)', multiline: true }),
        email: fields.text({ label: 'E-mail' }),
        phone: fields.text({ label: 'Telefoon' }),
        newsletterUrl: fields.text({ label: 'Aanmeldlink nieuwsbrief' }),
        socials: fields.array(link, { label: 'Socials', itemLabel: (p) => p.fields.label.value }),
        spaceApiUrl: fields.text({ label: 'SpaceAPI URL', description: 'Voor de open/dicht status in de header' }),
      },
    }),
  },
});
