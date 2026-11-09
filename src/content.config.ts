import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Keep fields in sync with public/admin/config.yml.
const text = z.string().default('');
const link = z.object({ label: text, href: text });
const links = z.array(link).default([]);

const dated = (name: string) =>
  defineCollection({
    loader: glob({ pattern: '*.mdoc', base: `./src/content/${name}` }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      excerpt: z.string().optional(),
      coverImage: z.string().optional(),
    }),
  });

export const collections = {
  posts: dated('posts'),
  projects: dated('projects'),
  tools: dated('tools'),
  cybersaturdays: dated('cybersaturdays'),
  pages: defineCollection({
    loader: glob({ pattern: '*.mdoc', base: './src/content/pages' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      listing: z.enum(['none', 'posts', 'projects', 'tools', 'cybersaturdays']).default('none'),
    }),
  }),
  // Single-file collections, read through getHome() and getSettings().
  home: defineCollection({
    loader: glob({ pattern: 'home.yaml', base: './src/data' }),
    schema: z.object({
      heroTitle: text,
      heroImage: z.string().optional(),
      heroButton: link.default({ label: '', href: '' }),
      sections: z
        .array(
          z.object({
            title: text,
            body: text,
            image: z.string().optional(),
            dark: z.boolean().default(false),
            buttons: links,
          }),
        )
        .default([]),
    }),
  }),
  settings: defineCollection({
    loader: glob({ pattern: 'settings.yaml', base: './src/data' }),
    schema: z.object({
      navigation: z.array(link.extend({ children: links })).default([]),
      address: text,
      email: text,
      phone: text,
      newsletterUrl: text,
      socials: links,
      spaceApiUrl: text,
    }),
  }),
};
