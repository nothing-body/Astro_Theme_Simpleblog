import { getPostsListUrl, getPostsPageUrl, getTagListUrl, stripLocalePathParts } from './routes';

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
});

describe('getPostsPageUrl', () => {
  test('always uses /page/N including page 1', () => {
    expect(getPostsPageUrl('en', 1)).toBe('/page/1/');
    expect(getPostsPageUrl('zh-tw', 2)).toBe('/zh-tw/page/2/');
  });
});

describe('getTagListUrl', () => {
  test('builds localized tag pagination URLs', () => {
    expect(getTagListUrl('en', 'AI API', 2)).toBe('/tags/AI%20API/2/');
    expect(getTagListUrl('zh-tw', 'AI API', 1)).toBe('/zh-tw/tags/AI%20API/1/');
  });
});
