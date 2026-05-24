import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

const DEFAULT_PIN_ORDER = 9999;

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
