import type { Lang } from '../i18n/ui';

export function formatDate(date: Date, lang: Lang = 'zh-tw'): string {
  const locale = lang === 'en' ? 'en-GB' : lang === 'zh-cn' ? 'zh-CN' : 'zh-TW';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getCleanSlug(postId: string): string {
  return postId.replace(/\.md$/, '').replace(/^(zh-tw|en|zh-cn)\//, '');
}

export function getPostUrl(slug: string, lang: Lang): string {
  const cleanSlug = slug.replace(/^(zh-tw|en|zh-cn)\//, '').replace(/\.md$/, '');
  const segments = cleanSlug.split('/').filter(Boolean);
  if (segments.length === 0 || segments.some(segment => segment === '.' || segment === '..')) {
    throw new Error(`Invalid post slug: ${slug}`);
  }
  const encodedSlug = segments.map(encodeURIComponent).join('/');
  return lang === 'en' ? `/posts/${encodedSlug}` : `/${lang}/posts/${encodedSlug}`;
}

export function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/[*~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function summarizePlainText(value: string, maxLen: number): string {
  const lead = value
    .replace(/\r\n?/g, '\n')
    .split(
      /\n\s*\n|(?:^|\s)>|(?:^|\s)\u524d\u7f6e\u689d\u4ef6|(?:^|\s)\u524d\u7f6e\u6761\u4ef6|(?:^|\s)Prerequisites/i
    )[0]
    ?.trim();

  return truncate(stripMarkdown(lead || value), maxLen);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen).trimEnd()}...`;
}

export function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
