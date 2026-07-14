import type { Lang } from '../i18n/ui';
import { ui } from '../i18n/ui';
import { decodeRouteSegment, getCategoryRouteSegment, getPostsListUrl } from '../lib/routes';
import { readSessionStorage } from './storage';

type TranslationMapping = Record<string, Partial<Record<Lang, string>>>;
type PostBackConfig = {
  lang: Lang;
  categoryMapping: TranslationMapping;
  tagMapping: TranslationMapping;
  currentCategory: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseConfig(element: HTMLElement): PostBackConfig | null {
  try {
    const value: unknown = JSON.parse(element.textContent || '{}');
    if (!isRecord(value) || typeof value.lang !== 'string' || !(value.lang in ui)) return null;
    return {
      lang: value.lang as Lang,
      categoryMapping: isRecord(value.categoryMapping)
        ? (value.categoryMapping as TranslationMapping)
        : {},
      tagMapping: isRecord(value.tagMapping) ? (value.tagMapping as TranslationMapping) : {},
      currentCategory: typeof value.currentCategory === 'string' ? value.currentCategory : '',
    };
  } catch {
    return null;
  }
}

function getPathLanguage(pathname: string): Lang {
  if (pathname === '/zh-tw' || pathname.startsWith('/zh-tw/')) return 'zh-tw';
  if (pathname === '/zh-cn' || pathname.startsWith('/zh-cn/')) return 'zh-cn';
  return 'en';
}

const configElement = document.querySelector<HTMLElement>('#bb-post-back-config');
const backLink = document.querySelector<HTMLAnchorElement>('#post-back-link');
const config = configElement ? parseConfig(configElement) : null;
const storedPath = readSessionStorage('bb-last-list');

if (config && backLink && storedPath && storedPath !== window.location.pathname) {
  try {
    const lastUrl = new URL(storedPath, window.location.origin);
    if (lastUrl.origin === window.location.origin) {
      let targetPath = `${lastUrl.pathname}${lastUrl.search}${lastUrl.hash}`;
      const lastLanguage = getPathLanguage(lastUrl.pathname);

      if (lastLanguage !== config.lang) {
        const parts = lastUrl.pathname.split('/').filter(Boolean);
        const hasPrefix = parts[0] === 'zh-tw' || parts[0] === 'zh-cn';
        if (parts.includes('categories')) {
          const categoryStart = hasPrefix ? 2 : 1;
          const categoryParts = parts.slice(categoryStart);
          if (/^\d+$/.test(categoryParts.at(-1) ?? '')) categoryParts.pop();
          const decoded = categoryParts.map(decodeRouteSegment);
          if (decoded.every((part): part is string => part !== null)) {
            const source = decoded.join('/');
            const translated = config.categoryMapping[source]?.[config.lang] || config.currentCategory;
            const route = translated
              .split('/')
              .map(getCategoryRouteSegment)
              .filter(Boolean)
              .map(encodeURIComponent)
              .join('/');
            const prefix = config.lang === 'en' ? '' : `/${config.lang}`;
            targetPath = `${prefix}/categories/${route}/1/`;
          }
        } else if (parts.includes('tags')) {
          const source = decodeRouteSegment(parts[hasPrefix ? 2 : 1] ?? '');
          const translated = source ? config.tagMapping[source]?.[config.lang] || source : null;
          targetPath = translated
            ? `${config.lang === 'en' ? '' : `/${config.lang}`}/tags/${encodeURIComponent(translated)}/1/`
            : getPostsListUrl(config.lang, 1);
        } else if (parts.includes('page')) {
          const pageIndex = parts.indexOf('page');
          const parsed = Number.parseInt(parts[pageIndex + 1] ?? '1', 10);
          targetPath = getPostsListUrl(config.lang, Number.isFinite(parsed) ? parsed : 1);
        } else {
          targetPath = getPostsListUrl(config.lang, 1);
        }
      }

      backLink.href = targetPath;
    }
  } catch {
    // Keep the server-rendered fallback link.
  }
}
