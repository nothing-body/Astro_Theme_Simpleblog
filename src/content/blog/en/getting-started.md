---
title: Getting Started With This Astro Blog
description: A safe example post included so a fresh public clone can build, preview, and deploy immediately.
pubDate: 2026-01-01
updatedDate: 2026-01-01
category: Guide
tags:
  - Astro
  - Template
  - Deployment
author: Astro Blog Template
draft: false
---

Welcome to your new Astro blog template.

This public version includes one real example post so the homepage, post list, category pages, tag pages, sitemap, and deployment scripts work immediately after cloning.

## What to edit first

1. Update `PUBLIC_SITE_URL` in your environment file.
2. Replace this post with your own content.
3. Review `src/i18n/ui.ts` for site text.
4. Review `public/_headers` before deploying to production.

## Deployment

Use the bilingual deployment menu:

```bash
pnpm deploy:menu
npm run deploy:menu
```

The direct deployment scripts build the site first, then upload the generated output directory.
