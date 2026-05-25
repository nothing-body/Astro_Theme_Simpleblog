# Pre-Deployment Guide

This guide explains how to prepare, verify, upgrade, and deploy this Astro blog project. The scripts are written for this project, but they avoid unnecessary coupling: direct deployment runs the package `build` script and uploads the generated output directory, which defaults to `dist`.

## 1. Requirements

Recommended runtime:

```bash
node --version
pnpm --version
npm --version
```

Node.js 22.12.0 or newer is recommended. pnpm is preferred, but npm is supported.

If pnpm is missing:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 2. Install, Check, Build

pnpm:

```bash
pnpm install
pnpm check
pnpm lint
pnpm build
```

npm:

```bash
npm install
npm run check
npm run lint
npm run build
```

`build` generates the deployment output directory. The default is `dist`.

## 3. Site URL, SEO, and Robots

Set your production URL:

```env
PUBLIC_SITE_URL=https://example.com
```

For a public website, `robots.txt` should allow normal search engines while blocking only unwanted AI/data crawlers. The intended behavior is:

```txt
User-agent: Googlebot
Allow: /

User-agent: *
Allow: /

Sitemap: https://example.com/sitemap-index.xml
```

If `User-agent: *` is set to `Disallow: /`, Google Search Console may report that indexing is blocked, and the site may not appear in Google search even when searching the exact URL.

## 4. Google Search Console Verification

For HTML file verification, put the file provided by Google Search Console in `public/`.

Example:

```text
public/googlexxxxxxxxxxxxxxxx.html
```

The file content should match Google's required format:

```text
google-site-verification: googlexxxxxxxxxxxxxxxx.html
```

After `pnpm build`, Astro copies files from `public/` to the site root. After deployment, this URL must be reachable:

```text
https://example.com/googlexxxxxxxxxxxxxxxx.html
```

Then click Verify in Google Search Console.

## Homepage Bookmarks

The bookmark section under the homepage latest-posts block is managed by `src/components/BookmarkLinks.astro`. All three locale homepages reuse this component.

Bookmark data lives in the `bookmarkRows` array. Each nested array is rendered as one visual row:

```ts
const bookmarkRows = [
  [{ label: 'GitHub', href: 'https://github.com/' }],
  [
    { label: 'nodeseek', href: 'https://www.nodeseek.com/' },
    { label: 'LowEndTalk', href: 'https://lowendtalk.com/' },
  ],
];
```

To add a bookmark, add a `{ label, href }` object to the row where you want it to appear:

```ts
{ label: 'ipaddress', href: 'https://ipaddress.my/' },
```

To remove a bookmark, delete its `{ label, href }` object.

To add another row, add a new nested array inside `bookmarkRows`:

```ts
[
  { label: 'Example', href: 'https://example.com/' },
],
```

Notes:

- External links use `target="_blank"` and `rel="noopener noreferrer"` so the new tab cannot access `window.opener`.
- Prefer `https://` URLs and avoid untrusted links or links that redirect to unsafe destinations.
- After editing bookmarks, run `pnpm check`, `pnpm lint`, and `pnpm build`.

## 5. Google Analytics

GA4 is controlled by:

```env
PUBLIC_GA4_ID=G-XXXXXXXXXX
```

The project only loads GA4 when:

- `PUBLIC_GA4_ID` is set and matches the `G-...` format.
- The visitor allows analytics in the privacy/cookie settings.
- `public/_headers` CSP allows Google Tag Manager and Google Analytics. This project already includes the needed Google domains.

## 6. Cloudflare Pages

Create `.env.cloudflare`:

```bash
cp .env.cloudflare.example .env.cloudflare
```

Typical values:

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_PAGES_PROJECT_NAME=your-pages-project-name
PUBLIC_SITE_URL=https://example.com
```

Notes:

- `CLOUDFLARE_PAGES_PROJECT_NAME` is the Cloudflare Pages project name.
- If the project does not exist, the script creates it, writes the name back to `.env.cloudflare`, and continues.
- Review `public/_headers` before production deployment.

Place Cloudflare Pages headers in `public/_headers`. Astro copies it to `dist/_headers` during build, and Cloudflare Pages applies it automatically. If you do not use GA4, remove the Google Tag Manager and Google Analytics domains from the CSP.

Secure example:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
  Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; script-src-attr 'none'; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
  Cache-Control: public, max-age=300, stale-while-revalidate=86400

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=86400
```

Deploy:

```bash
pnpm deploy:cf:only
npm run deploy:cf:only
```

## 7. VPS

Create `.env.vps`:

```bash
cp .env.vps.example .env.vps
```

Typical values:

```env
VPS_HOST=xxx.xxx.xxx
VPS_PORT=22
VPS_USER=deploy
VPS_TARGET_DIR=/var/www/example.com
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_SSH_PASSPHRASE=your_private_key_passphrase
```

Notes:

- `VPS_USER` is the SSH/rsync user used for upload. It may be `root`, `deploy`, `ubuntu`, or another account.
- Prefer `ssh-agent` for passphrase-protected private keys.
- `VPS_SSH_PASSPHRASE` must only live in a local uncommitted `.env.vps` or CI/CD secret.
- If `VPS_USER` is not root and cannot write to `/var/www/...`, upload to a directory such as `/home/<user>/site-dist`, then move or sync the build output to the directory served by the web server.

