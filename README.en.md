# Astro Multilingual Blog Template

A public-safe multilingual Astro static blog template with deployment automation for Cloudflare Pages, VPS, and Vercel.

[Live Demo](https://blog.ouoxo.com/)

## Language

<table>
  <tr>
    <td align="center"><strong>English</strong><br><a href="./README.en.md">Open English README</a></td>
    <td align="center"><strong>繁體中文</strong><br><a href="./README.zh-TW.md">開啟繁體中文 README</a></td>
  </tr>
</table>

## Guides

- [Markdown writing guide](./MARKDOWN_GUIDE.md)
- [English deployment guide](./DEPLOYMENT.en.md)
- [Traditional Chinese deployment guide](./部屬前須知.md)
- [Scripts overview](./scripts/README.en.md)

## Public Project Structure

```text
.
├─ public/
│  ├─ _headers
│  ├─ favicon.svg
│  ├─ robots.txt
│  └─ images/
├─ scripts/
│  ├─ deploy_menu.mjs
│  ├─ deploy_switch.mjs
│  ├─ deploy_lib.mjs
│  ├─ uploaddist_cf.mjs
│  ├─ uploaddist_vps.mjs
│  ├─ uploaddist_vercel.mjs
│  ├─ upgrade_astro.mjs
│  └─ README.en.md
├─ src/
│  ├─ components/
│  ├─ content/
│  │  └─ blog/
│  │     ├─ zh-tw/
│  │     ├─ en/
│  │     └─ zh-cn/
│  ├─ i18n/
│  ├─ layouts/
│  ├─ lib/
│  ├─ pages/
│  └─ styles/
├─ .github/workflows/
├─ astro.config.mjs
├─ package.json
├─ wrangler.toml
├─ DEPLOYMENT.en.md      English deployment guide
├─ 部屬前須知.md          Traditional Chinese deployment guide
└─ MARKDOWN_GUIDE.md
```

### Directory Details

- `public/`: Static assets copied directly to the final site. Put favicons, robots rules, verification files, public images, and platform header files here. Do not put secrets in this directory.
- `public/_headers`: Security headers for static hosts that support header files. Review CSP rules before adding analytics, external scripts, fonts, or image CDNs.
- `scripts/`: Cross-platform deployment and maintenance scripts. They are written in Node.js so they can run on Windows, macOS, and Linux with pnpm or npm.
- `scripts/deploy_menu.mjs`: Interactive bilingual deployment menu.
- `scripts/deploy_switch.mjs`: Command-line deployment switch for direct scripted use.
- `scripts/deploy_lib.mjs`: Shared helper library for deployment scripts.
- `scripts/uploaddist_cf.mjs`: Builds the site and deploys the generated `dist` directory to Cloudflare Pages.
- `scripts/uploaddist_vps.mjs`: Builds the site and uploads the generated `dist` directory to a VPS by SSH/SCP or rsync-style commands.
- `scripts/uploaddist_vercel.mjs`: Builds the site and deploys the generated `dist` directory to Vercel.
- `scripts/upgrade_astro.mjs`: Safe Astro upgrade helper with dry-run support and post-upgrade checks.
- `src/content/blog/`: Markdown blog posts grouped by locale. Each post uses frontmatter for title, date, language, tags, draft status, and optional pinned-post ordering.
- `src/content/blog/zh-tw/`: Traditional Chinese posts.
- `src/content/blog/en/`: English posts.
- `src/content/blog/zh-cn/`: Simplified Chinese posts.
- `src/components/`: Reusable Astro UI components such as cards, navigation pieces, badges, breadcrumbs, and content blocks.
- `src/layouts/`: Page shells shared by posts and site pages.
- `src/lib/`: Shared site logic, post sorting, metadata helpers, and other reusable utilities. Put common behavior here instead of duplicating logic inside pages.
- `src/i18n/`: Multilingual labels and locale-related helpers.
- `src/pages/`: Astro routes for the homepage, post detail pages, paginated post lists, category pages, tag pages, RSS, sitemap-related pages, and static verification files when needed.
- `src/styles/`: Global CSS and shared styling. Keep broad layout and theme rules here so component styles stay predictable.
- `.github/workflows/`: GitHub Actions examples. Enable GitHub Actions in your repository settings before relying on these workflows.
- `.gitlab-ci.yml`: GitLab CI/CD example. Configure GitLab variables before deploying from GitLab.
- `.woodpecker.yml`: Codeberg/Woodpecker CI example. Configure Woodpecker secrets before deploying from Codeberg.
- `.env.*.example`: Safe environment templates. Create your own real `.env.cloudflare`, `.env.vps`, or `.env.vercel` locally, but never commit secret files, tokens, SSH private keys, generated build output, or dependency folders.
- `astro.config.mjs`: Astro project configuration. Review `site`, integrations, and any `base` setting before deploying under a subpath.
- `wrangler.toml`: Cloudflare Pages and Wrangler-related settings.
- `DEPLOYMENT.en.md`: English deployment guide.
- `部屬前須知.md`: Traditional Chinese deployment guide. Keep English instructions pointed to `DEPLOYMENT.en.md`; use this file only for Traditional Chinese readers.
- `MARKDOWN_GUIDE.md`: Beginner-friendly Markdown writing guide for posts.

## Quick Start

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

npm is also supported:

```bash
npm install
npm run check
npm run build
npm run dev
```

## Public-Safe Template

This copy is prepared for public Git hosting:

- Real `.env` files are excluded.
- Private posts, GA4 IDs, API keys, tokens, and personal domains are removed.
- Example values use `example.com`.
- Deployment scripts are cross-platform Node.js scripts.
- Both pnpm and npm are supported.

## Content

Blog posts live under:

```text
src/content/blog
```

This template includes one public-safe example post in each supported locale:

```text
src/content/blog/zh-tw/getting-started.md
src/content/blog/en/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

These posts use `draft: false`, so the homepage, post list, category pages, tag pages, sitemap, and deployment checks work immediately after cloning.

## Rename Before Deploying

Review and update:

- `package.json`: project package name.
- `wrangler.toml`: Cloudflare Pages project name.
- `.env.cloudflare`: `CLOUDFLARE_PAGES_PROJECT_NAME`.
- `src/lib/site.ts`: site name, author, URL, description, and contact email.
- `astro.config.mjs`: `site` fallback and any `base` setting.
- `public/_headers`: CSP and security headers for your real domain and third-party resources.

## Deployment

Interactive bilingual menu:

```bash
pnpm deploy:menu
npm run deploy:menu
```

Direct examples:

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Dry run:

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
npm run deploy:switch -- --mode=direct:cf --dry-run
```

## Safe Astro Upgrade

```bash
pnpm upgrade:astro -- --lang=en --dry-run
pnpm upgrade:astro -- --lang=zh-tw
npm run upgrade:astro -- --lang=en --dry-run
```

The upgrade script detects Astro-related packages, refuses dirty git state by default, supports pnpm/npm, and verifies with the existing `check`, `lint`, and `build` scripts.

`--lang` only changes the script's console output language. It does not change which packages are upgraded, does not switch site content language, and does not create a separate upgrade flow. Use `--lang=en` for English messages and `--lang=zh-tw` for Traditional Chinese messages.
