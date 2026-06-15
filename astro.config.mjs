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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const site = (process.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');

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
          path !== '/en' &&
          path !== '/en/' &&
          !path.startsWith('/en/')
        );
      },
    }),
    mdx(),
  ],

  markdown: {
    remarkPlugins: [remarkGfm, remarkDirective, remarkDirectiveToDiv],
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
