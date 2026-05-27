import { getCollection } from 'astro:content';
import { ui, defaultLang, type Lang, type TranslationKey } from './ui';

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

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, targetLang: Lang = lang): string {
    if (targetLang === defaultLang) {
      return path;
    }
    if (path === '/') {
      return `/${targetLang}`;
    }
    return `/${targetLang}${path}`;
  };
}

export async function getDynamicCategoryMapping(): Promise<Record<string, Record<string, string>>> {
  const allPosts = await getCollection('blog');
  const mapping: Record<string, Record<string, string>> = {};
  const postsByPath: Record<string, Record<string, string>> = {};

  for (const post of allPosts) {
    const parts = post.id.split('/');
    if (parts.length < 2) continue;

    const locale = parts[0];
    const relativePath = parts.slice(1).join('/');

    postsByPath[relativePath] ??= {};

    if (locale && locale in ui) {
      postsByPath[relativePath][locale] = post.data.category;
    }
  }

  for (const categoriesByLang of Object.values(postsByPath)) {
    for (const [, catA] of Object.entries(categoriesByLang)) {
      mapping[catA] ??= {};
      for (const [langB, catB] of Object.entries(categoriesByLang)) {
        mapping[catA][langB] = catB;
      }
    }
  }

  return mapping;
}

export async function getTargetLangPath(
  currentUrl: URL,
  targetLang: Lang,
  categoryMapping: Record<string, Record<string, string>>
): Promise<string> {
  const allPosts = await getCollection('blog');
  const targetPosts = allPosts.filter(p => p.id.startsWith(`${targetLang}/`));
  const parts = currentUrl.pathname.split('/').filter(Boolean);

  if (parts[0] && parts[0] in ui && parts[0] !== defaultLang) {
    parts.shift();
  }

  if (parts[0] === 'categories' && parts[1]) {
    const currentCat = decodeURIComponent(parts[1]);
    const targetCat = categoryMapping[currentCat]?.[targetLang];

    if (targetCat) {
      const hasPosts = targetPosts.some(p => p.data.category === targetCat);
      if (hasPosts) {
        const basePath = `/categories/${encodeURIComponent(targetCat)}/1`;
        return targetLang === defaultLang ? basePath : `/${targetLang}${basePath}`;
      }
    }
    return targetLang === defaultLang ? '/no-category' : `/${targetLang}/no-category`;
  }

  if (parts[0] === 'tags' && parts[1]) {
    const currentTag = decodeURIComponent(parts[1]);
    const hasPosts = targetPosts.some(p => p.data.tags.includes(currentTag));
    if (hasPosts) {
      const basePath = `/tags/${encodeURIComponent(currentTag)}/1`;
      return targetLang === defaultLang ? basePath : `/${targetLang}${basePath}`;
    }
    return targetLang === defaultLang ? '/no-category' : `/${targetLang}/no-category`;
  }

  const basePath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
  if (targetLang === defaultLang) {
    return basePath;
  }
  return basePath === '/' ? `/${targetLang}` : `/${targetLang}${basePath}`;
}
