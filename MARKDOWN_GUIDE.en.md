# Markdown Writing Guide

This guide explains how to write `.md` and `.mdx` posts for this Astro multilingual blog template.

## Content Folders

Posts live in language-specific folders:

```text
src/content/blog/en/
src/content/blog/zh-tw/
src/content/blog/zh-cn/
```

Use the same slug when a post has translated versions:

```text
src/content/blog/en/my-first-post.md
src/content/blog/zh-tw/my-first-post.md
src/content/blog/zh-cn/my-first-post.md
```

These generate `/posts/my-first-post`, `/zh-tw/posts/my-first-post`, and `/zh-cn/posts/my-first-post`.

## Frontmatter

Every post starts with frontmatter between `---` markers:

```markdown
---
title: 'Post title'
description: 'A short summary for post cards and SEO.'
pubDate: 2026-05-24
updatedDate: 2026-06-19
category: 'Site Setup'
tags: ['Astro', 'Markdown']
author: 'Astro Blog Template'
draft: false
pinned: false
pinOrder: 10
---

Write your post content here.
```

## Frontmatter Fields

| Field         | Required | Notes                                               |
| ------------- | -------- | --------------------------------------------------- |
| `title`       | Yes      | Post title. Keep it clear and not too long.         |
| `description` | Yes      | Short summary for cards, SEO, and social previews.  |
| `pubDate`     | Yes      | Publish date in `YYYY-MM-DD` format.                |
| `updatedDate` | No       | Last meaningful update date in `YYYY-MM-DD` format. |
| `category`    | No       | Single category name.                               |
| `tags`        | No       | Array such as `['Astro', 'Markdown']`.              |
| `author`      | No       | Defaults depend on project configuration.           |
| `draft`       | No       | `true` hides the post from published lists.         |
| `pinned`      | No       | `true` pins the post.                               |
| `pinOrder`    | No       | Lower numbers appear earlier among pinned posts.    |
| `ogImage`     | No       | Social preview image path or URL.                   |

## Drafts

Use `draft: true` while writing:

```yaml
draft: true
```

Set it to `false` before publishing:

```yaml
draft: false
```

## Pinned Posts

Pin a post:

```yaml
pinned: true
pinOrder: 1
```

Use `pinOrder` when multiple posts are pinned. Smaller numbers appear first.

## Headings

Use one `#` heading only if the article really needs it. Usually the frontmatter `title` already provides the page title, so article sections should start at `##`.

```markdown
## Main Section

### Subsection
```

## Links

Markdown HTTP/HTTPS links that point to another origin are rewritten at build time to the external-link notice page.

```markdown
[Example](https://example.com)
```

Internal links should use site paths:

```markdown
[About](/about)
[繁體中文關於頁](/zh-tw/about)
```

Do not paste tokens, private dashboard URLs, private IPs, or internal hostnames into posts that will be published.

## Images

Put public images under `public/images/`:

```text
public/images/example.png
```

Reference them from Markdown with an absolute site path:

```markdown
![Descriptive alt text](/images/example.png)
```

Use meaningful alt text for accessibility and SEO.

## Code Blocks

Use fenced code blocks and include a language when possible:

````markdown
```bash
pnpm install
pnpm build
```
````

Common languages:

```text
bash
powershell
js
ts
html
css
yaml
json
dockerfile
nginx
```

## Tables

```markdown
| Name     | Notes                 |
| -------- | --------------------- |
| Astro    | Static site framework |
| Markdown | Writing format        |
```

## Footnotes

```markdown
This sentence has a note.[^note]

[^note]: This is the footnote text.
```

## Raw HTML

Avoid raw HTML in Markdown unless it is necessary. Do not add `<script>`, iframe embeds, or untrusted HTML to posts. Use Astro components when interactive or trusted markup is required.

## Safety Checklist

Before publishing, make sure the post does not include:

- API keys or provider tokens
- Cloudflare, Vercel, GitHub, GitLab, or Codeberg tokens
- VPS IP addresses, SSH private keys, or SSH passphrases
- Session cookies or private dashboard URLs
- Personal data that should not be public

## Verification

After editing posts, run:

```bash
pnpm check
pnpm lint
pnpm build
pnpm selfcheck -- --quick
```

If using npm:

```bash
npm run check
npm run lint
npm run build
```
