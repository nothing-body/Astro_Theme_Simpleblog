import { defaultLang, ui, type Lang } from '../i18n/ui';

/** 移除路徑中的語系前綴（含 legacy /en）。 */
export function stripLocalePathParts(parts: string[]): string[] {
  const next = [...parts];
  if (next[0] === 'en') {
    next.shift();
  } else if (next[0] && next[0] in ui && next[0] !== defaultLang) {
    next.shift();
  }
  return next;
}

function localePrefix(lang: Lang): string {
  return lang === defaultLang ? '' : `/${lang}`;
}

export function normalizePageNumber(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function decodeRouteSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function decodeRouteSegments(segments: string[]): string[] | null {
  const decoded = segments.map(decodeRouteSegment);
  return decoded.every((segment): segment is string => segment !== null) ? decoded : null;
}

/** Convert a category label to a stable, URL-safe path segment before encoding. */
export function getCategoryRouteSegment(segment: string): string {
  return segment
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 文章列表導覽 URL（第 1 頁用 /posts，其餘用 /page/N）。 */
export function getPostsListUrl(lang: Lang, page = 1): string {
  const prefix = localePrefix(lang);
  const pageNumber = normalizePageNumber(page);
  if (pageNumber === 1) {
    return `${prefix}/posts`;
  }
  return `${prefix}/page/${pageNumber}`;
}

/** Canonical 分頁 URL；第 1 頁維持唯一入口 /posts。 */
export function getPostsPageUrl(lang: Lang, page = 1): string {
  return `${getPostsListUrl(lang, page)}/`;
}

/** 標籤列表分頁 URL。 */
export function getTagListUrl(lang: Lang, tag: string, page = 1): string {
  if (!tag.trim()) throw new Error('Tag routes require a non-empty tag.');
  const prefix = localePrefix(lang);
  const pageNumber = normalizePageNumber(page);
  return `${prefix}/tags/${encodeURIComponent(tag)}/${pageNumber}/`;
}
