// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import astroExpressiveCode from 'astro-expressive-code';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function remarkDirectiveToDiv() {
  /** @param {any} tree */
  return tree => {
    visit(tree, node => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const data = node.data || (node.data = {});
        data.hName = 'div';
        data.hProperties = {
          ...data.hProperties,
          'data-directive': node.name,
          class: `directive-${node.name}`,
        };
      }
    });
  };
}

/**
 * @param {unknown} existingRel
 * @param {string[]} requiredRel
 * @returns {string}
 */
function appendRel(existingRel, requiredRel) {
  const rels = new Set(
    String(existingRel || '')
      .split(/\s+/)
      .filter(Boolean)
  );

  for (const rel of requiredRel) {
    rels.add(rel);
  }

  return Array.from(rels).join(' ');
}

/**
 * @param {{ path?: string; history?: string[] } | null | undefined} file
 * @returns {string}
 */
function getLocalizedLeavingPath(file) {
  const filePath = String(file?.path || file?.history?.[0] || '').replace(/\\/g, '/');

  if (filePath.includes('/src/content/blog/zh-tw/')) return '/zh-tw/leaving';
  if (filePath.includes('/src/content/blog/zh-cn/')) return '/zh-cn/leaving';

  return '/leaving';
}

/**
 * @param {unknown} rawHref
 * @param {string} warningPath
 * @param {string} siteOrigin
 * @returns {string | null}
 */
function toExternalWarningHref(rawHref, warningPath, siteOrigin) {
  if (typeof rawHref !== 'string' || !rawHref) return null;

  let targetUrl;
  try {
    targetUrl = new URL(rawHref);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) return null;
  if (targetUrl.origin === siteOrigin) return null;

  return `${warningPath}?to=${encodeURIComponent(targetUrl.href)}`;
}

/** @param {string} siteOrigin */
function remarkExternalLinkNotice(siteOrigin) {
  return function externalLinkNoticePlugin() {
    /**
     * @param {any} tree
     * @param {any} file
     */
    return (tree, file) => {
      const warningPath = getLocalizedLeavingPath(file);

      visit(tree, 'link', node => {
        const warningHref = toExternalWarningHref(node.url, warningPath, siteOrigin);
        if (!warningHref) return;

        const data = node.data || (node.data = {});
        const hProperties = data.hProperties || {};
        node.url = warningHref;
        data.hProperties = {
          ...hProperties,
          rel: appendRel(hProperties.rel, ['noopener', 'noreferrer']),
          'data-external-notice': 'true',
        };
      });
    };
  };
}

/**
 * @param {string} dir
 * @returns {AsyncGenerator<string, void, unknown>}
 */
async function* walkHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkHtmlFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield fullPath;
    }
  }
}

function localizedExternalNoticeOutput() {
  return {
    name: 'localized-external-notice-output',
    hooks: {
      /**
       * @param {{ dir: URL }} context
       */
      'astro:build:done': async context => {
        const { dir } = context;
        const distDir = fileURLToPath(dir);
        const localeTargets = [
          { dir: path.join(distDir, 'zh-tw'), leavingPath: '/zh-tw/leaving' },
          { dir: path.join(distDir, 'zh-cn'), leavingPath: '/zh-cn/leaving' },
        ];

        for (const target of localeTargets) {
          let entries;
          try {
            entries = walkHtmlFiles(target.dir);
          } catch {
            continue;
          }

          for await (const file of entries) {
            const html = await readFile(file, 'utf8');
            const updated = html.replaceAll(
              'href="/leaving?to=',
              `href="${target.leavingPath}?to=`
            );
            if (updated !== html) {
              await writeFile(file, updated);
            }
          }
        }
      },
    },
  };
}

