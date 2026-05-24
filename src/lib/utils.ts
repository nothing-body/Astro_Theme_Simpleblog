export type SupportedLang = 'zh-tw' | 'en' | 'zh-cn';

export function estimateReadingTime(content: string, lang: SupportedLang = 'zh-tw'): number {
  const wordsPerMinute = lang === 'en' ? 200 : 300;
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_~>|]/g, '')
    .trim();

  return Math.max(1, Math.ceil(plainText.length / wordsPerMinute));
}

export function formatDate(date: Date, lang: SupportedLang = 'zh-tw'): string {
  const locale = lang === 'en' ? 'en-GB' : lang === 'zh-cn' ? 'zh-CN' : 'zh-TW';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getCleanSlug(postId: string): string {
  return postId.replace(/\.mdx?$/, '').replace(/^(zh-tw|en|zh-cn)\//, '');
}

export function getPostUrl(slug: string, lang: SupportedLang): string {
  const cleanSlug = slug.replace(/^(zh-tw|en|zh-cn)\//, '').replace(/\.mdx?$/, '');
  return lang === 'zh-tw' ? `/posts/${cleanSlug}` : `/${lang}/posts/${cleanSlug}`;
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
    .split(/\n\s*\n|(?:^|\s)>|(?:^|\s)前置條件|(?:^|\s)前置条件/i)[0]
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
    .replace(/&/g, '\\u0026');
}
