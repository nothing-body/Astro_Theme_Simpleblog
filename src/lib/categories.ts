import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { defaultLang } from '../i18n/ui';
import { sortBlogPosts } from './posts';

export type BlogPost = CollectionEntry<'blog'>;

const PATH_SEPARATOR = '\u001f';

export interface CategoryTreeNode {
  label: string;
  path: string[];
  pathKey: string;
  count: number;
  containsActive: boolean;
  children: CategoryTreeNode[];
}

export interface CategoryPageEntry {
  path: string[];
  pathKey: string;
  routePath: string;
  posts: BlogPost[];
  totalPages: number;
}

function cleanSegment(segment: unknown): string | undefined {
  if (typeof segment !== 'string') return undefined;
  const cleaned = segment.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function getCategoryPathFromData(data: {
  category?: string;
  categoryPath?: string[];
}): string[] {
  const explicitPath = (data.categoryPath ?? []).map(cleanSegment).filter(Boolean) as string[];
  if (explicitPath.length > 0) return explicitPath;

  const category = cleanSegment(data.category);
  return category ? [category] : ['Uncategorized'];
}

export function getPostCategoryPath(post: BlogPost): string[] {
  return getCategoryPathFromData(post.data);
}

function getPostRelativeId(post: BlogPost): string {
  return post.id.split('/').slice(1).join('/');
}

function getPostLang(post: BlogPost): string {
  return post.id.split('/')[0] ?? '';
}

function getCategoryReferenceRank(post: BlogPost): number {
  const lang = getPostLang(post);
  if (lang === defaultLang) return 0;
  if (lang === 'zh-tw') return 1;
  if (lang === 'zh-cn') return 2;
  return 3;
}

export function getNormalizedPostCategoryPath(
  post: BlogPost,
  allPosts: BlogPost[] = []
): string[] {
  const ownPath = getPostCategoryPath(post);
  const relativeId = getPostRelativeId(post);
  if (!relativeId || allPosts.length === 0) return ownPath;

  const referencePost = allPosts
    .filter(candidate => getPostRelativeId(candidate) === relativeId)
    .sort((a, b) => {
      const lengthDiff = getPostCategoryPath(b).length - getPostCategoryPath(a).length;
      if (lengthDiff !== 0) return lengthDiff;

      const rankDiff = getCategoryReferenceRank(a) - getCategoryReferenceRank(b);
      if (rankDiff !== 0) return rankDiff;

      return a.id.localeCompare(b.id);
    })[0];

  const referencePath = referencePost ? getPostCategoryPath(referencePost) : ownPath;

  if (ownPath.length >= referencePath.length) return ownPath;
  return [...ownPath, ...referencePath.slice(ownPath.length)];
}

export function getCategoryPathKey(path: string[]): string {
  return path.map(segment => segment.trim()).filter(Boolean).join(PATH_SEPARATOR);
}

export function categoryPathStartsWith(path: string[], prefix: string[]): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every((segment, index) => path[index] === segment);
}

export function getCategoryRouteSegment(segment: string): string {
  return segment
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getCategoryRoutePath(path: string[]): string {
  return path.map(getCategoryRouteSegment).filter(Boolean).join('/');
}

export function getCategoryUrl(lang: Lang, path: string[], page = 1): string {
  const prefix = lang === defaultLang ? '' : `/${lang}`;
  const encodedPath = getCategoryRoutePath(path)
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `${prefix}/categories/${encodedPath}/${page}`;
}

function localeForSort(lang: Lang): string {
  if (lang === 'zh-tw') return 'zh-Hant-TW';
  if (lang === 'zh-cn') return 'zh-Hans-CN';
  return 'en';
}

export function buildCategoryTree(
  posts: BlogPost[],
  lang: Lang,
  activePath: string[] = [],
  allPosts: BlogPost[] = posts
): CategoryTreeNode[] {
  const roots: CategoryTreeNode[] = [];
  const nodeMap = new Map<string, CategoryTreeNode>();
  const activeKey = activePath.length > 0 ? getCategoryPathKey(activePath) : undefined;

  for (const post of posts) {
    const path = getNormalizedPostCategoryPath(post, allPosts);
    const seenForPost = new Set<string>();

    for (let depth = 1; depth <= path.length; depth += 1) {
      const nodePath = path.slice(0, depth);
      const pathKey = getCategoryPathKey(nodePath);
      if (seenForPost.has(pathKey)) continue;
      seenForPost.add(pathKey);

      let node = nodeMap.get(pathKey);
      if (!node) {
        node = {
          label: nodePath[nodePath.length - 1],
          path: nodePath,
          pathKey,
          count: 0,
          containsActive: false,
          children: [],
        };
        nodeMap.set(pathKey, node);

        if (depth === 1) {
          roots.push(node);
        } else {
          const parentKey = getCategoryPathKey(nodePath.slice(0, -1));
          const parent = nodeMap.get(parentKey);
          parent?.children.push(node);
        }
      }

      node.count += 1;
    }
  }

  for (const node of nodeMap.values()) {
    node.containsActive =
      Boolean(activeKey) &&
      (node.pathKey === activeKey || categoryPathStartsWith(activePath, node.path));
  }

  const collator = new Intl.Collator(localeForSort(lang));
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => collator.compare(a.label, b.label));
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);

  return roots;
}

export function getCategoryPageEntries(
  posts: BlogPost[],
  pageSize: number,
  allPosts: BlogPost[] = posts
): CategoryPageEntry[] {
  const categoryMap = new Map<string, { path: string[]; posts: BlogPost[] }>();

  for (const post of posts) {
    const path = getNormalizedPostCategoryPath(post, allPosts);
    for (let depth = 1; depth <= path.length; depth += 1) {
      const nodePath = path.slice(0, depth);
      const pathKey = getCategoryPathKey(nodePath);
      if (!categoryMap.has(pathKey)) {
        categoryMap.set(pathKey, { path: nodePath, posts: [] });
      }
      categoryMap.get(pathKey)?.posts.push(post);
    }
  }

  return [...categoryMap.entries()].map(([pathKey, entry]) => {
    const sortedPosts = sortBlogPosts(entry.posts);
    return {
      path: entry.path,
      pathKey,
      routePath: getCategoryRoutePath(entry.path),
      posts: sortedPosts,
      totalPages: Math.max(1, Math.ceil(sortedPosts.length / pageSize)),
    };
  });
}

export function parseCategoryRoutePath(routePath: string | undefined): {
  path: string[];
  page: number;
} {
  const segments = (routePath ?? '').split('/').map(decodeURIComponent).filter(Boolean);
  const pageSegment = segments.at(-1);
  const page = pageSegment && /^\d+$/.test(pageSegment) ? Number(pageSegment) : 1;
  const path = pageSegment && /^\d+$/.test(pageSegment) ? segments.slice(0, -1) : segments;

  return { path, page };
}
