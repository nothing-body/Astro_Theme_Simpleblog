# Deployment Guide

This guide is written for first-time users. Complete the shared setup first, then follow only the provider section you need.

## 1. Requirements

- Node.js 22.12 or newer
- Git
- pnpm recommended; npm supported as fallback
- OpenSSH client for VPS deployment
- Docker Engine and Docker Compose on the VPS for the Docker target

```bash
node --version
git --version
pnpm --version
```

If pnpm is missing:

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
```

## 2. Install And Create Local Configuration

```bash
pnpm install
cp .env.example .env
```

PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env
```

Edit `.env`:

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=My Blog
PUBLIC_SITE_AUTHOR=Your Name
PUBLIC_SITE_DESCRIPTION=Notes and guides from my website.
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

Rules:

- `PUBLIC_SITE_URL` must be a clean HTTPS origin without a trailing slash.
- `PUBLIC_CONTACT_EMAIL` is displayed publicly.
- `PUBLIC_GA4_ID` is optional and must look like `G-XXXXXXXXXX`.
- Real `.env*` files are ignored. Commit only `.example` files.
- Examples such as `example.com` and `203.0.113.10` are documentation placeholders.

Verify before deployment:

```bash
pnpm check
pnpm build
pnpm selfcheck -- --quick
```

## 3. Domain, SEO, Search Console, And GA4

Set the final domain in `PUBLIC_SITE_URL` before the production build. The value is used for canonical URLs, hreflang, sitemap, robots.txt, Open Graph, and JSON-LD.

After the site is online:

1. Add the domain to Google Search Console.
2. Submit `https://example.com/sitemap-index.xml`.
3. Use URL Inspection for the home page and one article.
4. Request indexing again only after a failed URL was fixed or an important page changed. You do not need to request every generated page individually.

For HTML-file verification, place Google's file in `public/`, build, deploy, and confirm it is reachable at the site root. Verification files are site-specific; review them before publishing a template fork.

GA4:

1. Create a GA4 web data stream.
2. Copy the Measurement ID beginning with `G-`.
3. Set `PUBLIC_GA4_ID` in `.env` or the hosting platform's build variables.
4. Visitors must consent in the site's privacy panel before GA4 loads.

Cloudflare Web Analytics and GA4 can both be enabled. They are separate systems. Do not manually add a second Cloudflare Beacon when Pages automatic Web Analytics is already enabled.

## 4. Security Headers

The repository maintains equivalent baselines for:

- Cloudflare Pages: `public/_headers`
- Vercel: `vercel.json`
- Nginx/VPS: `deploy/nginx-security-headers.conf`

They include CSP, `X-Content-Type-Options: nosniff`, framing protection, referrer policy, permissions policy, and HSTS. Keep the three CSP values synchronized. Do not add `unsafe-inline`.

The default HSTS intentionally omits `includeSubDomains` and `preload`. Enable them only when every subdomain is permanently HTTPS-only.

## 5. Cloudflare Pages

Create the local file:

```bash
cp .env.cloudflare.example .env.cloudflare
```

Required values:

```env
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_PAGES_PROJECT_NAME=my-blog
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=My Blog
PUBLIC_SITE_AUTHOR=Your Name
PUBLIC_SITE_DESCRIPTION=My website description.
PUBLIC_CONTACT_EMAIL=contact@example.com
```

How to obtain them:

1. Open Cloudflare Dashboard.
2. Copy the Account ID from the account overview/sidebar.
3. Open My Profile > API Tokens > Create Token.
4. Grant the minimum Pages edit permission for the intended account.
5. Use an existing Pages project name, or choose a valid lowercase name. The script can create the project when it does not exist.

Deploy:

```bash
pnpm deploy:cf:only
```

The script checks the project, builds, and runs Wrangler Pages deploy. Secrets remain in `.env.cloudflare` or CI secrets.

Custom domain:

1. Open Workers & Pages > your Pages project > Custom domains.
2. Add the domain.
3. Follow the displayed DNS instructions.
4. Set the same HTTPS origin in `PUBLIC_SITE_URL`, rebuild, and redeploy.

## 6. Vercel

Create `.env.vercel`:

```bash
cp .env.vercel.example .env.vercel
```

```env
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
VERCEL_PROJECT_NAME=astro-theme-simpleblog
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

How to obtain values:

1. Create or import a Vercel project.
2. Open Account Settings > Tokens and create a limited deployment token.
3. Copy the Project ID from Project Settings > General.
4. When deploying to a team, copy the team ID into `VERCEL_ORG_ID`; personal projects may leave it empty if the API token resolves the project.
5. Keep the project name lowercase.

Deploy:

```bash
pnpm deploy:vercel:only
```

The TypeScript deployer uses Vercel's REST file-upload and deployment APIs. It does not require the Vercel CLI and uploads only the reviewed static build output plus a reduced static `vercel.json`.

## 7. Netlify

Create `.env.netlify`:

```bash
cp .env.netlify.example .env.netlify
```

```env
NETLIFY_AUTH_TOKEN=
NETLIFY_SITE_ID=
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

