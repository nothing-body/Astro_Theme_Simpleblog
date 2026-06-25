---
title: 'How to Pin Posts'
description: 'How to pin one or more posts in this Astro static blog with pinned and pinOrder.'
pubDate: 2026-05-24
category: 'Website'
categoryPath: ['Website', 'Astro']
tags: ['Astro', 'Website Setup']
author: 'Tena'
pinned: true
pinOrder: 1
---

Public GitHub repository: [nothing-body/Astro_Theme_Simpleblog](https://github.com/nothing-body/Astro_Theme_Simpleblog).

This post is itself an example of a pinned post.

Add `pinned: true` to a post frontmatter and the post will appear before regular posts on the home page, all-posts pages, paginated lists, category pages, and tag pages. The sorting happens during the static build, so it does not require a database, login system, or client-side write feature.

## Pin One Post

```yaml
---
title: 'Post title'
pubDate: 2026-05-24
pinned: true
pinOrder: 1
---
```

`pinned: true` marks the post as pinned.

`pinOrder` controls the order between pinned posts. Smaller numbers appear first.

## Pin Multiple Posts

If multiple posts use `pinned: true`, give each one a clear `pinOrder`:

```yaml
pinned: true
pinOrder: 1
```

```yaml
pinned: true
pinOrder: 2
```

Pinned posts are sorted by `pinOrder`; regular posts are still sorted by publish date, newest first.

## Unpin A Post

Set `pinned` to `false`, or remove both `pinned` and `pinOrder`.

```yaml
pinned: false
```

## Maintenance Notes

Use simple integers for `pinOrder`, such as `1`, `2`, and `3`. Do not treat it as a date, formula, or complex priority system.

This feature only reads post frontmatter. It does not execute arbitrary code from posts and does not accept visitor input. After changing pinned posts, rebuild the site and deploy the generated `dist` directory.
