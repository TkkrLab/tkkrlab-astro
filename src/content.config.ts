import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// These read the files Keystatic writes; keep fields in sync with keystatic.config.ts.
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
};
