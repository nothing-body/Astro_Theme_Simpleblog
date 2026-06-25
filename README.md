# SimpleBlog
Personal Astro static blog with multilingual content, Markdown/MDX posts, SEO metadata, external-link warning pages, deployment automation, and project self-check scripts.

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

Use the same slug in all three content folders when a post has translated versions. For example:

```text
src/content/blog/en/getting-started.md
src/content/blog/zh-tw/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

These generate `/posts/getting-started`, `/zh-tw/posts/getting-started`, and `/zh-cn/posts/getting-started`.

## Content Features

- Markdown/MDX posts with categories, tags, pagination, and RSS-friendly metadata
- Pinned posts with `pinned: true`
- Draft posts with `draft: true`
- External HTTP/HTTPS links in Markdown are rewritten at build time to language-aware leaving notice pages
- Leaving notice routes exist at `/leaving`, `/zh-tw/leaving`, and `/zh-cn/leaving`
- Sitemap, robots.txt, canonical URLs, JSON-LD, Open Graph, and security headers

## Guides

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

## Configuration

Use example files as templates, then keep real credentials local:

```text
.env.example
.env.cloudflare.example
.env.vercel.example
.env.vps.example
```

Do not commit real `.env` files, API tokens, private keys, provider account IDs, or site verification files.

## Deployment

Use the guided deployment menu:

```bash
pnpm deploy:menu
```

Or run a direct deployment target:

```bash
pnpm deploy:switch -- --mode=direct:cf
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Deployment scripts build the Astro project first and deploy the generated `dist/` output.

## Public Sync Notes

This private project can be used as the source for the public template, but public syncs must exclude private data:

- Keep personal domains, analytics IDs, provider account IDs, API tokens, private keys, and real `.env` files out of the public repo.
- Keep public defaults such as `PUBLIC_SITE_URL=https://example.com`.
- Review copied content before publishing if a post contains personal notes or private operational details.

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
