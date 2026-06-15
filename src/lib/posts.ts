import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type BlogLang = 'en' | 'zh-tw' | 'zh-cn';

const DEFAULT_PIN_ORDER = 9999;

export async function getRecentPostsForLang(lang: BlogLang, limit = 3): Promise<BlogPost[]> {
  const allPosts = await getCollection(
    'blog',
    ({ id, data }) => id.startsWith(`${lang}/`) && !data.draft
  );
  return sortBlogPosts(allPosts).slice(0, limit);
}

export function sortBlogPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const aPinned = Boolean(a.data.pinned);
    const bPinned = Boolean(b.data.pinned);

    if (aPinned !== bPinned) return Number(bPinned) - Number(aPinned);

    if (aPinned && bPinned) {
      const orderDiff =
        (a.data.pinOrder ?? DEFAULT_PIN_ORDER) - (b.data.pinOrder ?? DEFAULT_PIN_ORDER);
      if (orderDiff !== 0) return orderDiff;
    }

    return b.data.pubDate.getTime() - a.data.pubDate.getTime();
  });
}
