import { defaultLang, ui, type Lang } from '../i18n/ui';

/** 移除路徑中的語系前綴（含 legacy /en）。 */
export function stripLocalePathParts(parts: string[]): string[] {
  const next = [...parts];
  if (next[0] && next[0] in ui && next[0] !== defaultLang) {
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

function isUnsafeRouteCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return (
    character === '/' ||
    character === '\\' ||
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

export function decodeRouteSegment(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment).normalize('NFC');
    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      [...decoded].some(isUnsafeRouteCharacter)
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function decodeRouteSegments(segments: string[]): string[] | null {
  const decoded = segments.map(decodeRouteSegment);
  return decoded.every((segment): segment is string => segment !== null) ? decoded : null;
}

/** Convert a category label to a stable, URL-safe path segment before encoding. */
function getCategoryRouteSegment(segment: string): string {
  return segment
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getCategoryRoutePath(categoryPath: string[]): string {
  const segments = categoryPath.map(getCategoryRouteSegment);
  if (segments.some(segment => !segment)) {
    throw new Error(
      `Category path contains a segment with no URL-safe characters: ${categoryPath.join(' / ')}`
    );
  }
  return segments.join('/');
}

export function getCategoryUrl(lang: Lang, categoryPath: string[], page = 1): string {
  if (categoryPath.length === 0) throw new Error('Category routes require at least one segment.');
  const prefix = localePrefix(lang);
  const encodedPath = getCategoryRoutePath(categoryPath)
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `${prefix}/categories/${encodedPath}/${normalizePageNumber(page)}/`;
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
  const normalizedTag = tag.trim().normalize('NFC');
  if (
    !normalizedTag ||
    [...normalizedTag].some(isUnsafeRouteCharacter)
  ) {
    throw new Error('Tag routes require a safe, non-empty single segment.');
  }
  const prefix = localePrefix(lang);
  const pageNumber = normalizePageNumber(page);
  return `${prefix}/tags/${encodeURIComponent(normalizedTag)}/${pageNumber}/`;
}
