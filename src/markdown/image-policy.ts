import path from 'node:path';

export const ARTICLE_IMAGE_DIRECTORY = 'src/content/blog/_assets';

export const ARTICLE_IMAGE_EXTENSIONS = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);

export const ARTICLE_IMAGE_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  recommendedBytes: 512 * 1024,
  maxDimension: 6000,
  maxPixels: 12_000_000,
} as const;

const PRIORITY_IMAGE_MAX_SOURCE_LINE = 12;
export const ARTICLE_IMAGE_OUTPUT_QUALITY = 70;

const GENERIC_ALT_LABELS = ['image', 'img', 'photo', 'picture', 'screenshot', '截圖', '截图'];

function isGenericAlt(value: string): boolean {
  const normalized = value
    .toLowerCase()
    .replaceAll('-', '')
    .replaceAll('_', '')
    .replaceAll(' ', '');
  return GENERIC_ALT_LABELS.some(label => {
    if (normalized === label) return true;
    if (!normalized.startsWith(label)) return false;
    const suffix = normalized.slice(label.length);
    return (
      suffix.length > 0 && [...suffix].every(character => character >= '0' && character <= '9')
    );
  });
}

export function validateArticleImage(
  sourceFile: string,
  url: string,
  alt: string | null | undefined
): void {
  const description = alt?.trim() ?? '';
  if (!description) throw new Error('Markdown images require meaningful alt text.');
  if (isGenericAlt(description)) {
    throw new Error(`Markdown image alt text is too generic: ${description}`);
  }
  if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(url)) {
    throw new Error(`Article images must be local files under ${ARTICLE_IMAGE_DIRECTORY}: ${url}`);
  }
  if (/[?#]/.test(url)) {
    throw new Error(`Article image paths must not contain query strings or fragments: ${url}`);
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url);
  } catch {
    throw new Error(`Article image path contains invalid URL encoding: ${url}`);
  }
  const assetRoot = path.resolve(process.cwd(), ARTICLE_IMAGE_DIRECTORY);
  const resolved = path.resolve(path.dirname(sourceFile), decodedPath);
  const relativePath = path.relative(assetRoot, resolved);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Article images must resolve inside ${ARTICLE_IMAGE_DIRECTORY}: ${url}`);
  }
  if (!ARTICLE_IMAGE_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
    throw new Error(`Unsupported article image format: ${url}`);
  }
}

export function imageLoadingAttributes(
  firstImage: boolean,
  sourceLine: number
): {
  decoding: 'async';
  loading: 'eager' | 'lazy';
  fetchPriority?: 'high';
} {
  const priority = firstImage && sourceLine <= PRIORITY_IMAGE_MAX_SOURCE_LINE;
  return priority
    ? { decoding: 'async', loading: 'eager', fetchPriority: 'high' }
    : { decoding: 'async', loading: 'lazy' };
}
