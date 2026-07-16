import path from 'node:path';
import { imageLoadingAttributes, validateArticleImage } from './image-policy';

const article = path.join(process.cwd(), 'src', 'content', 'blog', 'en', 'example.md');

describe('article image policy', () => {
  test('accepts a descriptive local image from the shared asset directory', () => {
    expect(() =>
      validateArticleImage(article, '../_assets/example.webp', 'Settings page with 2FA enabled')
    ).not.toThrow();
  });

  test.each([
    ['https://tracker.example/image.png', 'Remote image'],
    ['/images/example.png', 'Public image'],
    ['../../../../outside.png', 'Escaping image'],
    ['../_assets/example.svg', 'Unsupported format'],
  ])('rejects unsafe or unoptimized source %s', (source, alt) => {
    expect(() => validateArticleImage(article, source, alt)).toThrow();
  });

  test('requires useful alt text', () => {
    expect(() => validateArticleImage(article, '../_assets/example.png', 'screenshot')).toThrow(
      'alt text is too generic'
    );
  });

  test('prioritizes only a first image near the beginning of an article', () => {
    expect(imageLoadingAttributes(true, 4)).toEqual({
      decoding: 'async',
      loading: 'eager',
      fetchPriority: 'high',
    });
    expect(imageLoadingAttributes(true, 40)).toEqual({ decoding: 'async', loading: 'lazy' });
    expect(imageLoadingAttributes(false, 4)).toEqual({ decoding: 'async', loading: 'lazy' });
  });
});
