import { safeJsonStringify, stripMarkdown, summarizePlainText, truncate } from './utils';

describe('safeJsonStringify', () => {
  test('escapes JSON-LD unsafe characters', () => {
    expect(safeJsonStringify({ value: '<script>&</script>' })).toBe(
      '{"value":"\\u003cscript\\u003e\\u0026\\u003c/script\\u003e"}'
    );
  });
});

describe('truncate', () => {
  test('does not change short strings', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  test('truncates long strings with an ASCII ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });
});

describe('stripMarkdown', () => {
  test('turns markdown descriptions into card-safe plain text', () => {
    expect(
      stripMarkdown(
        '部署摘要。\n\n> **前置條件**\n> - 建立 `npm_network`（`sudo docker network create npm_network`）'
      )
    ).toBe('部署摘要。 前置條件 建立 npm_network（sudo docker network create npm_network）');
  });

  test('preserves technical identifiers with underscores', () => {
    expect(stripMarkdown('`npm_network`')).toBe('npm_network');
  });
});

describe('summarizePlainText', () => {
  test('drops frontmatter notes and blockquotes from descriptions', () => {
    expect(
      summarizePlainText(
        '部署摘要。\n\n> **前置條件**\n> - 建立 `npm_network`（`sudo docker network create npm_network`）',
        120
      )
    ).toBe('部署摘要。');
  });

  test('handles YAML-folded descriptions that lost paragraph breaks', () => {
    expect(
      summarizePlainText(
        '部署摘要。 前置條件 > - 建立 `npm_network`（`sudo docker network create npm_network`）',
        120
      )
    ).toBe('部署摘要。');
  });
});
