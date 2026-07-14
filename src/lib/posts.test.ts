import { getTotalPages, paginatePosts, POSTS_PAGE_SIZE } from './posts';

describe('POSTS_PAGE_SIZE', () => {
  test('is a positive integer', () => {
    expect(POSTS_PAGE_SIZE).toBeGreaterThan(0);
  });
});

describe('getTotalPages', () => {
  test('returns at least one page', () => {
    expect(getTotalPages(0)).toBe(1);
    expect(getTotalPages(5, 5)).toBe(1);
    expect(getTotalPages(6, 5)).toBe(2);
  });
});

describe('paginatePosts', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];

  test('returns the correct slice for each page', () => {
    expect(paginatePosts(items, 1, 2)).toEqual(['a', 'b']);
    expect(paginatePosts(items, 2, 2)).toEqual(['c', 'd']);
    expect(paginatePosts(items, 3, 2)).toEqual(['e', 'f']);
  });
});
