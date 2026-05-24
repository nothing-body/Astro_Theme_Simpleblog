export const DEFAULT_SITE_URL = 'https://example.com';
export const SITE_NAME = 'Astro Multilingual Blog Template';
export const DEFAULT_AUTHOR = SITE_NAME;
export const DEFAULT_CONTACT_EMAIL = 'hello@example.com';
export const DEFAULT_DESCRIPTION =
  'A multilingual Astro blog template for self-hosted notes, software writing, and deployment automation.';

export function getSiteUrl(site?: URL | string | null): string {
  const raw = site?.toString() || import.meta.env.PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}

export function getCanonicalUrl(pathname: string, site?: URL | string | null): string {
  return new URL(pathname, getSiteUrl(site)).href;
}

export function getContactEmail(): string {
  return import.meta.env.PUBLIC_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL;
}

export function getLocalizedUrl(
  pathname: string,
  lang: 'zh-tw' | 'en' | 'zh-cn',
  site?: URL | string | null
): string {
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (lang === 'zh-tw') return getCanonicalUrl(cleanPath, site);

  const pathWithoutLocale = cleanPath.replace(/^\/(en|zh-cn)(?=\/|$)/, '');
  return getCanonicalUrl(`/${lang}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`, site);
}