How to obtain values:

1. Create a Netlify site.
2. Open User settings > Applications > Personal access tokens.
3. Create a token and store it only in `.env.netlify` or CI secrets.
4. Open the site's Project configuration > General and copy the Project ID/Site ID.

Deploy:

```bash
pnpm deploy:netlify:only
```

Use preview mode:

```bash
pnpm deploy:switch -- --mode=direct:netlify --netlify-preview --yes
```

The deployer creates a bounded streaming ZIP and sends it through the Netlify API.

## 8. VPS Static Deployment

Generate a key if needed:

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/id_ed25519
```

Install the public key on the VPS:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@example.com
```

Create a pinned host-key file:

```bash
ssh-keyscan -H example.com >> ~/.ssh/known_hosts
```

Verify the fingerprint through your VPS provider console before trusting it.

Create `.env.vps`:

```env
VPS_HOST=203.0.113.10
VPS_USER=deploy
VPS_PORT=22
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts
VPS_TARGET_DIR=/var/www/example.com
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

The deploy user needs write access to `VPS_TARGET_DIR`; do not use root unless required. Configure Nginx or another HTTPS server to serve this directory and include `deploy/nginx-security-headers.conf`.

Deploy:

```bash
pnpm deploy:vps:only
```

The uploader uses rsync when available and OpenSSH scp otherwise. Both paths upload to a staging directory and atomically replace the current deployment with rollback protection.

## 9. VPS Docker

Install Docker Engine and the Compose plugin on the VPS. Create `.env.vps-docker`:

```env
VPS_HOST=203.0.113.10
VPS_USER=deploy
VPS_PORT=22
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts
VPS_DOCKER_APP_DIR=/opt/astro-simpleblog
VPS_DOCKER_PROJECT_NAME=astro-simpleblog
VPS_DOCKER_BIND_ADDRESS=127.0.0.1
VPS_DOCKER_HTTP_PORT=8080
VPS_DOCKER_ALLOW_PUBLIC_BIND=0
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

Deploy:

```bash
pnpm deploy:vps-docker:only
```

The container runs Nginx as a non-root user, drops Linux capabilities, uses a read-only filesystem, and binds to loopback by default. Put an HTTPS reverse proxy in front of `127.0.0.1:8080`. Do not set `0.0.0.0` unless the VPS firewall is configured and `VPS_DOCKER_ALLOW_PUBLIC_BIND=1`.

## 10. Supabase Edge Functions

Supabase Edge Functions do **not** host this Astro static site. This target deploys TypeScript backend functions only.

Create:

```text
supabase/functions/hello/index.ts
```

Example:

```ts
Deno.serve(() => Response.json({ status: 'ok' }));
```

Create `.env.supabase`:

