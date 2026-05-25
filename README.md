# Astro Multilingual Blog Template

A public-safe multilingual Astro static blog template with deployment automation for Cloudflare Pages, VPS, and Vercel.

<p align="center">
  <a href="https://blog.ouoxo.com/en/">Live Demo</a>
  &middot;
  <a href="./README.zh-TW.md">繁體中文 README</a>
</p>

## Guides

- [Markdown writing guide](./MARKDOWN_GUIDE.md)
- [Bookmark guide](./BOOKMARKS_GUIDE.en.md)
- [Traditional Chinese bookmark guide](./BOOKMARKS_GUIDE.zh-TW.md)
- [Deployment guide](./DEPLOYMENT.en.md)
- [Traditional Chinese deployment guide](./部屬前須知.md)
- [Scripts overview](./scripts/README.en.md)

## Project Structure

```text
.
|-- public/
|   |-- _headers
|   |-- google6985a4c1e557f41b.html
|   `-- images/
|-- scripts/
|   |-- deploy_menu.mjs
|   |-- deploy_switch.mjs
|   |-- deploy_lib.mjs
|   |-- uploaddist_cf.mjs
|   |-- uploaddist_vps.mjs
|   |-- uploaddist_vercel.mjs
|   |-- upgrade_astro.mjs
|   `-- README.en.md
|-- src/
|   |-- components/
|   |-- content/blog/
|   |   |-- zh-tw/
|   |   |-- en/
|   |   `-- zh-cn/
|   |-- i18n/
|   |-- layouts/
|   |-- lib/
|   |-- pages/
|   |   |-- en/
|   |   |-- zh-cn/
|   |   `-- index.astro
|   `-- styles/
|-- astro.config.mjs
|-- package.json
|-- DEPLOYMENT.en.md
`-- 部屬前須知.md
```

Traditional Chinese is the default locale and uses the root route `/`. English uses `/en/`, and Simplified Chinese uses `/zh-cn/`.

## Quick Start

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

The project also supports npm:

```bash
npm install
npm run build
```

## Deployment

Use the menu script for guided deployment:

```bash
pnpm deploy:menu
```

Direct deployment commands:

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Read [DEPLOYMENT.en.md](./DEPLOYMENT.en.md) before deploying. Create local `.env` files from the example files and never commit secrets.

## Maintenance

- Run `pnpm selfcheck -- --quick` before publishing or deploying.
- Run `pnpm upgrade:astro` to use the safe Astro upgrade workflow.
- Keep code comments in English to avoid cross-platform encoding problems.
- Do not re-add PurgeCSS unless there is a measured CSS-size issue and a complete visual test plan.
