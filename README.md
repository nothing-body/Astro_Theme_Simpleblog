# Astro Theme SimpleBlog

A multilingual Astro static-blog template with Markdown content, Pagefind search, Partytown analytics isolation, SEO metadata, strict security headers, and cross-platform TypeScript deployment tools.

<p align="center">
  <a href="https://blog.gkbb.de/">Live Demo</a>
  &middot;
  <a href="./README.zh-TW.md">繁體中文</a>
  &middot;
  <a href="./README.zh-CN.md">简体中文</a>
</p>

## Quick Start

Node.js 22.12 or newer is required. pnpm is recommended because this repository commits `pnpm-lock.yaml`.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

On Windows PowerShell, use `Copy-Item .env.example .env`. If pnpm is unavailable, the scripts fall back to npm:

```bash
npm install
npm run dev
npm run check
npm run build
```

## Languages And Routes

- English is the default language: `/`
- Traditional Chinese: `/zh-tw/`
- Simplified Chinese: `/zh-cn/`
- Article lists use `/posts/`; page two and later use `/page/2`, `/page/3`, and so on.
- There is no duplicate `/page/1` or legacy `/en` route.

Translated articles use the same filename:

```text
src/content/blog/en/getting-started.md
src/content/blog/zh-tw/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

## Technology Stack

- Astro static output with strict TypeScript and Vite
- Tailwind CSS v4 through `@tailwindcss/vite`, plus scoped Astro and shared CSS
- Astro Sitemap with custom multilingual alternate generation
- Pagefind static full-text search with localized filters
- Partytown for consented GA4 execution outside the main thread
- Astro Markdown/Remark, GFM, custom directives, Prism, and a raw-HTML ban
- Sharp and Astro assets for bounded responsive article images
- Jest, Playwright, Astro Check, ESLint, Stylelint, Knip, OSV, and Lighthouse
- TypeScript deployment clients for Cloudflare, Vercel, Netlify, VPS, VPS Docker, and Supabase Edge Functions

## Current Architecture

```text
src/content/blog/          Markdown posts and shared article images
src/pages/                 English and shared Astro routes
src/pages/zh-tw/           Traditional Chinese routes
src/pages/zh-cn/           Simplified Chinese routes
src/components/            Shared Astro UI components
src/layouts/               Document and article layouts
src/i18n/                  UI text and language-route mapping
src/integrations/          Sitemap and hreflang output post-processing
src/lib/                   URL, content, taxonomy, and site helpers
src/markdown/              Markdown safety and image processing
src/scripts/               Browser-side TypeScript
scripts/                   Checks and deployment tools
deploy/                    Nginx and VPS Docker configuration
public/                    Static assets and provider security headers
tests/                     Browser tests
```

Important components:

- `BaseLayout.astro`: document shell, metadata, navigation, privacy controls, and shared scripts.
- `PostsPage.astro`: one rendering implementation shared by all localized post-list routes.
- `BlogPostLayout.astro`: article metadata, JSON-LD, breadcrumbs, Pagefind fields, categories, and tags.
- `SearchPage.astro`: localized search UI; `src/scripts/search.ts` creates results with safe DOM APIs.
- `HeadMeta.astro`: canonical URL, hreflang, Open Graph, Twitter metadata, and GA4 configuration.
- `ExternalLink.astro` and `LeavingNotice.astro`: keep external destinations in a URL fragment and show a multilingual API-free notice.
- `src/markdown/processor.ts`: rejects raw HTML, secures external links, and applies the article-image policy.
- `src/integrations/localized-output.ts`: verifies and supplements localized sitemap alternates after generation.
- `scripts/checks/`: audits source, content, images, secrets, headers, SEO, generated output, documentation, and optional reputation integrations.

The default flow is:

```text
Markdown -> safe Markdown/image pipeline -> Astro static routes -> Pagefind index
External link -> localized static leaving notice -> user-confirmed destination
Deployment menu -> validated TypeScript target -> generated dist upload
```

## Main Features

- Three-language Markdown articles, categories, tags, pinned posts, drafts, and pagination
- Pagefind full-text search with localized category and tag filters
- Astro image optimization with dimensions, responsive `srcset`, lazy loading, and file-size limits
- Canonical URLs, hreflang, sitemap alternates, robots.txt, JSON-LD, Open Graph, and Twitter cards
- Partytown for consented GA4 execution away from the main thread
- CSP without `unsafe-inline`, MIME sniffing protection, framing protection, and provider-specific header files
- Reduced-motion, low-memory, low-CPU, save-data, and slow-network presentation paths
- Windows, macOS, and Linux deployment scripts written in TypeScript
- Dual-mode external-link self-checks: static notice by default, optional `local-feed` or `remote-api` reputation integrations when explicitly declared

Pagefind does not currently support stemming for `zh-tw` or `zh-cn`. The build note is expected; Chinese search still works. Add `--quiet` to the Pagefind portion of the `build` script to hide informational notes while keeping warnings and errors.

## Configuration

Examples:

```text
.env.example
.env.cloudflare.example
.env.vercel.example
.env.netlify.example
.env.supabase.example
.env.vps.example
.env.vps-docker.example
```

Shared public values:

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=Astro Simple Blog
PUBLIC_SITE_AUTHOR=Site Author
PUBLIC_SITE_DESCRIPTION=A multilingual Astro blog for notes, guides, and articles.
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

Do not commit real `.env*` files, tokens, account IDs, project IDs, SSH keys, passphrases, private articles, or private images. `.gitignore` excludes these by default.

## Deployment

```bash
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
```

Cloudflare Pages, Vercel, Netlify, VPS, and VPS Docker deploy the static site. Supabase deploys TypeScript Edge Functions under `supabase/functions/<name>/index.ts`; it is not a static-site host.

Use `pnpm deploy:menu` for the English, Traditional Chinese, or Simplified Chinese menu. GitHub Actions, GitLab CI, and Codeberg/Woodpecker examples are included. See [DEPLOYMENT.en.md](./DEPLOYMENT.en.md) for beginner-friendly setup.

## Optional URL Reputation Integration

The three `OPENPHISH_GUIDE.*.md` files explain how to build a separate optional service on Cloudflare, Netlify, Vercel, Supabase, or another backend. The self-check supports:

- `local-feed`: OpenPhish, URLhaus, or another privately synchronized feed
- `remote-api`: Google Safe Browsing, Google Web Risk, VirusTotal, or another fixed server-to-server provider

Copy `link-reputation.audit.example.json` to `link-reputation.audit.json` only after implementing the feature, select a strategy, name the provider, and declare the actual client/backend/disclosure files. The manifest contains paths and architecture metadata only; never put endpoints, keys, tokens, account IDs, project IDs, storage IDs, or database credentials in it.

Review the selected provider's licensing and data-flow terms. In particular, direct Google Safe Browsing URL searches send the lookup URL to Google, so user-facing disclosures must not claim that the destination remains local.

## Guides

- [Deployment](./DEPLOYMENT.en.md) · [繁體中文](./DEPLOYMENT.zh-TW.md) · [简体中文](./DEPLOYMENT.zh-CN.md)
- [Markdown and configuration](./MARKDOWN_GUIDE.en.md) · [繁體中文](./MARKDOWN_GUIDE.zh-TW.md) · [简体中文](./MARKDOWN_GUIDE.zh-CN.md)
- [Bookmarks](./BOOKMARKS_GUIDE.en.md) · [繁體中文](./BOOKMARKS_GUIDE.zh-TW.md) · [简体中文](./BOOKMARKS_GUIDE.zh-CN.md)
- [Optional URL reputation](./OPENPHISH_GUIDE.en.md) · [繁體中文](./OPENPHISH_GUIDE.zh-TW.md) · [简体中文](./OPENPHISH_GUIDE.zh-CN.md)
- [Scripts](./scripts/README.en.md) · [繁體中文](./scripts/README.zh-TW.md) · [简体中文](./scripts/README.zh-CN.md)
- [Self-check rules](./SELF_CHECK_GUIDE.en.md) · [繁體中文](./SELF_CHECK_GUIDE.zh-TW.md) · [简体中文](./SELF_CHECK_GUIDE.zh-CN.md)

## Verification

```bash
pnpm check
pnpm audit:security
pnpm build
pnpm test:e2e
pnpm selfcheck -- --quick
pnpm analyze
```

`pnpm analyze` performs the full build-output, SEO, CSP, route, content, dependency, deployment-plan, and browser audit.