```env
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

Get the token from Supabase Account Settings > Access Tokens. The project ref is visible in the dashboard URL: `/project/<project-ref>`.

Deploy all functions:

```bash
pnpm deploy:supabase:only
```

Deploy one:

```bash
pnpm deploy:switch -- --mode=direct:supabase --supabase-function=hello --yes
```

Keep service-role keys and function secrets in Supabase Secrets/Vault, never in `PUBLIC_` variables or committed source.

## 11. GitHub, GitLab, And Codeberg

Included files:

- GitHub Actions: `.github/workflows/deploy.yml`
- GitLab CI: `.gitlab-ci.yml`
- Codeberg/Woodpecker: `.woodpecker.yml`
- Cross-platform validation: `.github/workflows/cross-platform.yml`

Add provider tokens, IDs, and SSH keys in each platform's encrypted Secrets/Variables UI. Do not paste them into YAML.

The Git deployment modes push source to an already configured remote:

```bash
pnpm deploy:switch -- --mode=github:cf --git-remote=origin --git-branch=main --dry-run
pnpm deploy:switch -- --mode=gitlab:netlify --dry-run
pnpm deploy:switch -- --mode=codeberg:vps-docker --dry-run
```

Review the plan before removing `--dry-run`.

## 12. Menu, Shortcuts, And Combined Deployment

There are three supported ways to deploy.

### Interactive menu

```bash
pnpm deploy:menu
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:menu -- --lang=zh-cn
```

The menu asks for a language, deployment mode, optional flags, and final confirmation. It shows the exact command before execution. Choose **dry run** first when configuring a new target.

### Single-target shortcuts

| Command                       | Target                       |
| ----------------------------- | ---------------------------- |
| `pnpm deploy:cf:only`         | Cloudflare Pages             |
| `pnpm deploy:vercel:only`     | Vercel production            |
| `pnpm deploy:netlify:only`    | Netlify production           |
| `pnpm deploy:vps:only`        | Static VPS directory         |
| `pnpm deploy:vps-docker:only` | VPS Docker                   |
| `pnpm deploy:supabase:only`   | Supabase Edge Functions only |

Single-target shortcuts start after environment and project checks; they do not show the `deploy:switch` confirmation prompt.

### Combined shortcuts

| Command                               | Exact targets                                      |
| ------------------------------------- | -------------------------------------------------- |
| `pnpm deploy:all`                     | Cloudflare + VPS + Vercel                          |
| `pnpm deploy:all:static`              | Cloudflare + VPS + VPS Docker + Vercel + Netlify   |
| `pnpm deploy:all:including-functions` | All static targets above + Supabase Edge Functions |

`deploy:all:including-functions` requires at least one valid `supabase/functions/<name>/index.ts`.

## 13. `deploy:switch` Command Reference

General syntax:

```bash
pnpm deploy:switch -- --mode=<provider>:<target+target> [options]
```

Use `direct` to deploy from the current computer:

```bash
pnpm deploy:switch -- --mode=direct:cf+netlify --dry-run
pnpm deploy:switch -- --mode=direct:cf+netlify --yes
```

Use `github`, `gitlab`, or `codeberg` to push source to an existing Git remote. These modes do not upload the site directly; the matching CI file performs deployment:

```bash
pnpm deploy:switch -- --mode=github:cf+vercel --git-remote=origin --git-branch=main
```

Supported options:

| Option                       | Meaning                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `--dry-run`                  | Print the plan only. It does not build, validate credentials, push, or upload.    |
| `--yes` / `-y`               | Skip only the `deploy:switch` confirmation. Normal project checks still run.      |
| `--skip-clean`               | Keep the existing output directory before rebuilding. It does not skip the build. |
| `--dist=<dir>`               | Use a safe project-local output directory for Cloudflare, Netlify, or static VPS. |
| `--cf-project=<name>`        | Override the Cloudflare Pages project name.                                       |
| `--cf-branch=<branch>`       | Override the Cloudflare Pages deployment branch.                                  |
| `--cf-env=<file>`            | Use another root-level Cloudflare `.env*` file.                                   |
| `--vps-env=<file>`           | Use another root-level static VPS `.env*` file.                                   |
| `--vps-docker-env=<file>`    | Use another root-level VPS Docker `.env*` file.                                   |
| `--vercel-env=<file>`        | Use another root-level Vercel `.env*` file.                                       |
| `--vercel-preview`           | Create a Vercel preview instead of production deployment.                         |
| `--netlify-env=<file>`       | Use another root-level Netlify `.env*` file.                                      |
| `--netlify-preview`          | Create a Netlify draft/preview deployment.                                        |
| `--supabase-env=<file>`      | Use another root-level Supabase `.env*` file.                                     |
| `--supabase-function=<name>` | Deploy only one existing TypeScript Edge Function.                                |
| `--git-remote=<name>`        | Select an already configured Git remote name.                                     |
| `--git-branch=<name>`        | Select the validated branch to push.                                              |
| `--git-set-upstream`         | Add `git push --set-upstream`.                                                    |
| `--git-follow-tags`          | Add `git push --follow-tags`.                                                     |
| `--lang=<language>`          | Select console language: `en`, `zh-tw`, or `zh-cn`.                               |

Environment overrides accept only regular root-level `.env` or `.env.*` files. Traversal paths and symbolic links are rejected.

For npm, retain the argument separator:

```bash
npm run deploy:switch -- --mode=direct:cf --dry-run
```

Normal direct deployment checks `.gitignore`, runs `pnpm check` once through the switch, then each selected deployer builds and uploads its reviewed output. Run `pnpm analyze` before a release when you also need OSV, production-output, all-mode dry-run, and E2E validation.

## 14. Optional OpenPhish External-Link Check

The public template intentionally contains no private OpenPhish runtime. Follow [OPENPHISH_GUIDE.en.md](./OPENPHISH_GUIDE.en.md) to build it separately.

Important boundaries:

- Check licensing and permitted use first.
- Keep the raw feed, hash buckets, storage IDs, sync token, and backend secrets private.
- Frontend debounce is not a security boundary; configure WAF/provider rate limiting.
- Store destinations in a URL fragment, validate and normalize URLs server-side, use bounded requests/responses, and fail closed.
- Cloudflare KV requires binding-name-compatible code and metadata-last A/B publication because reads are eventually consistent.

## 15. Pre-Release Verification

```bash
pnpm check
pnpm audit:security
pnpm build
pnpm test:e2e
pnpm analyze
```

Before pushing a public repository, also run:

```bash
git status --short
git ls-files
```

Confirm no real `.env`, tokens, keys, private articles, private images, generated `dist`, `.wrangler`, `.vercel`, `.netlify`, or `.supabase` state is tracked.
