---
title: 'How to Pin Posts'
description: 'How to pin one or more posts in this Astro static blog with pinned and pinOrder.'
pubDate: 2026-05-24
category: 'Site Setup'
tags: ['Astro', 'Pinned Posts', 'Site Setup']
author: 'Astro Blog Template'
pinned: true
pinOrder: 1
---

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

After changing pinned posts, rebuild the site and deploy the generated `dist` directory.
