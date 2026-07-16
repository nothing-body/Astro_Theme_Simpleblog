import { ui, defaultLang, type Lang, type TranslationKey } from './ui';
import {
  categoryPathStartsWith,
  getCategoryRoutePath,
  getCategoryUrl,
  getNormalizedPostCategoryPath,
} from '../lib/categories';
import { POSTS_PAGE_SIZE, getTotalPages, type BlogPost } from '../lib/posts';
import {
  decodeRouteSegment,
  decodeRouteSegments,
  getPostsListUrl,
  getPostsPageUrl,
  getTagListUrl,
  stripLocalePathParts,
} from '../lib/routes';
import { getCleanSlug, getPostUrl } from '../lib/utils';
import type { LanguageRoute } from '../types';

export function getLangFromUrl(url: URL): Lang {
  const [, firstSegment] = url.pathname.split('/');
  if (firstSegment && firstSegment in ui) {
    return firstSegment as Lang;
  }
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey): string {
    return (ui[lang][key] ?? ui[defaultLang][key]) as string;
  };
}

export function formatTranslation(
  template: string,
  values: Readonly<Record<string, string | number>>
): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match
  );
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, targetLang: Lang = lang): string {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error(`Translated paths must be site-relative: ${path}`);
    }
    if (targetLang === defaultLang) {
      return path;
    }
    if (path === '/') {
      return `/${targetLang}`;
    }
    return `/${targetLang}${path}`;
  };
}

export function buildDynamicCategoryMapping(
  allPosts: BlogPost[]
): Record<string, Record<string, string>> {
  const mapping: Record<string, Record<string, string>> = {};
  const postsByPath: Record<string, Record<string, string>> = {};

  const addCategoryMapping = (sourcePath: string[], targetLang: string, targetPath: string[]) => {
    if (sourcePath.length === 0 || targetPath.length === 0) return;

    const sourceLabel = sourcePath.join('/');
    const sourceRoute = getCategoryRoutePath(sourcePath);
    const targetLabel = targetPath.join('/');

    const labelMapping = (mapping[sourceLabel] ??= {});
    const routeMapping = (mapping[sourceRoute] ??= {});

    for (const current of [labelMapping[targetLang], routeMapping[targetLang]]) {
      if (current && current !== targetLabel) {
        throw new Error(
          `Conflicting category translation for '${sourceLabel}' (${targetLang}): '${current}' and '${targetLabel}'.`
        );
      }
    }

    labelMapping[targetLang] = targetLabel;
    routeMapping[targetLang] = targetLabel;
  };

  for (const post of allPosts) {
    const parts = post.id.split('/');
    if (parts.length < 2) continue;

    const locale = parts[0];
    const relativePath = parts.slice(1).join('/');

    postsByPath[relativePath] ??= {};

    if (locale && locale in ui) {
      postsByPath[relativePath][locale] = getNormalizedPostCategoryPath(post).join('/');
    }
  }

  for (const categoriesByLang of Object.values(postsByPath)) {
    for (const [, catA] of Object.entries(categoriesByLang)) {
      const sourceSegments = catA.split('/').filter(Boolean);

      for (let depth = 1; depth <= sourceSegments.length; depth += 1) {
        const sourcePrefix = sourceSegments.slice(0, depth);

        for (const [langB, catB] of Object.entries(categoriesByLang)) {
          const targetSegments = catB.split('/').filter(Boolean);
          const targetPrefix = targetSegments.slice(0, depth);

          if (targetPrefix.length === depth) {
            addCategoryMapping(sourcePrefix, langB, targetPrefix);
          }
        }
      }
    }
  }

  return mapping;
}

export function buildDynamicTagMapping(
  allPosts: BlogPost[]
): Record<string, Record<string, string>> {
  const mapping: Record<string, Record<string, string>> = {};
  const postsByPath = new Map<string, Partial<Record<Lang, BlogPost>>>();

  for (const post of allPosts) {
    const [locale, ...relativeParts] = post.id.split('/');
    if (!locale || !(locale in ui) || relativeParts.length === 0) continue;

    const relativePath = relativeParts.join('/');
    const translations = postsByPath.get(relativePath) ?? {};
    translations[locale as Lang] = post;
    postsByPath.set(relativePath, translations);
  }

  for (const translations of postsByPath.values()) {
    for (const sourcePost of Object.values(translations)) {
      if (!sourcePost) continue;

      sourcePost.data.tags.forEach((sourceTag, index) => {
        const targetByLanguage = (mapping[sourceTag] ??= {});

        for (const [targetLang, targetPost] of Object.entries(translations)) {
          const targetTag = targetPost?.data.tags[index];
          if (!targetTag) continue;
          const current = targetByLanguage[targetLang];
          if (current && current !== targetTag) {
            throw new Error(
              `Conflicting tag translation for '${sourceTag}' (${targetLang}): '${current}' and '${targetTag}'.`
            );
          }
          targetByLanguage[targetLang] = targetTag;
        }
      });
    }
  }

  return mapping;
}

