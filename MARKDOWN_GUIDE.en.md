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
PUBLIC_SITE_NAME=My Blog
PUBLIC_SITE_AUTHOR=Your Name
PUBLIC_SITE_DESCRIPTION=Notes, guides, and articles from my website.
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

Use your real public URL and public contact email in `.env`. Keep `.env` uncommitted.

## 2. Important Files

| File or folder                       | Purpose                                               |
| ------------------------------------ | ----------------------------------------------------- |
| `src/content/blog/en/`               | English posts                                         |
| `src/content/blog/zh-tw/`            | Traditional Chinese posts                             |
| `src/content/blog/zh-cn/`            | Simplified Chinese posts                              |
| `src/content/blog/_assets/`          | Shared article images processed by Astro              |
| `src/content.config.ts`              | Frontmatter schema and validation                     |
| `src/lib/site.ts`                    | Validated site-setting and URL helpers                |
| `src/i18n/ui.ts`                     | Interface text for all languages                      |
| `src/components/BookmarkLinks.astro` | Default bookmark groups and links                     |
| `public/_headers`                    | Cloudflare security and cache headers                 |
| `vercel.json`                        | Vercel security and cache headers                     |
| `deploy/nginx-security-headers.conf` | Nginx security-header include for VPS hosting         |
| `public/_redirects`                  | Static redirects                                      |
| `astro.config.ts`                    | Astro, Markdown, sitemap, SEO, and build integrations |
| `.env.example`                       | Public site setting template                          |
| `.env.cloudflare.example`            | Cloudflare deployment template                        |
| `.env.vercel.example`                | Vercel deployment template                            |
| `.env.netlify.example`               | Netlify deployment template                           |
| `.env.supabase.example`              | Supabase Edge Functions deployment template           |
| `.env.vps.example`                   | VPS static deployment template                        |
| `.env.vps-docker.example`            | VPS Docker deployment template                        |
| `.github/workflows/deploy.yml`       | GitHub Actions deployment                             |
| `.gitlab-ci.yml`                     | GitLab CI deployment                                  |
| `.woodpecker.yml`                    | Woodpecker/Codeberg deployment                        |
| `scripts/analysis.ts`                | Full project self-check                               |

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

- Use normal Markdown syntax. Raw HTML is rejected during both content checks and production builds.
- External HTTP/HTTPS links keep their direct destination and receive `noopener noreferrer`.
- Do not paste scripts, API keys, access tokens, private hostnames, internal IP addresses, or personal filesystem paths into posts.
- Posts use `.md`. Executable imports, exports, JSX, and embedded scripts are intentionally unsupported; add reviewed presentation features through the shared layout or Markdown processor instead.
- Put favicons, verification files, and other intentionally unprocessed site assets in `public/`. Article images belong in `src/content/blog/_assets/`; never copy private photos into a public template.

### Article images

Store an image once in `src/content/blog/_assets/`, then reference it from each translated post with meaningful localized alt text:

```md
![Settings page with two-factor authentication enabled](../_assets/security-settings.png)
```

Astro generates optimized responsive files, `srcset`, `sizes`, intrinsic dimensions, lazy loading, and asynchronous decoding. A first image within the first 12 source lines is treated as a possible LCP image and loaded eagerly; later images remain lazy.

Only AVIF, JPEG, PNG, and WebP article images are accepted. Keep each source below 512 KiB when possible. The self-check rejects files above 2 MiB, either edge above 6000 pixels, or more than 12 million pixels. Remote images, `/images/...` body references, SVG, GIF, data URLs, query strings, and paths escaping `_assets` are rejected. `ogImage` is separate metadata and may still use its documented `/images/...` or HTTPS value.

### Article search

Production builds run Pagefind after Astro and index only article headers and bodies marked in `src/layouts/BlogPostLayout.astro`. The localized `/search/`, `/zh-tw/search/`, and `/zh-cn/search/` pages support title-weighted BM25-style ranking plus category and tag filters. Search is generated after `astro build`, so test it with `pnpm build` followed by `pnpm preview`, not the development server alone.

The browser controller is `src/scripts/search.ts`. It validates same-origin result URLs and creates result elements with DOM APIs and `textContent`; do not replace this with raw `innerHTML`. Pagefind requires the narrowly scoped `'wasm-unsafe-eval'` CSP source and `worker-src 'self' blob:`. Do not edit generated files under `dist/pagefind/` because every build replaces them.

Pagefind does not currently provide stemming for `zh-cn` or `zh-tw`. The repeated build Note is expected: Chinese search and filters still work, but root-word expansion is unavailable. To hide informational notes, add `--quiet` to only the Pagefind segment of the `build` script:

```text
pagefind --site dist --glob "**/index.html" --quiet
```

`--quiet` keeps warnings and errors. `--silent` keeps errors only, so use it only when suppressing warnings is deliberate.

## 7. Site Customization

1. Set `PUBLIC_SITE_NAME`, `PUBLIC_SITE_AUTHOR`, and `PUBLIC_SITE_DESCRIPTION` in `.env`. Do not hard-code personal values in `src/lib/site.ts`.
2. Edit `src/i18n/ui.ts` only when you want to change shared interface wording in all languages.
3. Review About, Contact, Privacy, and Disclaimer pages in all three route folders.
4. Edit `src/components/BookmarkLinks.astro` or remove links you do not want to recommend.
5. Configure your real URL and contact email in `.env`, not in committed source examples.
6. Keep `example.com`, `203.0.113.10`, and placeholder tokens in public documentation as examples.

## 8. Automated Deployment

Safely preview generated deployment commands:

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vps-docker+vercel+netlify --dry-run
```

Interactive menu:

```bash
pnpm deploy:menu
```

Direct targets:

```bash
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
pnpm deploy:all:static
```

The deployment scripts run the project's `check` and `build` commands, then upload only generated output. Process/CI environment variables take priority over local env files, so a stale local value cannot silently replace an injected CI secret.

Configure secrets in the selected Git provider, not in YAML:

- Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT_NAME`.
- Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Netlify: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.
- VPS: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_TARGET_DIR`, SSH private key and pinned known-hosts data.
- VPS Docker: the VPS values plus `VPS_DOCKER_APP_DIR`, project name, bind address, and port.
- Supabase: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`. This target deploys TypeScript Edge Functions; it does not host the Astro static site.
- Shared public settings: `PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL`, optional `PUBLIC_GA4_ID`.

The public template does not include a private OpenPhish runtime. [OPENPHISH_GUIDE.en.md](./OPENPHISH_GUIDE.en.md) explains how to build an optional separate service without committing feed data, storage IDs, or secrets.

## 9. Verify Before Publishing

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm selfcheck
```

The full self-check runs type checks, linting, tests, a clean production build, generated-output inspection, deployment dry-runs, dependency security scans, content provenance, SEO, sitemap/hreflang, browser behavior, and sensitive-file checks.

The build cleans `.astro` and `dist` first. This prevents deleted or private posts from surviving in stale generated content.

Before pushing to a public repository, search once more for real domains, email addresses, tokens, account IDs, private keys, verification files, private article titles, and image filenames.
