# From download to automatic deployment

Read this alongside [deployment recipes](DEPLOYMENT.en.md), [Markdown examples](MARKDOWN_GUIDE.en.md), and [bookmarks](BOOKMARKS_GUIDE.en.md). All domains, addresses, and IDs below are examples. Never paste real tokens into a public tutorial or article.

## 1. Prepare your computer

Install Node.js (a supported LTS release, at least 22.12), Git, and pnpm. Open a terminal **inside the downloaded project folder**: it must contain `package.json`. On Windows use PowerShell; on macOS/Linux use Terminal.

```sh
node --version
git --version
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm install --frozen-lockfile
```

If Corepack is unavailable, follow the [pnpm installation guide](https://pnpm.io/installation). Keep the version matching `packageManager` in `package.json`; do not delete the lockfile to repair an install.

Windows: `Copy-Item .env.example .env`. macOS/Linux: `cp .env.example .env`. Open the new `.env` in a text editor and enter your public site settings:

```dotenv
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=My notebook
PUBLIC_SITE_AUTHOR=Alex
PUBLIC_SITE_DESCRIPTION=Notes about my projects and reading.
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

Run `pnpm dev` and open the local address printed in the terminal. Stop with Ctrl+C. Change text, save, and reload. `PUBLIC_` means visible to everyone: never use it for a deployment credential. Your contact address is intentionally public.

## 2. Choose the correct environment file

| File | Purpose | Loaded by |
| --- | --- | --- |
| `.env` | Common public site settings | Astro |
| `.env.production` | Public settings for production builds | Astro during `pnpm build` |
| `.env.cloudflare` | Cloudflare deployment credentials | Cloudflare deploy command |
| `.env.vercel` | Vercel deployment credentials | Vercel deploy command |
| `.env.netlify` | Netlify deployment credentials | Netlify deploy command |
| `.env.vps` | SSH connection and static destination | VPS deploy command |
| `.env.vps-docker` | SSH connection and Docker destination | VPS Docker deploy command |
| `.env.supabase` | Function deployment credentials | Supabase deploy command |

Create `.env.production` by copying `.env.example` and replacing the public values. Create provider files from the matching `.example`. They are not automatically interchangeable: `pnpm dev` does not load `.env.cloudflare`. Existing process/CI environment variables take precedence over provider files; Astro production values override common `.env` values unless already set in the process. Use one assignment per key. Avoid shell expressions and multiline values in provider files. Put SSH private keys in files, not in a local `.env` value.

Before publishing, run `git status --short` and `git check-ignore .env .env.production .env.cloudflare`. Real files must be ignored. `.gitignore` does not remove previously committed secrets and does not stop Astro copying a file from `public/`; keep secrets out of `public/`, `src/`, and articles. If a secret was published, revoke it at its provider and replace it before cleaning Git history.

## 3. Obtain only the credentials you need

Choose **one** host first. Copy the relevant example file, fill the fields, and run its deployment command from the project folder.

| Host | Credential and destination | Command |
| --- | --- | --- |
| Cloudflare | Profile → API Tokens → Create Token; account-scoped **Cloudflare Pages: Edit**. Copy Account ID from the dashboard and exact Pages project name into `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_PAGES_PROJECT_NAME`. Token goes in `CLOUDFLARE_API_TOKEN`. | `pnpm deploy:cf:only` |
| Vercel | Create a token in account settings, choose intended scope/expiry, copy Project ID from project settings. Set `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and team ID as `VERCEL_ORG_ID` when using a team; use the actual lowercase project name for `VERCEL_PROJECT_NAME`. | `pnpm deploy:vercel:only` |
| Netlify | User settings → Applications → Personal access tokens; set `NETLIFY_AUTH_TOKEN`. Copy Project ID from project configuration into `NETLIFY_SITE_ID`. | `pnpm deploy:netlify:only` |
| Supabase | Account Access Tokens → create a token scoped to the intended project with Edge Functions read/write where available. Set `SUPABASE_ACCESS_TOKEN`; copy the dashboard `/project/<ref>` value into `SUPABASE_PROJECT_REF`. | `pnpm deploy:supabase:only` |

Supabase deploys `supabase/functions/<name>/index.ts`, **not the blog's HTML**. Its deployment token is different from a browser publishable key, an anon key, or a service-role key. The static template does not need a database key. Start with the hello-function recipe in the deployment guide; keep JWT verification enabled and use Supabase's authenticated testing interface. Never solve an authentication error by placing a service-role key in browser code.

For all platforms, set expiry and minimum scope, save the token once in a password manager, and never screenshot it. A 401 usually means missing/expired authentication; a 403 usually means wrong account or permissions. Confirm the project before retrying. Official instructions: [Cloudflare](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Vercel](https://vercel.com/docs/rest-api), [Netlify](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/), [Supabase](https://supabase.com/docs/guides/functions/deploy).

## 4. SSH and VPS preparation

Install OpenSSH Client locally. Generate a separate deployment key, giving it a passphrase:

```sh
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/blog_deploy
```

The `.pub` file is public; the file without `.pub` is private. On Windows display the public key with `Get-Content $HOME/.ssh/blog_deploy.pub`; on macOS/Linux use `cat ~/.ssh/blog_deploy.pub`. Use your provider's console to create an unprivileged `deploy` account and append that **public key** as one line to its `~/.ssh/authorized_keys`. On the server, set `.ssh` to mode 700 and `authorized_keys` to 600. Do not replace existing authorized keys.

Obtain the host fingerprint from the provider console, compare it during your first `ssh deploy@YOUR_HOST`, and accept only if it matches. `ssh-keyscan` alone does not authenticate a server. Set `VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts`, `VPS_SSH_KEY_PATH=~/.ssh/blog_deploy`, and your host/user/port in `.env.vps`. On macOS/Linux set the private key to mode 600. Prefer `ssh-agent` over putting its passphrase in a file.

Your administrator should create a dedicated parent directory writable by `deploy`, for example `/var/www/blog-sites`, and use `VPS_TARGET_DIR=/var/www/blog-sites/example.com`. Staging replacement needs write permission to the **parent**, not just the destination. Do not target `/`, `/etc`, your home directory, or a directory containing unrelated data. Configure HTTPS and Nginx for that destination before going live. Deployment scripts run on Windows/macOS/Linux; the remote VPS recipes assume Linux/OpenSSH, and Docker needs Linux containers plus Compose.

For Docker use `.env.vps-docker`, a dedicated `VPS_DOCKER_APP_DIR`, and loopback binding `127.0.0.1:8080`. Put an HTTPS reverse proxy in front and test `curl -I http://127.0.0.1:8080` **on the server**. Docker access grants powerful server privileges; give it only to the deployment account you administer. Keep a backup before replacing an existing installation.

## 5. Push and deploy automatically

Create an empty repository on your chosen Git provider. In the local project run:

```sh
git status --short
git add .
git diff --cached --stat
git commit -m "Configure blog"
git remote add origin YOUR_REPOSITORY_CLONE_URL
git push -u origin main
```

Use the branch actually reported by `git branch --show-current`; if a remote already exists, inspect it with `git remote -v` instead of adding another. Review staged filenames and content before committing. Do not upload `dist`, `.env`, key files, or `node_modules` manually.

**GitHub:** repository Settings → Environments → create `production`; restrict its deployment branches. Under Secrets and variables → Actions, store provider tokens/IDs as secrets. Add `PUBLIC_SITE_URL` and `PUBLIC_CONTACT_EMAIL` as variables and `DEPLOY_MODE=direct:cf` (or your chosen target). VPS requires `VPS_SSH_PRIVATE_KEY` (entire multiline private key) and `VPS_SSH_KNOWN_HOSTS` (verified known_hosts entry) as secrets plus the VPS connection variables. Push to `main`/`master`, open Actions → Deploy Website, and inspect the result. Configure the production environment before enabling deployment.

**GitLab:** Settings → CI/CD → Variables; add the same names, protect credentials and production branches, and scope secrets to production. Multiline SSH keys cannot always be masked; restrict their visibility and never echo them. This workflow expects key **contents**, not a GitLab File-variable pathname. Use a runner with Node, OpenSSH, and network access. Open Build → Pipelines after pushing; `.gitlab-ci.yml` selects the deployment command.

**Codeberg:** enable an approved Woodpecker instance for the repository, activate it, and add the names in `.woodpecker.yml` as repository secrets. Set `DEPLOY_MODE` and public build values there too. CI access may require approval or your own runner; creating a Codeberg repository alone does not provide one. Open the Woodpecker build log after pushing. Keep deployment restricted to your production branch.

For GitLab/Codeberg Docker images ensure OpenSSH Client is installed before VPS deployment. For all providers, choose either platform Git auto-build or this direct-upload pipeline for a destination, so two systems do not race to publish it. Later updates are edit → check → commit → push. A green upload response can precede provider activation: open the provider deployment page and verify the final ready state and domain.

## 6. Verify the result

```sh
pnpm check
pnpm build
pnpm selfcheck
```

`--quick` skips build output, network audit and browser/deployment checks; it is not a full release check. Full self-check needs network access and a browser. For ungoogled-chromium set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its actual executable (PowerShell: `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/path/chrome.exe'`; macOS/Linux: `export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/chromium`). Then run `pnpm test:e2e`.

Open `/`, `/zh-tw/`, `/zh-cn/`, an article, search, and a nonexistent path. Switch languages from an article and category. Matching translated articles need the same relative filename; corresponding translated tags must use the same order. Missing translations must not become fabricated hreflang targets. Check `/sitemap-index.xml`, and check response headers on an HTML page, an asset and a 404 using your browser's Network panel. Astro preview does not simulate provider HTTP headers. Verify HTTPS, `nosniff`, CSP and framing restrictions on the deployed host. Test with analytics blocked: navigation and search should remain usable. Security checks reduce risk but cannot certify an external destination free of phishing or malware.

## 7. Upgrade without breaking the toolchain

Astro is currently 7.3.3; inspect `package.json` and the lockfile for exact dependency versions. TypeScript remains 6 because the installed Astro checker and ts-jest require versions below 7. Review compatibility before raising a major version. Back up or commit changes, update dependencies using pnpm, and run the full checks. Do not blindly pin old transitive dependencies: security overrides also need periodic review.
