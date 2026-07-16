# Scripts Overview

All operational scripts are TypeScript and support Windows, macOS, and Linux. pnpm is preferred; npm is an automatic fallback. Commands use argument arrays instead of shell-built command strings.

## Deployment Entry Points

- `deploy_menu.ts`: interactive English, Traditional Chinese, and Simplified Chinese menu.
- `deploy_switch.ts`: non-interactive target and Git-provider switch.
- `deploy_lib.ts`: validated modes, flags, remotes, and branches.
- `deploy_i18n.ts`: the three-language console dictionary.
- `deploy_runtime.ts`: Node and pnpm/npm discovery, including Windows `.cmd` wrappers.
- `deploy_env.ts`: one strict root-level `.env*` parser for every target.
- `deploy_safety.ts`: `.gitignore`, output-path, and sensitive-file checks.

## Direct Deployers

- `uploaddist_cf.ts`: Cloudflare Pages through Wrangler.
- `uploaddist_vercel.ts`: bounded, streaming Vercel REST upload; no Vercel CLI dependency.
- `uploaddist_netlify.ts`: bounded streaming ZIP and Netlify REST deploy.
- `uploaddist_vps.ts`: rsync or OpenSSH scp to a staging directory, then atomic activation.
- `uploaddist_vps_docker.ts`: uploads a hardened non-root Nginx Compose bundle and starts it remotely.
- `uploaddist_supabase.ts`: deploys TypeScript files under `supabase/functions/<name>/index.ts`.

Supabase Edge Functions are backend functions, not a static-site host.

## Required Environment Files

```text
.env
.env.cloudflare
.env.vercel
.env.netlify
.env.supabase
.env.vps
.env.vps-docker
```

Create them from the matching `.example` files. Environment options accept only root-level `.env` or `.env.*` names and reject traversal and symbolic links.

## Common Commands

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf --dry-run --yes
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
```

Combined targets:

```bash
pnpm deploy:all
pnpm deploy:all:static
pnpm deploy:all:including-functions
```

- `deploy:all`: Cloudflare + VPS + Vercel.
- `deploy:all:static`: Cloudflare + VPS + VPS Docker + Vercel + Netlify.
- `deploy:all:including-functions`: all static targets + Supabase Edge Functions.

Use `--dry-run` to print a plan without building or uploading. `--yes` skips only the switch confirmation. `--skip-clean` preserves the output directory before rebuilding; it does not skip the build. See [DEPLOYMENT.en.md](../DEPLOYMENT.en.md) for every mode and flag.

Language:

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:menu -- --lang=zh-cn
```

With npm, keep the argument separator:

```bash
npm run deploy:switch -- --mode=direct:cf --dry-run --yes
```

## Checks

- `analysis.ts`: source, content, images, dependency audit, build output, deployment dry-runs, and E2E.
- `audit-security.ts`: queries OSV for the installed package/version graph.
- `checks/source.ts`: risky syntax, TypeScript-only policy, headers, secrets, deployment wiring, and public/private boundaries.
- `checks/content.ts`: frontmatter, multilingual pairing, categories, routes, links, and raw-HTML rules.
- `checks/images.ts`: formats, dimensions, pixel count, and file-size policy.
- `checks/output.ts`: canonical, hreflang, sitemap, CSP, inline code/style, images, broken links, and generated assets.
- `run-e2e.ts`: uses the configured local Chromium-compatible executable, including ungoogled-chromium.

```bash
pnpm selfcheck -- --explain
pnpm selfcheck -- --quick
pnpm analyze
```

The rule groups, severity behavior, and examples are documented in [SELF_CHECK_GUIDE.en.md](../SELF_CHECK_GUIDE.en.md).

## Safety Notes

- Vercel and Netlify responses are size-bounded.
- Netlify archives and Vercel uploads are streamed to reduce memory spikes.
- VPS private keys must be regular files; Unix permissions must not be group/world-readable.
- `VPS_KNOWN_HOSTS_FILE` is recommended. Without it, SSH uses `accept-new`; existing key changes still fail.
- VPS Docker binds to loopback by default and requires an explicit opt-in for `0.0.0.0`.
- Real env files, provider state, private keys, reports, and generated output remain excluded by `.gitignore`.