function unavailableRoute(targetLang: Lang): LanguageRoute {
  const path = targetLang === defaultLang ? '/no-category' : `/${targetLang}/no-category`;
  return { path, canonicalPath: path, available: false };
}

function route(path: string, canonicalPath = path): LanguageRoute {
  const normalizedCanonical =
    canonicalPath === '/' || canonicalPath.endsWith('/') ? canonicalPath : `${canonicalPath}/`;
  return { path, canonicalPath: normalizedCanonical, available: true };
}

export function getTargetLangRoute(
  currentUrl: URL,
  targetLang: Lang,
  categoryMapping: Record<string, Record<string, string>>,
  tagMapping: Record<string, Record<string, string>>,
  allPosts: BlogPost[]
): LanguageRoute {
  const targetPosts = allPosts.filter(p => p.id.startsWith(`${targetLang}/`));
  const parts = stripLocalePathParts(currentUrl.pathname.split('/').filter(Boolean));

  if (parts[0] === 'posts' && parts.length > 1) {
    const slugParts = decodeRouteSegments(parts.slice(1));
    if (!slugParts) return unavailableRoute(targetLang);
    const slug = slugParts.join('/');
    const targetPost = targetPosts.find(post => getCleanSlug(post.id) === slug);
    return targetPost ? route(getPostUrl(targetPost.id, targetLang)) : unavailableRoute(targetLang);
  }

  if (parts[0] === 'posts') {
    return route(getPostsListUrl(targetLang, 1));
  }

  if (parts[0] === 'page' && parts[1] && /^\d+$/.test(parts[1])) {
    const page = Math.min(Number(parts[1]), getTotalPages(targetPosts.length));
    return route(getPostsPageUrl(targetLang, page));
  }

  if (parts[0] === 'categories' && parts[1]) {
    const categoryParts = parts.slice(1);
    const lastPart = categoryParts.at(-1);
    const pathParts = lastPart && /^\d+$/.test(lastPart) ? categoryParts.slice(0, -1) : categoryParts;
    const decodedPath = decodeRouteSegments(pathParts);
    if (!decodedPath) return unavailableRoute(targetLang);
    const currentCat = decodedPath.join('/');
    const targetCat = categoryMapping[currentCat]?.[targetLang];

    if (targetCat) {
      const targetPath = targetCat.split('/').filter(Boolean);
      const hasPosts = targetPosts.some(p =>
        categoryPathStartsWith(getNormalizedPostCategoryPath(p), targetPath)
      );
      if (hasPosts) {
        const requestedPage = lastPart && /^\d+$/.test(lastPart) ? Number(lastPart) : 1;
        const matchingPosts = targetPosts.filter(p =>
          categoryPathStartsWith(getNormalizedPostCategoryPath(p), targetPath)
        );
        const page = Math.min(requestedPage, getTotalPages(matchingPosts.length, POSTS_PAGE_SIZE));
        return route(getCategoryUrl(targetLang, targetPath, page));
      }
    }
    return unavailableRoute(targetLang);
  }

  if (parts[0] === 'tags' && parts[1]) {
    const currentTag = decodeRouteSegment(parts[1]);
    if (!currentTag) return unavailableRoute(targetLang);
    const targetTag = targetPosts.some(p => p.data.tags.includes(currentTag))
      ? currentTag
      : tagMapping[currentTag]?.[targetLang];
    const matchingPosts = targetTag
      ? targetPosts.filter(p => p.data.tags.includes(targetTag))
      : [];
    if (targetTag && matchingPosts.length > 0) {
      const requestedPage = parts[2] && /^\d+$/.test(parts[2]) ? Number(parts[2]) : 1;
      const page = Math.min(requestedPage, getTotalPages(matchingPosts.length, POSTS_PAGE_SIZE));
      return route(getTagListUrl(targetLang, targetTag, page));
    }
    return unavailableRoute(targetLang);
  }

  const basePath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
  if (targetLang === defaultLang) {
    return route(basePath);
  }
  return route(basePath === '/' ? `/${targetLang}` : `/${targetLang}${basePath}`);
}
