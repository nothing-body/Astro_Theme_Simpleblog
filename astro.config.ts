import { defineConfig } from 'astro/config';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { localizedSitemapAlternates } from './src/integrations/localized-output';
import { createMarkdownProcessor } from './src/markdown/processor';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

function siteOrigin(): string {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const env = loadEnv(mode, rootDirectory, '');
  const configured =
    (process.env.PUBLIC_SITE_URL ?? env.PUBLIC_SITE_URL)?.trim() || 'https://example.com';

  const url = new URL(configured);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'PUBLIC_SITE_URL must be a clean HTTPS origin, for example https://example.com.'
    );
  }
  return url.origin;
}

const site = siteOrigin();
const processor = createMarkdownProcessor();

export default defineConfig({
  site,
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-tw', 'zh-cn'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    partytown({
      config: {
        debug: false,
        forward: [['dataLayer.push', { preserveBehavior: true }]],
      },
    }),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', 'zh-tw': 'zh-TW', 'zh-cn': 'zh-CN' },
      },
      filter: page => {
        const pathname = page.replace(/^https?:\/\/[^/]+/, '');
        return (
          !pathname.includes('/404') &&
          !pathname.includes('/no-category') &&
          !/\/(?:zh-tw\/|zh-cn\/)?leaving\/?$/.test(pathname)
        );
      },
    }),
    localizedSitemapAlternates(),
  ],
  markdown: {
    processor,
    syntaxHighlight: 'prism',
  },
  prefetch: false,
  image: {
    domains: [],
    remotePatterns: [],
    layout: 'constrained',
    responsiveStyles: false,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@layouts': path.resolve(rootDirectory, './src/layouts'),
        '@components': path.resolve(rootDirectory, './src/components'),
        '@styles': path.resolve(rootDirectory, './src/styles'),
        '@lib': path.resolve(rootDirectory, './src/lib'),
        '@i18n': path.resolve(rootDirectory, './src/i18n'),
      },
    },
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: false,
      sourcemap: false,
    },
  },
});
