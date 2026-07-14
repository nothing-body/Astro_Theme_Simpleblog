export const SITE_NAME = "SimpleBlog";
export const DEFAULT_AUTHOR = 'SimpleBlog';
export const DEFAULT_DESCRIPTION =
  'Personal technology notes about self-hosting, web development, security, and open source tools.';

export function getSiteUrl(site?: URL | string | null): string {
  const raw = site?.toString() || import.meta.env.PUBLIC_SITE_URL;
  if (!raw) throw new Error('PUBLIC_SITE_URL is required to generate absolute site URLs.');
  return raw.replace(/\/$/, '');
}

export function getCanonicalUrl(pathname: string, site?: URL | string | null): string {
  return new URL(pathname, getSiteUrl(site)).href;
}

export function getContactEmail(): string {
  const email = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('PUBLIC_CONTACT_EMAIL is required and must be a valid email address.');
  }
  return email;
}
