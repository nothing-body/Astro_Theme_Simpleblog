# Scripts Overview

This directory contains cross-platform Node.js scripts for deployment, analysis, and tests.

## Deployment Scripts

- `deploy_menu.mjs`: interactive deployment menu. Use it when you want to choose deployment targets and options step by step.
- `deploy_switch.mjs`: command-line deployment mode switcher. Use it for direct commands and CI/CD.
- `deploy_i18n.mjs`: shared language dictionary for deployment scripts. Supports Traditional Chinese and English output from the same scripts.
- `deploy_lib.mjs`: shared deployment mode definitions and command generation logic. Internal module.
- `deploy_runtime.mjs`: shared Node.js, npm, pnpm, and cross-platform package-runner detection logic. Internal module.
- `deploy_safety.mjs`: pre-deployment `.gitignore` and sensitive-file safety checker. Internal module.
- `uploaddist_cf.mjs`: builds the Astro site and deploys `dist` to Cloudflare Pages.
- `uploaddist_vps.mjs`: builds the Astro site and uploads `dist` to a VPS with SSH/rsync.
- `uploaddist_vercel.mjs`: builds/deploys through the Vercel CLI.
- `upgrade_astro.mjs`: safely upgrades Astro-related packages, then runs the existing package `check`, `lint`, and `build` scripts.

## Non-Deployment Scripts

- `analysis.mjs`: runs project checks and audits.
- `run-e2e.mjs`: runs end-to-end tests.

## Package Manager Support

The deployment scripts support both pnpm and npm.

```bash
pnpm deploy:menu
npm run deploy:menu
```

When pnpm is missing but npm is available, the scripts continue with npm and print a recommendation to install pnpm.

## Language Support

The deployment scripts are single-source i18n scripts. Choose the language in the interactive menu, pass `--lang`, or set `DEPLOY_LANG`.

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:switch --mode=direct:cf --lang=en
DEPLOY_LANG=en pnpm deploy:cf:only
```

## Build Output

Direct deployment scripts run the package `build` script first and deploy the generated output directory. The default output directory is `dist`, and `--dist=<dir>` can be used for Cloudflare/VPS deployments so the scripts are not tightly coupled to Astro.

## Safe Astro Upgrade

Use the bilingual upgrade helper to update Astro-related packages safely:

```bash
pnpm upgrade:astro -- --lang=en --dry-run
pnpm upgrade:astro -- --lang=zh-tw
npm run upgrade:astro -- --lang=en --yes
```

The script detects Astro-related dependencies from `package.json`, refuses to run on a dirty git working tree unless `--allow-dirty` is passed, updates with pnpm or npm, then verifies with the existing package scripts instead of hard-coding Astro commands. Optional flags:

- `--dry-run`: show the planned package-manager command without modifying files.
- `--yes`: skip the confirmation prompt.
- `--allow-dirty`: allow upgrading even when local files have uncommitted changes.
- `--skip-check`, `--skip-lint`, `--skip-build`: skip specific verification steps.

## VPS User And Permissions

VPS SSH upload uses the `VPS_USER` value in `.env.vps`.

```env
VPS_HOST=xxx.xxx.xxx
VPS_PORT=22
VPS_USER=deploy
VPS_TARGET_DIR=/var/www/example.com
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_SSH_PASSPHRASE=your_private_key_passphrase
```

If `VPS_USER` is not `root`, it may not be allowed to write to `/var/www/...`. In that case, upload to a directory such as `/home/<user>/site-dist`, then move or sync the uploaded build output to the directory served by your web server on the VPS. Prefer `ssh-agent` for passphrase-protected private keys; use `VPS_SSH_PASSPHRASE` only in a local uncommitted env file or CI secret.
