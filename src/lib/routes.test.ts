import {
  decodeRouteSegment,
  decodeRouteSegments,
  getPostsListUrl,
  getPostsPageUrl,
  getTagListUrl,
  normalizePageNumber,
  stripLocalePathParts,
} from './routes';

describe('route decoding', () => {
  test('returns null for malformed percent encoding', () => {
    expect(decodeRouteSegment('%E0%A4%A')).toBeNull();
    expect(decodeRouteSegments(['valid', '%ZZ'])).toBeNull();
  });
});

describe('stripLocalePathParts', () => {
  test('removes legacy /en prefix', () => {
    expect(stripLocalePathParts(['en', 'page', '2'])).toEqual(['page', '2']);
  });

  test('removes zh-tw prefix', () => {
    expect(stripLocalePathParts(['zh-tw', 'page', '2'])).toEqual(['page', '2']);
  });
});

describe('getPostsListUrl', () => {
  test('uses /posts for page 1 in each locale', () => {
    expect(getPostsListUrl('en', 1)).toBe('/posts');
    expect(getPostsListUrl('zh-tw', 1)).toBe('/zh-tw/posts');
    expect(getPostsListUrl('zh-cn', 1)).toBe('/zh-cn/posts');
  });

  test('uses localized /page/N for later pages', () => {
    expect(getPostsListUrl('en', 3)).toBe('/page/3');
    expect(getPostsListUrl('zh-tw', 3)).toBe('/zh-tw/page/3');
    expect(getPostsListUrl('zh-cn', 3)).toBe('/zh-cn/page/3');
  });

  test('normalizes unsafe and fractional page values to page one', () => {
    for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(normalizePageNumber(value)).toBe(1);
      expect(getPostsListUrl('en', value)).toBe('/posts');
    }
  });
});

describe('getPostsPageUrl', () => {
  test('uses /posts for page 1 and /page/N for later pages', () => {
    expect(getPostsPageUrl('en', 1)).toBe('/posts/');
    expect(getPostsPageUrl('zh-tw', 2)).toBe('/zh-tw/page/2/');
  });
});

describe('getTagListUrl', () => {
  test('builds localized tag pagination URLs', () => {
    expect(getTagListUrl('en', 'AI API', 2)).toBe('/tags/AI%20API/2/');
    expect(getTagListUrl('zh-tw', 'AI API', 1)).toBe('/zh-tw/tags/AI%20API/1/');
  });

  test('does not generate invalid pagination segments', () => {
    expect(getTagListUrl('en', 'Privacy', 2.5)).toBe('/tags/Privacy/1/');
  });

  test('rejects empty tag routes', () => {
    expect(() => getTagListUrl('en', '  ', 1)).toThrow(/non-empty tag/);
  });
});
