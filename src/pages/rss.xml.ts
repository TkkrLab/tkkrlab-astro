import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getSorted } from '../lib/content';

export async function GET(context: APIContext) {
  const posts = await getSorted('posts');
  return rss({
    title: 'TkkrLab',
    description: 'Nieuws van TkkrLab, de hackerspace van Enschede',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      link: `/blog/${post.id}/`,
    })),
  });
}
