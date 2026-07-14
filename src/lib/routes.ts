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

/** 文章列表導覽 URL（第 1 頁用 /posts，其餘用 /page/N）。 */
export function getPostsListUrl(lang: Lang, page = 1): string {
  const prefix = localePrefix(lang);
  const pageNumber = Number(page);
  if (!Number.isFinite(pageNumber) || pageNumber <= 1) {
    return `${prefix}/posts`;
  }
  return `${prefix}/page/${pageNumber}`;
}

/** Canonical 用分頁路徑（一律 /page/N，含第 1 頁）。 */
export function getPostsPageUrl(lang: Lang, page = 1): string {
  const prefix = localePrefix(lang);
  const pageNumber = Math.max(1, Number(page) || 1);
  return `${prefix}/page/${pageNumber}/`;
}

/** 標籤列表分頁 URL。 */
export function getTagListUrl(lang: Lang, tag: string, page = 1): string {
  const prefix = localePrefix(lang);
  const pageNumber = Math.max(1, Number(page) || 1);
  return `${prefix}/tags/${encodeURIComponent(tag)}/${pageNumber}/`;
}