/** @param {string} value */
function decodeHtmlAttribute(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

/** @param {string} value */
function escapeXmlAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** @param {string} tag */
function getTagAttributes(tag) {
  /** @type {Record<string, string>} */
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = decodeHtmlAttribute(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

/**
 * @param {string} distDir
 * @param {string} pageUrl
 */
function getOutputHtmlPath(distDir, pageUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(pageUrl).pathname);
  } catch {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  return path.join(distDir, ...segments, 'index.html');
}

/**
 * @param {string} distDir
 * @param {string} pageUrl
 * @returns {Promise<Array<{ hreflang: string; href: string }>>}
 */
async function getPageAlternateLinks(distDir, pageUrl) {
  const htmlPath = getOutputHtmlPath(distDir, pageUrl);
  if (!htmlPath || !existsSync(htmlPath)) return [];

  const html = await readFile(htmlPath, 'utf8');
  const links = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = getTagAttributes(match[0]);
    if (attributes.rel !== 'alternate' || !attributes.hreflang || !attributes.href) continue;

    const targetPath = getOutputHtmlPath(distDir, attributes.href);
    if (!targetPath || !existsSync(targetPath)) continue;
    links.push({ hreflang: attributes.hreflang, href: attributes.href });
  }
  return links;
}

function localizedSitemapAlternates() {
  return {
    name: 'localized-sitemap-alternates',
    hooks: {
      /** @param {{ dir: URL }} context */
      'astro:build:done': async context => {
        const { dir } = context;
        const distDir = fileURLToPath(dir);
        const sitemapFiles = (await readdir(distDir))
          .filter(name => /^sitemap-\d+\.xml$/.test(name))
          .map(name => path.join(distDir, name));

        for (const sitemapFile of sitemapFiles) {
          const xml = await readFile(sitemapFile, 'utf8');
          const urlBlocks = await Promise.all(
            Array.from(xml.matchAll(/<url>.*?<\/url>/gs), async match => {
              const block = match[0];
              const locMatch = block.match(/<loc>(.*?)<\/loc>/s);
              if (!locMatch) return block;

              const pageUrl = decodeHtmlAttribute(locMatch[1]);
              const alternates = await getPageAlternateLinks(distDir, pageUrl);
              const withoutAlternates = block.replace(/<xhtml:link\b[^>]*\/>/g, '');
              if (alternates.length === 0) return withoutAlternates;

              const alternateXml = alternates
                .map(
                  item =>
                    `<xhtml:link rel="alternate" hreflang="${escapeXmlAttribute(item.hreflang)}" href="${escapeXmlAttribute(item.href)}"/>`
                )
                .join('');
              return withoutAlternates.replace(locMatch[0], `${locMatch[0]}${alternateXml}`);
            })
          );

          let index = 0;
          const updated = xml.replace(/<url>.*?<\/url>/gs, () => urlBlocks[index++]);
          if (updated !== xml) await writeFile(sitemapFile, updated);
        }
      },
    },
  };
}

const envFile = path.join(process.cwd(), '.env');
if (existsSync(envFile)) loadEnvFile(envFile);

const configuredSite = process.env.PUBLIC_SITE_URL?.trim();
if (!configuredSite) {
  throw new Error(
    'PUBLIC_SITE_URL is required. Copy .env.example to .env and set the real site URL.'
  );
}

const site = configuredSite.replace(/\/$/, '');
const siteOrigin = new URL(site).origin;
const remarkPlugins = [
  remarkGfm,
  remarkDirective,
  remarkDirectiveToDiv,
  remarkExternalLinkNotice(siteOrigin),
];

export default defineConfig({
  site,
  output: 'static',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-tw', 'zh-cn'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    astroExpressiveCode({
      themes: ['github-light', 'github-dark'],
      useDarkModeMediaQuery: false,
      themeCssSelector: theme => `[data-theme='${theme.type}']`,
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
    }),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', 'zh-tw': 'zh-TW', 'zh-cn': 'zh-CN' },
      },
      filter: page => {
        const path = page.replace(/^https?:\/\/[^/]+/, '');
        return (
          !path.includes('/404') &&
          !path.includes('/no-category') &&
          !/\/posts\/?$/.test(path) &&
          !/^\/(?:zh-tw\/|zh-cn\/)?leaving\/?$/.test(path) &&
          path !== '/en' &&
          path !== '/en/' &&
          !path.startsWith('/en/')
        );
      },
    }),
    mdx({
      remarkPlugins,
    }),
    localizedExternalNoticeOutput(),
    localizedSitemapAlternates(),
  ],

  markdown: {
    remarkPlugins,
    syntaxHighlight: false,
  },

  prefetch: false,

  image: {
    domains: [],
    remotePatterns: [],
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@layouts': path.resolve(__dirname, './src/layouts'),
        '@components': path.resolve(__dirname, './src/components'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@i18n': path.resolve(__dirname, './src/i18n'),
      },
    },
    build: {
      sourcemap: false,
    },
  },
});
