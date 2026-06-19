export const DEFAULT_SITE_URL = 'https://blog.gkbb.de';
export const SITE_NAME = "Tena's Blog";
export const DEFAULT_AUTHOR = 'Tena';
export const DEFAULT_CONTACT_EMAIL = 'contact@duck.235803.xyz';
export const DEFAULT_DESCRIPTION =
  'Personal technology notes about self-hosting, web development, security, and open source tools.';

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
  if (lang === 'en') return getCanonicalUrl(cleanPath.replace(/^\/(en|zh-tw|zh-cn)(?=\/|$)/, '') || '/', site);

  const pathWithoutLocale = cleanPath.replace(/^\/(en|zh-tw|zh-cn)(?=\/|$)/, '');
  return getCanonicalUrl(`/${lang}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`, site);
}
