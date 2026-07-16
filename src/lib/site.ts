function publicText(value: string | undefined, fallback: string, name: string, maxLength: number) {
  const text = value?.trim() || fallback;
  if (
    text.length > maxLength ||
    [...text].some(character => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    })
  ) {
    throw new Error(`${name} contains control characters or exceeds ${maxLength} characters.`);
  }
  return text;
}

export const SITE_NAME = publicText(
  import.meta.env.PUBLIC_SITE_NAME,
  'Astro Simple Blog',
  'PUBLIC_SITE_NAME',
  100
);
export const DEFAULT_AUTHOR = publicText(
  import.meta.env.PUBLIC_SITE_AUTHOR,
  'Site Author',
  'PUBLIC_SITE_AUTHOR',
  100
);
export const DEFAULT_DESCRIPTION = publicText(
  import.meta.env.PUBLIC_SITE_DESCRIPTION,
  'A multilingual Astro blog for notes, guides, and articles.',
  'PUBLIC_SITE_DESCRIPTION',
  300
);

export function getSiteUrl(site?: URL | string | null): string {
  const raw = site?.toString() || import.meta.env.PUBLIC_SITE_URL;
  if (!raw) throw new Error('PUBLIC_SITE_URL is required to generate absolute site URLs.');
  return raw.replace(/\/$/, '');
}

export function getCanonicalUrl(pathname: string, site?: URL | string | null): string {
  return new URL(pathname, getSiteUrl(site)).href;
}

export function getContactEmail(): string {
  const email = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim() || 'contact@example.com';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('PUBLIC_CONTACT_EMAIL must be a valid email address.');
  }
  return email;
}