Deploy:

```bash
pnpm deploy:vps:only
npm run deploy:vps:only
```

## 8. Vercel

Create `.env.vercel`:

```bash
cp .env.vercel.example .env.vercel
```

Typical values:

```env
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_or_user_id
VERCEL_PROJECT_ID=your_project_id
```

Deploy:

```bash
pnpm deploy:vercel:only
npm run deploy:vercel:only
```

## 9. Bilingual Deployment Menu

Interactive menu:

```bash
pnpm deploy:menu
npm run deploy:menu
```

Choose a language first, then choose the deployment area.

Direct language selection:

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
npm run deploy:menu -- --lang=en
```

Non-interactive language selection:

```bash
pnpm deploy:switch --mode=direct:cf --lang=en
pnpm deploy:switch --mode=direct:vps --lang=zh-tw
DEPLOY_LANG=en pnpm deploy:cf:only
```

## 10. Deployment Combinations

Common commands:

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:cf:vps
pnpm deploy:cf:vercel
pnpm deploy:vps:vercel
pnpm deploy:all
```

Dry run:

```bash
pnpm deploy:switch --mode=direct:cf+vps --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vercel --dry-run --lang=en
```

## 11. GitHub / GitLab / Codeberg CI/CD

Git provider modes only push source code. Build and deployment should happen in CI/CD.

Required files:

- GitHub: `.github/workflows/deploy.yml`
- GitLab: `.gitlab-ci.yml`
- Codeberg/Woodpecker: `.woodpecker.yml`

Configure platform secrets for Cloudflare, VPS, Vercel, SSH keys, and tokens.

## 12. Script Roles

- `deploy_menu.mjs`: interactive deployment menu with language selection.
- `deploy_switch.mjs`: command-line deployment switcher.
- `deploy_i18n.mjs`: shared i18n dictionary for Traditional Chinese and English.
- `deploy_lib.mjs`: deployment modes, combinations, and command generation.
- `deploy_runtime.mjs`: Node.js, pnpm, npm, and cross-platform runner detection.
- `deploy_safety.mjs`: `.gitignore` and sensitive-file pre-deployment safety checks.
- `uploaddist_cf.mjs`: builds and uploads output to Cloudflare Pages.
- `uploaddist_vps.mjs`: builds and uploads output to VPS over SSH/rsync.
- `uploaddist_vercel.mjs`: builds/deploys through Vercel CLI.
- `upgrade_astro.mjs`: safely upgrades Astro-related packages.
- `analysis.mjs`: project analysis and checks.
- `run-e2e.mjs`: end-to-end test entry.

## 13. Safe Astro Upgrade

```bash
pnpm upgrade:astro -- --lang=en --dry-run
pnpm upgrade:astro -- --lang=en --dry-run --clean-install
pnpm upgrade:astro -- --lang=zh-tw
npm run upgrade:astro -- --lang=en --yes
```

Safety behavior:

- Bilingual means console output language only. `--lang=en` prints English prompts, warnings, confirmations, and errors; `--lang=zh-tw` prints Traditional Chinese messages.
- `--lang` does not change which packages are upgraded, does not change the site content language, and does not create a different upgrade process.
- `--clean-install` removes reproducible folders (`node_modules`, `.astro`, `dist`) before the real upgrade, then runs the normal upgrade and verification flow.
- Lockfiles are not deleted automatically because they preserve reproducible installs and make failed upgrades easier to review or revert.
- Detects Astro-related packages from `package.json`.
- Stops by default if the git working tree is dirty.
- Use `--allow-dirty` only when you intentionally want to upgrade with uncommitted changes.
- Supports `--dry-run`.
- Verifies with existing `check`, `lint`, and `build` scripts instead of hard-coding Astro CLI commands.

Options:

| Option | Meaning |
| --- | --- |
| `--lang=zh-tw` | Traditional Chinese output |
| `--lang=en` | English output |
| `--dry-run` | Preview only |
| `--yes` | Skip confirmation |
| `--allow-dirty` | Allow upgrading with a dirty git working tree |
| `--clean-install` | Remove `node_modules`, `.astro`, and `dist` before upgrading |
| `--skip-check` | Skip `check` |
| `--skip-lint` | Skip `lint` |
| `--skip-build` | Skip `build` |

## 14. Sensitive Files

Never commit real secrets:

- `.env`
- `.env.cloudflare`
- `.env.vps`
- `.env.vercel`
- `.dev.vars`
- `.dev.vars.*`
- `.npmrc`
- `.yarnrc`
- `.pnpmrc`
- `.npmrc.local`
- `.yarnrc.local`
- `.pnpmrc.local`
- `.wrangler/`
- `.cloudflare/`
- `.vercel/`
- `.netlify/`
- `.ssh/`
- `*.pem`
- `*.key`
- `*.p8`
- `*.p12`
- `*.pfx`
- `*.crt`
- `*.csr`
- `*.jks`
- `*.keystore`
- `id_rsa`
- `id_ed25519`
- `kubeconfig`
- `*.kubeconfig`
- `service-account*.json`
- `credentials*.json`
- `*-credentials.json`
- `debug.log`

The deployment scripts check `.gitignore` before deployment and can repair missing sensitive-file patterns.
