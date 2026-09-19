# Shared modules and release validation

`src/i18n/locales.ts` defines supported languages; `ui.ts` holds translated text. `utils.ts` maps existing content across languages. `src/scripts/language-links.ts` preserves the search query and leaving-page destination during language changes. `src/lib/routes.ts` validates and constructs paths. `scripts/check-output.ts` checks the finished artifact after Astro, Pagefind and search cleanup; every normal build now runs it.

The output gate rejects sensitive file names, symbolic links, excessive nesting, oversized uploads and executable inline markup. Regression fixtures intentionally introduce unsafe output to ensure failures are detected. UI tests compare language keys and interpolation variables, allowing only explicitly optional editorial copy to be empty. GitHub workflow checks reject direct secret interpolation into shell commands and secrets used in conditions.

To change the production site, copy `.env.production.example` to `.env.production`, set `PUBLIC_SITE_URL=https://your-blog.example` and your public contact information, then run the commands below. Leave credentials in the relevant private provider environment file. Use `dist` for builds; custom VPS `--prebuilt` bundles are an advanced upload feature and are not rebuilt by that command.

```sh
pnpm check
pnpm build
pnpm selfcheck
```

The Windows checkout has been tested locally. The CI matrix also builds and runs browser tests on Linux and macOS; those hosted runs must pass before claiming those platforms are verified. Browser tests simulate blocked analytics and constrained device settings, but do not certify every extension, browser version, or physical old device. Tailwind 4 still needs a sufficiently modern browser engine. Deployment dry-runs check command plans, not credentials, DNS, remote permissions, TLS, or activation. Confirm the actual HTTP headers on each hosting platform after release. A clean vulnerability scan is a point-in-time result, not a guarantee against future vulnerabilities.

[Setup](SETUP.en.md) · [Deployment](DEPLOYMENT.en.md)
