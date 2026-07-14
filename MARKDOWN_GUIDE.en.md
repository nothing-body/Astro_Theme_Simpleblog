# SimpleBlog Content And Configuration Guide

This guide covers Markdown posts, multilingual routing, pinned posts, project settings, privacy, self-checks, and automated deployment.

Language versions: [繁體中文](./MARKDOWN_GUIDE.zh-TW.md) | [简体中文](./MARKDOWN_GUIDE.zh-CN.md)

## 1. First Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Windows PowerShell users can run `Copy-Item .env.example .env`. Set at least:

pnpm is the primary and recommended package manager because `package.json` pins its version and the repository commits `pnpm-lock.yaml`. npm remains a fallback for systems where pnpm is unavailable.

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

Use your real public URL and public contact email in `.env`. Keep `.env` uncommitted.

## 2. Important Files

| File or folder | Purpose |
| --- | --- |
| `src/content/blog/en/` | English posts |
| `src/content/blog/zh-tw/` | Traditional Chinese posts |
| `src/content/blog/zh-cn/` | Simplified Chinese posts |
| `src/content.config.ts` | Frontmatter schema and validation |
| `src/lib/site.ts` | Site name, default author, description, URL helpers |
| `src/i18n/ui.ts` | Interface text for all languages |
| `src/components/BookmarkLinks.astro` | Default bookmark groups and links |
| `public/_headers` | Cloudflare security and cache headers |
| `vercel.json` | Vercel security and cache headers |
| `deploy/nginx-security-headers.conf` | Nginx security-header include for VPS hosting |
| `public/_redirects` | Static redirects |
| `astro.config.ts` | Astro, Markdown, sitemap, SEO, and build integrations |
| `.env.example` | Public site setting template |
| `.env.cloudflare.example` | Cloudflare deployment template |
| `.env.vps.example` | VPS deployment template |
| `.env.vercel.example` | Vercel deployment template |
| `.github/workflows/deploy.yml` | GitHub Actions deployment |
| `.gitlab-ci.yml` | GitLab CI deployment |
| `.woodpecker.yml` | Woodpecker/Codeberg deployment |
| `scripts/analysis.ts` | Full project self-check |

Commit only `.example` environment files. Never commit real tokens, keys, account IDs, SSH passphrases, private articles, personal images, generated `dist`, or `.astro` cache data.

## 3. Create A Post

Use the same filename for translated versions:

```text
src/content/blog/en/my-first-post.md
src/content/blog/zh-tw/my-first-post.md
src/content/blog/zh-cn/my-first-post.md
```

They generate:

```text
/posts/my-first-post/
/zh-tw/posts/my-first-post/
/zh-cn/posts/my-first-post/
```

If a translation does not exist, the language switcher does not invent a nonexistent article URL.

## 4. Frontmatter Reference

```yaml
---
title: 'Post title'
description: 'A short summary for search results and cards.'
pubDate: 2026-07-14
updatedDate: 2026-07-15
category: 'Guide'
categoryPath: ['Guide', 'Astro']
tags: ['Astro', 'Website Setup']
author: 'Your Name'
pinned: false
pinOrder: 1
draft: false
ogImage: 'https://example.com/images/post-cover.png'
---
```

- `title`, `description`, and `pubDate` are required. Descriptions must contain 12 to 300 characters.
- `categoryPath` supports one to five non-empty levels.
- `tags` must be a YAML array.
- `pinned`, `draft` are booleans, not quoted strings.
- `pinOrder` accepts integers from 1 to 9999.
- `ogImage` must use `/images/...` or an HTTPS URL. Omit it when no public image exists.
- `draft: true` excludes the post from the generated public site.

## 5. Pin Posts

```yaml
pinned: true
pinOrder: 1
```

Pinned posts appear before normal posts. Smaller `pinOrder` values appear first. Use unique, simple integers. To unpin a post, remove both fields or set `pinned: false`.

Do not give every translated version a different `pinOrder`; matching translations should have matching priority.

## 6. Markdown Safety

- Prefer normal Markdown links instead of raw HTML.
- External HTTP/HTTPS links are routed through the localized leaving-notice page.
- Do not paste scripts, API keys, access tokens, private hostnames, internal IP addresses, or personal filesystem paths into posts.
- Posts use `.md`. Executable imports, exports, JSX, and embedded scripts are intentionally unsupported; add reviewed presentation features through the shared layout or Markdown processor instead.
- Put public assets in `public/`; do not copy private photos or the private site's image directory into a public template.

## 7. Site Customization

1. Edit `src/lib/site.ts` for the public site name, author, and default description.
2. Edit `src/i18n/ui.ts` so welcome text matches the site name in all languages.
3. Review About, Contact, Privacy, and Disclaimer pages in all three route folders.
4. Edit `src/components/BookmarkLinks.astro` or remove links you do not want to recommend.
5. Configure your real URL and contact email in `.env`, not in committed source examples.
6. Keep `example.com`, `203.0.113.10`, and placeholder tokens in public documentation as examples.

## 8. Automated Deployment

Safely preview generated deployment commands:

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vercel --dry-run
```

Interactive menu:

```bash
pnpm deploy:menu
```

Direct targets:

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

The deployment scripts run the project's `check` and `build` commands, then upload only generated output. Process/CI environment variables take priority over local env files, so a stale local value cannot silently replace an injected CI secret.

Configure secrets in the selected Git provider, not in YAML:

- Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT_NAME`.
- VPS: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_TARGET_DIR`, SSH private key secret.
- Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Shared public settings: `PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL`, optional `PUBLIC_GA4_ID`.

## 9. Verify Before Publishing

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm selfcheck
```

The full self-check runs type checks, linting, tests, a clean production build, Astro dev startup, deployment dry-runs, security scans, content provenance, SEO, sitemap/hreflang, landmark, and sensitive-file checks.

The build cleans `.astro` and `dist` first. This prevents deleted or private posts from surviving in stale generated content.

Before pushing to a public repository, search once more for real domains, email addresses, tokens, account IDs, private keys, verification files, private article titles, and image filenames.
