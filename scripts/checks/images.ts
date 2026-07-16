import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import {
  ARTICLE_IMAGE_DIRECTORY,
  ARTICLE_IMAGE_EXTENSIONS,
  ARTICLE_IMAGE_LIMITS,
} from '../../src/markdown/image-policy.ts';
import { Audit, relative, walkFiles } from './core.ts';

function kibibytes(bytes: number): number {
  return Math.ceil(bytes / 1024);
}

/*
 * Image audit limits both compressed bytes and decoded pixel area. This catches
 * oversized files and decompression-style memory pressure before Astro/Sharp or
 * an older browser attempts to decode them. Symlinks are rejected so article
 * assets cannot escape the reviewed image directory.
 */
export function checkImages(audit: Audit): void {
  const root = path.join(process.cwd(), ARTICLE_IMAGE_DIRECTORY);
  const checkLinks = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        audit.error(
          'IMAGE007',
          'Symbolic links are forbidden in the article image directory.',
          relative(entryPath)
        );
      } else if (entry.isDirectory()) {
        checkLinks(entryPath);
      }
    }
  };
  checkLinks(root);
  for (const file of walkFiles(root)) {
    const name = relative(file);
    const extension = path.extname(file).toLowerCase();
    if (!ARTICLE_IMAGE_EXTENSIONS.has(extension)) {
      audit.error('IMAGE001', `Unsupported article image format: ${extension || '(none)'}.`, name);
      continue;
    }

    const bytes = fs.statSync(file).size;
    if (bytes > ARTICLE_IMAGE_LIMITS.maxBytes) {
      audit.error(
        'IMAGE002',
        `Image is ${kibibytes(bytes)} KiB; the hard limit is ${kibibytes(ARTICLE_IMAGE_LIMITS.maxBytes)} KiB.`,
        name
      );
      continue;
    }
    if (bytes > ARTICLE_IMAGE_LIMITS.recommendedBytes) {
      audit.warn(
        'IMAGE003',
        `Image is ${kibibytes(bytes)} KiB; compress it below ${kibibytes(ARTICLE_IMAGE_LIMITS.recommendedBytes)} KiB.`,
        name
      );
    }

    try {
      const dimensions = imageSize(fs.readFileSync(file));
      const width = dimensions.width ?? 0;
      const height = dimensions.height ?? 0;
      if (!width || !height) {
        audit.error('IMAGE004', 'Image dimensions could not be determined.', name);
        continue;
      }
      if (width > ARTICLE_IMAGE_LIMITS.maxDimension || height > ARTICLE_IMAGE_LIMITS.maxDimension) {
        audit.error(
          'IMAGE005',
          `Image dimensions ${width}x${height} exceed the ${ARTICLE_IMAGE_LIMITS.maxDimension}px edge limit.`,
          name
        );
      }
      if (width * height > ARTICLE_IMAGE_LIMITS.maxPixels) {
        audit.error(
          'IMAGE006',
          `Image contains ${(width * height).toLocaleString('en-US')} pixels; the limit is ${ARTICLE_IMAGE_LIMITS.maxPixels.toLocaleString('en-US')}.`,
          name
        );
      }
    } catch (error) {
      audit.error(
        'IMAGE004',
        `Image header could not be parsed: ${error instanceof Error ? error.message : String(error)}.`,
        name
      );
    }
  }
}
