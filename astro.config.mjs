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
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const site = (process.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');
const siteOrigin = new URL(site).origin;

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
 * @returns {string | null}
 */
function toExternalWarningHref(rawHref, warningPath) {
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

function remarkExternalLinkNotice() {
  /**
   * @param {any} tree
   * @param {any} file
   */
  return (tree, file) => {
    const warningPath = getLocalizedLeavingPath(file);

    visit(tree, 'link', node => {
      const warningHref = toExternalWarningHref(node.url, warningPath);
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
}

const remarkPlugins = [remarkGfm, remarkDirective, remarkDirectiveToDiv, remarkExternalLinkNotice];

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
      filter: page => {
        const path = page.replace(/^https?:\/\/[^/]+/, '');
        return (
          !path.includes('/404') &&
          !path.includes('/no-category') &&
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
