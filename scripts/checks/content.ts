import path from 'node:path';
import { parseDocument } from 'yaml';
import { getCategoryRoutePath } from '../../src/lib/routes.ts';
import { Audit, readText, relative, walkFiles } from './core.ts';

const languages = ['en', 'zh-tw', 'zh-cn'] as const;
type Language = (typeof languages)[number];

type ArticleRecord = {
  language: Language;
  slug: string;
  file: string;
  categoryPath: string[];
  tags: string[];
};

const allowedTopLevelCategories: Record<Language, ReadonlySet<string>> = {
  en: new Set([
    'Digital Rights',
    'Guide',
    'Network & Security',
    'Privacy & Mail',
    'Server',
    'Software',
    'Website',
  ]),
  'zh-tw': new Set(['伺服器', '指南', '數位權益', '網站', '網路與安全', '軟體', '隱私與信箱']),
  'zh-cn': new Set(['服务器', '指南', '数字权益', '网站', '网络与安全', '软件', '隐私与邮箱']),
};

/*
 * Content audit treats articles as untrusted input. It validates YAML without
 * duplicate keys or excessive aliases, rejects executable/raw HTML content and
 * dangerous copy-paste commands, then verifies that all three translations
 * share a slug and compatible category/tag structure.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return null;
  return value.map(item => item.trim());
}

function containsUnsafeUnicode(value: string): boolean {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return (
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    );
  });
}

function containsRawHtml(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '<') continue;
    let cursor = value[index + 1] === '/' ? index + 2 : index + 1;
    if (!/[A-Za-z]/.test(value[cursor] ?? '')) continue;
    while (/[A-Za-z0-9-]/.test(value[cursor] ?? '')) cursor += 1;
    const delimiter = value[cursor];
    if (delimiter === '>' || delimiter === '/' || delimiter === ' ' || delimiter === '\t') {
      return true;
    }
  }
  return false;
}

function articleSlug(file: string, language: Language): string {
  const root = path.join(process.cwd(), 'src', 'content', 'blog', language);
  return path.relative(root, file).replaceAll('\\', '/').replace(/\.md$/i, '');
}

function articleFiles(language: Language): string[] {
  const directory = path.join(process.cwd(), 'src', 'content', 'blog', language);
  return walkFiles(directory).filter(file => /\.md$/i.test(file));
}

function parseFrontmatter(
  audit: Audit,
  text: string,
  file: string
): { data: Record<string, unknown>; body: string } | null {
  const normalized = text.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match?.[1]) {
    audit.error('CONTENT001', 'A valid YAML frontmatter block is required.', file);
    return null;
  }

  const document = parseDocument(match[1], { prettyErrors: true, uniqueKeys: true });
  for (const error of document.errors) audit.error('CONTENT011', error.message, file);
  if (document.errors.length > 0) return null;

  const data: unknown = document.toJS({ maxAliasCount: 20 });
  if (!isRecord(data)) {
    audit.error('CONTENT011', 'Frontmatter must be a YAML object.', file);
    return null;
  }
  return { data, body: normalized.slice(match[0].length) };
}

function validDate(value: unknown): Date | null {
  if (!(typeof value === 'string' || value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function checkMarkdownLinks(audit: Audit, text: string, file: string): void {
  for (const match of text.matchAll(/\]\(([^)\s]+)/g)) {
    const openingBracket = text.lastIndexOf('[', match.index);
    if (openingBracket > 0 && text[openingBracket - 1] === '!') continue;
    const href = match[1];
    if (!href) continue;
    if (/^https?:/i.test(href)) {
      try {
        const url = new URL(href);
        if (url.username || url.password) {
          audit.error('CONTENT012', 'Links must not contain URL credentials.', file);
        }
      } catch {
        audit.error('CONTENT013', `Invalid absolute URL: ${href}`, file);
      }
      continue;
    }
    if (/^(?:mailto:|#|\/)/i.test(href)) continue;
    audit.warn('CONTENT003', `Relative link should be reviewed: ${href}`, file);
  }
}

function checkArticle(audit: Audit, language: Language, filePath: string): ArticleRecord | null {
  const file = relative(filePath);
  if (path.extname(filePath).toLowerCase() !== '.md') {
    audit.error('CONTENT008', 'Blog articles must use .md.', file);
    return null;
  }

  const text = readText(filePath);
  const parsed = parseFrontmatter(audit, text, file);
  if (!parsed) return null;
  const { data, body } = parsed;

  for (const key of ['title', 'description', 'pubDate', 'category', 'tags']) {
    if (!(key in data))
      audit.error('CONTENT001', `Required frontmatter field is missing: ${key}`, file);
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const category = typeof data.category === 'string' ? data.category.trim() : '';
  const categoryPath =
    data.categoryPath === undefined ? [category] : stringArray(data.categoryPath);
  const tags = stringArray(data.tags);
  const pubDate = validDate(data.pubDate);
  const updatedDate = data.updatedDate === undefined ? null : validDate(data.updatedDate);

  if (!title) audit.error('CONTENT001', 'title must be a non-empty string.', file);
  if (
    [title, description, category, ...(categoryPath ?? []), ...(tags ?? [])].some(
      containsUnsafeUnicode
    )
  ) {
    audit.error(
      'CONTENT019',
      'Content metadata contains control or bidirectional override characters.',
      file
    );
  }
  if (!description) audit.error('SEO001', 'A unique description is required.', file);
  else if (description.length < 30 || description.length > 180) {
    audit.warn(
      'SEO002',
      `Description length is ${description.length}; target 30-180 characters.`,
      file
    );
  }
  if (!pubDate) audit.error('CONTENT014', 'pubDate must be a valid date.', file);
  if (data.updatedDate !== undefined && !updatedDate) {
    audit.error('CONTENT014', 'updatedDate must be a valid date when provided.', file);
  }
  if (pubDate && updatedDate && updatedDate < pubDate) {
    audit.error('CONTENT015', 'updatedDate cannot be earlier than pubDate.', file);
  }
  if (!allowedTopLevelCategories[language].has(category)) {
    audit.error('CONTENT006', `Unknown top-level category: ${category || '(empty)'}`, file);
  }
  if (!categoryPath || categoryPath.length === 0 || categoryPath.some(segment => !segment)) {
    audit.error('CONTENT007', 'categoryPath must be a non-empty string array.', file);
  } else if (categoryPath[0] !== category) {
    audit.error('CONTENT007', `categoryPath must start with category '${category}'.`, file);
  }
  if (!tags || tags.some(tag => !tag)) {
    audit.error('CONTENT016', 'tags must be an array of non-empty strings.', file);
  } else if (tags.some(tag => tag.includes('/') || tag.includes('\\'))) {
    audit.error('CONTENT016', 'tags must not contain slash or backslash characters.', file);
  } else if (new Set(tags).size !== tags.length) {
    audit.error('CONTENT017', 'Duplicate tags are not allowed in one article.', file);
  }
  if (data.pinOrder !== undefined && data.pinned !== true) {
    audit.warn('CONTENT018', 'pinOrder has no effect unless pinned is true.', file);
  }

  const nonCodeText = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\r\n]*`/g, '');
  if ((body.match(/^```/gm)?.length ?? 0) % 2 !== 0) {
    audit.error('CONTENT002', 'Unbalanced fenced code block.', file);
  }
  if (
    containsRawHtml(nonCodeText) ||
    nonCodeText.includes('set:html') ||
    /\b(?:javascript|vbscript):/i.test(nonCodeText)
  ) {
    audit.error(
      'CONTENT009',
      'Raw HTML and active-content URL schemes are not allowed in articles.',
      file
    );
  }
  if (/^\s*(?:import|export)\s/m.test(nonCodeText)) {
    audit.error(
      'CONTENT010',
      'Articles may not import modules or contain executable exports.',
      file
    );
  }

  const codeBlocks = [...body.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
    .map(match => match[1] ?? '')
    .join('\n');
  if (
    /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash)\b|\bchmod\s+777\b|StrictHostKeyChecking=no|PermitRootLogin\s+yes|PasswordAuthentication\s+yes/i.test(
      codeBlocks
    )
  ) {
    audit.error('CONTENT004', 'Dangerous copy-paste command found in an article code block.', file);
  }

  const paragraphs = nonCodeText
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(paragraph => paragraph.length >= 40);
  for (let index = 1; index < paragraphs.length; index += 1) {
    if (paragraphs[index] === paragraphs[index - 1]) {
      audit.error('CONTENT005', 'Consecutive duplicate paragraph found.', file);
    }
  }
  checkMarkdownLinks(audit, body, file);

  return {
    language,
    slug: articleSlug(filePath, language),
    file,
    categoryPath: categoryPath ?? [],
    tags: tags ?? [],
  };
}

export function checkContent(audit: Audit): void {
  const contentRoot = path.join(process.cwd(), 'src', 'content', 'blog');
  for (const file of walkFiles(contentRoot).filter(file => /\.mdx$/i.test(file))) {
    audit.error(
      'CONTENT016',
      'MDX is not supported; convert the article to Markdown.',
      relative(file)
    );
  }

  const articles = languages.flatMap(language =>
    articleFiles(language)
      .map(file => checkArticle(audit, language, file))
      .filter((article): article is ArticleRecord => article !== null)
  );
  const articlesBySlug = Map.groupBy(articles, article => article.slug);

  for (const language of languages) {
    const routeOwners = new Map<string, string>();
    for (const article of articles.filter(item => item.language === language)) {
      for (let depth = 1; depth <= article.categoryPath.length; depth += 1) {
        const categoryPath = article.categoryPath.slice(0, depth);
        const owner = categoryPath.join(' / ');
        try {
          const route = getCategoryRoutePath(categoryPath).normalize('NFC').toLowerCase();
          const existing = routeOwners.get(route);
          if (existing && existing !== owner) {
            audit.error(
              'CONTENT020',
              `Category route collision in ${language}: '${existing}' and '${owner}' both map to '${route}'.`
            );
          } else routeOwners.set(route, owner);
        } catch (error) {
          audit.error(
            'CONTENT020',
            error instanceof Error ? error.message : String(error),
            article.file
          );
        }
      }
    }
  }

  for (const [slug, translations] of articlesBySlug) {
    const present = new Set(translations.map(article => article.language));
    const missing = languages.filter(language => !present.has(language));
    if (missing.length)
      audit.error('I18N001', `Article slug '${slug}' is missing in: ${missing.join(', ')}.`);

    const categoryDepths = new Set(translations.map(article => article.categoryPath.length));
    if (categoryDepths.size > 1) {
      audit.error('I18N002', `Translated article '${slug}' has mismatched categoryPath depth.`);
    }
    const tagCounts = new Set(translations.map(article => article.tags.length));
    if (tagCounts.size > 1) {
      audit.error(
        'I18N003',
        `Translated article '${slug}' has mismatched tag counts; tag translation is positional.`
      );
    }
  }
}
