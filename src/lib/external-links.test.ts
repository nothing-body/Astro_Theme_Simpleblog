import {
  getLeavingNoticeHref,
  getLeavingNoticePath,
  normalizeExternalHttpUrl,
} from './external-links';

describe('external link notice URLs', () => {
  test('uses localized notice routes and keeps the destination out of the request URL', () => {
    expect(getLeavingNoticePath('en')).toBe('/leaving');
    expect(getLeavingNoticePath('zh-tw')).toBe('/zh-tw/leaving');
    expect(getLeavingNoticeHref('zh-cn', 'https://example.org/path?q=1')).toBe(
      '/zh-cn/leaving#to=https%3A%2F%2Fexample.org%2Fpath%3Fq%3D1'
    );
  });

  test.each([
    ['java', 'script:alert(1)'].join(''),
    'https://user:password@example.org/',
    'https://example.org/\u202Etxt',
  ])('rejects unsafe external URL %s', value => {
    expect(() => normalizeExternalHttpUrl(value)).toThrow();
  });
});
