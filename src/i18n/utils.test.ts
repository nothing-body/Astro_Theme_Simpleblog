import type { BlogPost } from '../lib/posts';
import {
  buildDynamicCategoryMapping,
  buildDynamicTagMapping,
  getTargetLangRoute,
} from './utils';

function post(
  id: string,
  categoryPath: string[],
  tags: string[] = []
): BlogPost {
  return {
    id,
    data: {
      title: id,
      pubDate: new Date('2026-01-01T00:00:00Z'),
      category: categoryPath.at(-1) ?? 'Uncategorized',
      categoryPath,
      tags,
      author: 'Blue Binary',
      pinned: false,
      draft: false,
    },
  } as unknown as BlogPost;
}

function resolve(url: string, target: 'en' | 'zh-tw' | 'zh-cn', posts: BlogPost[]) {
  return getTargetLangRoute(
    new URL(url),
    target,
    buildDynamicCategoryMapping(posts),
    buildDynamicTagMapping(posts),
    posts
  );
}

describe('getTargetLangRoute', () => {
  test('keeps an article on its translated article route', () => {
    const posts = [
      post('en/shared-slug.md', ['Software']),
      post('zh-tw/shared-slug.md', ['軟體']),
      post('zh-cn/shared-slug.md', ['软件']),
    ];

    expect(resolve('https://example.com/posts/shared-slug', 'zh-tw', posts)).toEqual({
      path: '/zh-tw/posts/shared-slug',
      canonicalPath: '/zh-tw/posts/shared-slug/',
      available: true,
    });
  });

  test('marks an unavailable article translation instead of inventing an alternate', () => {
    const posts = [post('en/english-only.md', ['Software'])];
    expect(resolve('https://example.com/posts/english-only', 'zh-cn', posts).available).toBe(
      false
    );
  });

  test('translates category names and preserves a valid page number', () => {
    const posts = Array.from({ length: 6 }, (_, index) => [
      post(`en/post-${index}.md`, ['Network and Security']),
      post(`zh-tw/post-${index}.md`, ['網路與安全']),
      post(`zh-cn/post-${index}.md`, ['网络与安全']),
    ]).flat();

    expect(
      resolve(
        'https://example.com/categories/Network-and-Security/2/',
        'zh-tw',
        posts
      ).path
    ).toBe('/zh-tw/categories/%E7%B6%B2%E8%B7%AF%E8%88%87%E5%AE%89%E5%85%A8/2/');
  });

  test('maps translated tags by their position in matching translated posts', () => {
    const posts = [
      post('en/security.md', ['Security'], ['API Security', 'Privacy']),
      post('zh-tw/security.md', ['安全'], ['API 安全', '隱私']),
      post('zh-cn/security.md', ['安全'], ['API 安全', '隐私']),
    ];

    expect(
      resolve('https://example.com/tags/Privacy/1/', 'zh-cn', posts).path
    ).toBe('/zh-cn/tags/%E9%9A%90%E7%A7%81/1/');
  });

  test('uses canonical page-one routes for the posts listing', () => {
    const route = resolve('https://example.com/posts', 'zh-tw', []);
    expect(route.path).toBe('/zh-tw/posts');
    expect(route.canonicalPath).toBe('/zh-tw/page/1/');
  });
});
