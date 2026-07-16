# Self-Check Guide

The self-check is a release gate, not a replacement for code review. It combines source inspection, framework diagnostics, tests, dependency vulnerability data, production-output inspection, deployment-plan validation, and browser tests.

## Commands

```bash
pnpm selfcheck -- --explain
pnpm selfcheck -- --quick
pnpm analyze
```

- `--explain`: prints every rule group, its purpose, and what it detects. It does not modify files or run a build.
- `--quick`: checks source, articles, images, Astro/TypeScript, ESLint, Stylelint, Knip, and unit tests.
- `pnpm analyze`: runs the quick checks plus OSV, a clean production build, generated-output inspection, all supported deployment modes as dry-runs in three languages, and Playwright.

`ERROR` findings make the command exit with a failure code. `WARNING` findings remain visible but do not fail the command.

## Rule Groups

| Code                             | What it protects                    | Examples it detects                                                                                         |
| -------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CHECK`                          | Self-check execution                | Crashed phases, failed child commands, output/E2E skipped after a failed build                              |
| `JS`, `TS`, `CONFIG`             | TypeScript and shared configuration | Unapproved executable JavaScript, suppressed diagnostics, weak strict settings, hard-coded site identity    |
| `CSS`                            | CSP and rendering performance       | Inline styles, transitions applied to every property, negative letter spacing, blur and brightness filters  |
| `SEC`, `SECRET`                  | XSS and credential exposure         | Dynamic execution, direct HTML assignment, active URL schemes, private keys, token-shaped strings           |
| `LINKCHECK`                      | Static/API external-link modes      | Undeclared reputation code, unsafe client/backend controls, public credentials, direct external-link bypass |
| `PACKAGE`, `PARTYTOWN`, `SEARCH` | Dependency and runtime wiring       | Missing packages, mismatched overrides, missing Partytown/Pagefind assets, unsupported search output        |
| `GIT`, `HEADER`                  | Repository privacy and HTTP headers | Tracked `.env`/keys, incomplete ignore rules, unsafe CSP, missing `nosniff`, provider header drift          |
| `DOC`                            | Operator documentation              | Missing deployment modes/options, severity explanations, or incomplete three-language guides                |
| `CONTENT`, `I18N`                | Markdown and translations           | Invalid frontmatter, MDX/raw HTML, unsafe commands, route collisions, missing translations                  |
| `IMAGE`                          | Decode safety and responsive output | Symlinks, unsupported formats, excessive bytes/pixels, missing dimensions, optimization bypass              |
| `BUILD`, `ROUTE`                 | Generated artifact and route policy | Missing `dist`, source maps, broken internal links, generated `/page/1`, absent assets                      |
| `SEO`                            | Search metadata                     | Wrong/duplicate canonical, missing hreflang, broken sitemap targets, missing robots/social images           |
| `CSP`                            | Strict CSP compatibility            | Executable inline scripts, inline styles, missing Partytown hash, unsafe protocols                          |
| `PERF`                           | Output size budgets                 | Unusually large HTML, JavaScript, or CSS; these are warnings                                                |

## What The Full Check Does Not Do

- Deployment validation uses `--dry-run`; it never uploads or changes a provider.
- OSV receives npm package names and installed versions, not source code, environment files, articles, or secrets.
- A clean result cannot prove that every business-logic bug or future zero-day is absent.
- Browser checks use the configured Chromium-compatible executable, including ungoogled-chromium.

## Reading A Finding

Example:

```text
[ERROR] HEADER002 public/_headers: CSP must not allow unsafe-inline.
```

1. `ERROR` means the verified release is blocked.
2. `HEADER002` identifies the stable rule.
3. `public/_headers` is the affected file.
4. The message describes the violated boundary.

Fix the reported source rather than disabling the rule. Run `pnpm selfcheck -- --quick` while editing, then run `pnpm analyze` before release.

When you implement an optional reputation API, copy `link-reputation.audit.example.json` to `link-reputation.audit.json`, select `local-feed` or `remote-api`, name the provider, and list the actual TypeScript/Astro/disclosure files. This switches `LINKCHECK` from static-notice enforcement to strategy-specific API checks. An external backend cannot be inspected from this repository; the warning is intentional and must be addressed by checking that backend separately.
