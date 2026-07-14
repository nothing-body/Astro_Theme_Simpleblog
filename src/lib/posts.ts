import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type BlogPost = CollectionEntry<'blog'>;

export const POSTS_PAGE_SIZE = 5;

const DEFAULT_PIN_ORDER = 9999;

export async function getPublishedPostsForLang(lang: Lang): Promise<BlogPost[]> {
  const allPosts = await getCollection(
    'blog',
    ({ id, data }) => id.startsWith(`${lang}/`) && !data.draft
  );
  return sortBlogPosts(allPosts);
}

export async function getRecentPostsForLang(lang: Lang, limit = 3): Promise<BlogPost[]> {
  const posts = await getPublishedPostsForLang(lang);
  return posts.slice(0, limit);
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

export function getTotalPages(itemCount: number, pageSize = POSTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function paginatePosts<T>(items: T[], page: number, pageSize = POSTS_PAGE_SIZE): T[] {
  const currentPage = Math.max(1, Number(page) || 1);
  return items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
}

export async function getPostsPageStaticPaths(lang: Lang) {
  const allPosts = await getPublishedPostsForLang(lang);
  const totalPages = getTotalPages(allPosts.length);

  return Array.from({ length: totalPages }, (_, index) => ({
    params: { page: String(index + 1) },
    props: { totalPages, allPosts },
  }));
}
