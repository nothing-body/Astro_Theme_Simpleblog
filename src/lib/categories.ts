import type { Lang } from '../i18n/ui';
import type { BlogPost } from './posts';
import { sortBlogPosts } from './posts';
import { decodeRouteSegments, getCategoryRoutePath, normalizePageNumber } from './routes';
export { getCategoryRoutePath, getCategoryUrl } from './routes';

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
  category?: string | undefined;
  categoryPath?: string[] | undefined;
}): string[] {
  const explicitPath = (data.categoryPath ?? []).map(cleanSegment).filter(Boolean) as string[];
  if (explicitPath.length > 0) return explicitPath;

  const category = cleanSegment(data.category);
  return category ? [category] : ['Uncategorized'];
}

function getPostCategoryPath(post: BlogPost): string[] {
  return getCategoryPathFromData(post.data);
}

export function getNormalizedPostCategoryPath(post: BlogPost): string[] {
  return getPostCategoryPath(post);
}

export function getCategoryPathKey(path: string[]): string {
  return path.map(segment => segment.trim()).filter(Boolean).join(PATH_SEPARATOR);
}

export function categoryPathStartsWith(path: string[], prefix: string[]): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every((segment, index) => path[index] === segment);
}

function localeForSort(lang: Lang): string {
  if (lang === 'zh-tw') return 'zh-Hant-TW';
  if (lang === 'zh-cn') return 'zh-Hans-CN';
  return 'en';
}

export function buildCategoryTree(
  posts: BlogPost[],
  lang: Lang,
  activePath: string[] = []
): CategoryTreeNode[] {
  const roots: CategoryTreeNode[] = [];
  const nodeMap = new Map<string, CategoryTreeNode>();
  const activeKey = activePath.length > 0 ? getCategoryPathKey(activePath) : undefined;

  for (const post of posts) {
    const path = getNormalizedPostCategoryPath(post);
    const seenForPost = new Set<string>();

    for (let depth = 1; depth <= path.length; depth += 1) {
      const nodePath = path.slice(0, depth);
      const pathKey = getCategoryPathKey(nodePath);
      if (seenForPost.has(pathKey)) continue;
      seenForPost.add(pathKey);

      let node = nodeMap.get(pathKey);
      if (!node) {
        const label = nodePath.at(-1);
        if (!label) continue;
        const createdNode: CategoryTreeNode = {
          label,
          path: nodePath,
          pathKey,
          count: 0,
          containsActive: false,
          children: [],
        };
        node = createdNode;
        nodeMap.set(pathKey, createdNode);

        if (depth === 1) {
          roots.push(createdNode);
        } else {
          const parentKey = getCategoryPathKey(nodePath.slice(0, -1));
          const parent = nodeMap.get(parentKey);
          parent?.children.push(createdNode);
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
  pageSize: number
): CategoryPageEntry[] {
  const categoryMap = new Map<string, { path: string[]; posts: BlogPost[] }>();

  for (const post of posts) {
    const path = getNormalizedPostCategoryPath(post);
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
  const encodedSegments = (routePath ?? '').split('/').filter(Boolean);
  const segments = decodeRouteSegments(encodedSegments) ?? [];
  const pageSegment = segments.at(-1);
  const page = pageSegment && /^\d+$/.test(pageSegment)
    ? normalizePageNumber(Number(pageSegment))
    : 1;
  const path = pageSegment && /^\d+$/.test(pageSegment) ? segments.slice(0, -1) : segments;

  return { path, page };
}
