# Astro Multilingual Blog Template

A public-safe Astro static blog template with multilingual routes, Markdown/MDX posts, SEO metadata, external-link warning pages, privacy-friendly defaults, and deployment automation for Cloudflare Pages, VPS, and Vercel.

<p align="center">
  <a href="https://blog.gkbb.de/">Live Demo</a>
  &middot;
  <a href="./README.zh-TW.md">Traditional Chinese README</a>
</p>

## Current Structure

English is the default locale at `/`. Traditional Chinese uses `/zh-tw/`, and Simplified Chinese uses `/zh-cn/`.

```text
src/content/blog/en/       English posts
src/content/blog/zh-tw/    Traditional Chinese posts
src/content/blog/zh-cn/    Simplified Chinese posts
src/pages/                 English routes and shared routes
src/pages/zh-tw/           Traditional Chinese routes
src/pages/zh-cn/           Simplified Chinese routes
src/components/            Shared Astro components
src/i18n/ui.ts             Locale labels and navigation text
scripts/                   Build, deploy, and self-check scripts
tests/                     Unit and browser tests
```

Use the same slug in each language folder when a post has translated versions:

```text
src/content/blog/en/getting-started.md
src/content/blog/zh-tw/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

These generate `/posts/getting-started`, `/zh-tw/posts/getting-started`, and `/zh-cn/posts/getting-started`.

## Features

- Markdown/MDX posts with categories, tags, pagination, and RSS-friendly metadata
- Pinned posts with `pinned: true`
- Draft posts with `draft: true`
- Language-aware routes for English, Traditional Chinese, and Simplified Chinese
- External HTTP/HTTPS links in Markdown are rewritten at build time to leaving notice pages
- Leaving notice routes at `/leaving`, `/zh-tw/leaving`, and `/zh-cn/leaving`
- Responsive navigation, bookmarks, clock, cookie preferences, and accessibility support
- Sitemap, robots.txt, canonical URLs, JSON-LD, Open Graph, and security headers
- Cloudflare Pages deployment that detects the project's production branch automatically
- Astro checks, ESLint, Stylelint, Jest, Playwright, and project self-analysis

## Guides

- [Traditional Chinese README](./README.zh-TW.md)
- [Markdown writing guide](./MARKDOWN_GUIDE.en.md)
- [Traditional Chinese Markdown writing guide](./MARKDOWN_GUIDE.zh-TW.md)
- [Bookmark guide](./BOOKMARKS_GUIDE.en.md)
- [Traditional Chinese bookmark guide](./BOOKMARKS_GUIDE.zh-TW.md)
- [Deployment guide](./DEPLOYMENT.en.md)
- [Traditional Chinese deployment guide](./DEPLOYMENT.zh-TW.md)
- [Scripts overview](./scripts/README.en.md)
- [Traditional Chinese scripts overview](./scripts/README.zh-TW.md)

## What To Configure

For local development, deployment, and safety checks, keep these files at the project root:

```text
.env                         local public site settings, copied from .env.example
.env.cloudflare              Cloudflare Pages deploy settings, copied from .env.cloudflare.example
.env.vps                     VPS SSH/rsync deploy settings, copied from .env.vps.example
.env.vercel                  Vercel deploy settings, copied from .env.vercel.example
.gitignore                   keeps real env files, tokens, keys, build output, and local reports out of git
```

Only commit the `.example` files. The real `.env*` files contain local values and must stay private.

Required deployment values:

- Cloudflare Pages: API token, Account ID, Pages project name, and `PUBLIC_SITE_URL`
- VPS: host, port, SSH user, target directory, SSH key path, and optional passphrase
- Vercel: token, org/user ID, and project ID

See [Deployment guide](./DEPLOYMENT.en.md) for where to find each value and how to run the scripts.

## Common Customization

- Bookmarks: edit `src/components/BookmarkLinks.astro`; see [Bookmark guide](./BOOKMARKS_GUIDE.en.md).
- External-link notice page: Markdown HTTP/HTTPS links are rewritten automatically. Edit `src/components/LeavingNotice.astro` for wording and `src/pages/leaving.astro`, `src/pages/zh-tw/leaving.astro`, `src/pages/zh-cn/leaving.astro` for routes.
- Self-checks: run `pnpm selfcheck -- --quick` for a fast audit, or `pnpm analyze` for the full project analysis.
- Git ignore rules: keep `.env`, `.env.cloudflare`, `.env.vps`, `.env.vercel`, private keys, package-manager auth files, `dist/`, `.astro/`, `node_modules/`, and local test reports ignored.

## Quick Start

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```

The project also supports npm:

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and set public site values:

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

Provider-specific examples are also included:

```text
.env.cloudflare.example
.env.vercel.example
.env.vps.example
```

Do not commit real credentials, deployment environment files, API tokens, private keys, provider account IDs, personal domains, or site verification files.

## Deployment

Use the guided menu:

```bash
pnpm deploy:menu
```

Or deploy directly:

```bash
pnpm deploy:switch -- --mode=direct:cf
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Cloudflare deployment reads the configured Pages project's production branch automatically. Pass `--branch=<name>` only when an explicit override is required.

## Public-Safe Defaults

This repository is intended to stay publishable:

- `PUBLIC_SITE_URL` defaults to `https://example.com`.
- Template deployment files should use placeholder project names and account values.
- Real `.env` files, API tokens, private keys, analytics IDs, personal domains, and verification files should remain outside git.
- Review copied content before publishing if it came from a private site.

## Verification

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm test
pnpm analyze
pnpm selfcheck -- --quick
```

Run `pnpm build` before publishing or deploying.
