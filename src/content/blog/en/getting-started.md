---
title: Getting Started With This Astro Blog
description: A current guide to the multilingual Astro blog structure, content workflow, external-link notice page, and deployment checks.
pubDate: 2026-01-01
updatedDate: 2026-06-19
category: Guide
tags:
  - Astro
  - Template
  - Deployment
author: Astro Blog Template
draft: true
---

This Astro blog is a static, multilingual template with English, Traditional Chinese, and Simplified Chinese routes. It is designed to work as a personal blog, a public starter, or a deployment-ready static site.

## Project layout

- `src/content/blog/en/` stores English posts.
- `src/content/blog/zh-tw/` stores Traditional Chinese posts.
- `src/content/blog/zh-cn/` stores Simplified Chinese posts.
- `src/pages/`, `src/pages/zh-tw/`, and `src/pages/zh-cn/` define the matching language routes.
- `src/components/` contains shared UI such as navigation, pagination, post cards, sidebars, cookie settings, and the external-link warning page.
- `src/i18n/ui.ts` stores interface text for all supported languages.

For translated posts, keep the same slug in all three language folders when possible. For example, `getting-started.md` becomes `/posts/getting-started`, `/zh-tw/posts/getting-started`, and `/zh-cn/posts/getting-started`.

## Writing posts

Each post uses frontmatter for metadata:

```yaml
title: Post title
description: Short summary for SEO and cards
pubDate: 2026-01-01
updatedDate: 2026-06-19
category: Guide
tags:
  - Astro
draft: true
```

Set `draft: true` to keep a post out of the generated site. Add `pinned: true` if you want a post to appear before regular posts on home, post list, category, and tag pages.

## External links

Markdown and MDX external `http` and `https` links are rewritten at build time to a local leaving page:

- English: `/leaving?to=...`
- Traditional Chinese: `/zh-tw/leaving?to=...`
- Simplified Chinese: `/zh-cn/leaving?to=...`

The leaving page does not auto-redirect. It shows the destination and asks the visitor to continue manually.

## Environment and privacy

Use `.env.example`, `.env.cloudflare.example`, `.env.vercel.example`, and `.env.vps.example` as templates. Do not commit real `.env` files, API tokens, private keys, provider account IDs, or site-verification files.

For a public fork or public template, keep project names, domains, analytics IDs, contact email addresses, and deployment targets generic unless they are meant to be public.

## Build and deploy

Use these commands during development:

```bash
pnpm install
pnpm dev
pnpm build
```

Deployment helpers are available for Cloudflare Pages, VPS upload, and Vercel:

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf
```

Before publishing a public version, run `pnpm build`, check the generated pages, and scan for private values such as real domains, tokens, keys, or verification files.
