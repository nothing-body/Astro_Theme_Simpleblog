import type { Lang } from '../i18n/ui';

const MAX_EXTERNAL_URL_LENGTH = 2048;

function hasUnsafeUrlCharacter(value: string): boolean {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return (
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    );
  });
}

export function normalizeExternalHttpUrl(rawUrl: string): URL {
  const value = rawUrl.trim();
  if (!value || value.length > MAX_EXTERNAL_URL_LENGTH || hasUnsafeUrlCharacter(value)) {
    throw new Error('External URL is empty, too long, or contains unsafe characters.');
  }

  const destination = new URL(value);
  if (
    !['http:', 'https:'].includes(destination.protocol) ||
    destination.username ||
    destination.password
  ) {
    throw new Error('External links must use HTTP(S) without embedded credentials.');
  }
  return destination;
}

export function getLeavingNoticePath(lang: Lang): string {
  return lang === 'en' ? '/leaving' : `/${lang}/leaving`;
}

export function getLeavingNoticeHref(lang: Lang, rawUrl: string): string {
  const destination = normalizeExternalHttpUrl(rawUrl);
  return `${getLeavingNoticePath(lang)}#to=${encodeURIComponent(destination.href)}`;
}
