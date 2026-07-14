import { getCollection } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { getCategoryPageEntries } from './categories';
import { getTotalPages, POSTS_PAGE_SIZE, sortBlogPosts } from './posts';

export async function getCategoryArchiveStaticPaths(lang: Lang) {
  const allPosts = await getCollection(
    'blog',
    ({ id, data }) => id.startsWith(`${lang}/`) && !data.draft
  );
  return getCategoryPageEntries(allPosts, POSTS_PAGE_SIZE).flatMap(entry =>
    Array.from({ length: entry.totalPages }, (_, index) => ({
      params: { categoryPath: `${entry.routePath}/${index + 1}` },
      props: {
        allPosts,
        categoryPosts: entry.posts,
        currentCategoryPath: entry.path,
        totalPages: entry.totalPages,
      },
    }))
  );
}

export async function getTagArchiveStaticPaths(lang: Lang) {
  const allPosts = await getCollection(
    'blog',
    ({ id, data }) => id.startsWith(`${lang}/`) && !data.draft
  );
  const postsByTag = new Map<string, typeof allPosts>();
  for (const post of allPosts) {
    for (const tag of post.data.tags) {
      const posts = postsByTag.get(tag) ?? [];
      posts.push(post);
      postsByTag.set(tag, posts);
    }
  }

  return [...postsByTag].flatMap(([tag, posts]) => {
    const tagPosts = sortBlogPosts(posts);
    const totalPages = getTotalPages(tagPosts.length);
    return Array.from({ length: totalPages }, (_, index) => ({
      params: { tag, page: String(index + 1) },
      props: { allPosts, tagPosts, currentTag: tag, totalPages },
    }));
  });
}
