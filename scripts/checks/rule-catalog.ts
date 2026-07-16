type RuleGroup = {
  codes: string;
  scope: string;
  blocks: string;
};

/*
 * This catalog is the human-readable contract for the self-check system.
 * Keep it synchronized with source.ts, content.ts, images.ts, output.ts, and
 * analysis.ts whenever a new finding code or protected boundary is added.
 */
const RULE_GROUPS: RuleGroup[] = [
  {
    codes: 'CHECK',
    scope: 'Self-check orchestration and child-command failures.',
    blocks:
      'Crashes, failed lint/type/test/build commands, and phases skipped after a failed build.',
  },
  {
    codes: 'JS / TS / CONFIG',
    scope: 'Language policy, strict TypeScript, and validated shared site configuration.',
    blocks:
      'Unapproved executable JavaScript, suppressed diagnostics, weak compiler settings, and hard-coded site identity.',
  },
  {
    codes: 'CSS',
    scope: 'CSP-compatible styles and predictable low-cost rendering.',
    blocks:
      'Inline styles, transition: all, negative letter spacing, blur, brightness filters, and other banned style patterns.',
  },
  {
    codes: 'SEC / SECRET',
    scope: 'Static XSS, active-content, dynamic-code, unsafe URL, and credential scanning.',
    blocks:
      'eval-like execution, document.write, direct HTML assignment, script URLs, private keys, and token-shaped secrets.',
  },
  {
    codes: 'LINKCHECK',
    scope: 'Static-notice and optional API-backed external-link modes.',
    blocks:
      'Undeclared reputation code, unsafe clients, missing SSRF/CORS controls, unsafe local-feed or remote-provider handling, undisclosed providers, public credentials, and notice bypasses.',
  },
  {
    codes: 'PACKAGE / PARTYTOWN / SEARCH',
    scope: 'Dependency policy and required runtime integrations.',
    blocks:
      'Mismatched overrides, missing packages, unsupported Pagefind output, missing Partytown assets, and unused search UI assets.',
  },
  {
    codes: 'GIT / HEADER',
    scope: 'Repository privacy and equivalent cross-platform security headers.',
    blocks:
      'Tracked env/key files, missing ignore rules, unsafe CSP, missing nosniff/HSTS/referrer controls, and provider header drift.',
  },
  {
    codes: 'DOC',
    scope: 'Operational documentation kept in sync with supported commands and checks.',
    blocks:
      'Missing deployment modes/options, absent self-check severity explanations, and incomplete three-language operator guides.',
  },
  {
    codes: 'CONTENT / I18N',
    scope: 'Markdown structure, metadata, safe examples, and three-language parity.',
    blocks:
      'Invalid frontmatter, raw HTML/MDX, unsafe commands, route collisions, duplicate text, and missing or mismatched translations.',
  },
  {
    codes: 'IMAGE',
    scope: 'Article-image type, size, dimensions, decoding, and generated responsive output.',
    blocks:
      'Symlinks, unsupported formats, oversized/decompression-risk images, missing dimensions, and images bypassing Astro optimization.',
  },
  {
    codes: 'BUILD / ROUTE',
    scope: 'Generated-file integrity and canonical route policy.',
    blocks:
      'Missing dist, source maps, broken internal URLs, duplicate page-one routes, and absent generated assets.',
  },
  {
    codes: 'SEO',
    scope: 'Canonical, hreflang, sitemap, robots, descriptions, and social-preview metadata.',
    blocks:
      'Duplicate or incorrect canonical URLs, missing locale alternates, invalid sitemap URLs, missing robots directives, and missing images.',
  },
  {
    codes: 'CSP',
    scope: 'Built HTML compatibility with the strict Content Security Policy.',
    blocks:
      'Executable inline scripts, inline style blocks/attributes, missing Partytown hashes, and unsafe generated protocols.',
  },
  {
    codes: 'PERF',
    scope: 'Generated HTML, JavaScript, and CSS size budgets.',
    blocks:
      'Reports unusually large output as warnings so regressions are visible without failing an otherwise valid build.',
  },
];

export function printRuleCatalog(): void {
  console.log('SimpleBlog self-check rule catalog\n');
  console.log('ERROR findings set a failing exit code and block a verified release.');
  console.log('WARNING findings are reported for review but do not fail the command.\n');
  for (const group of RULE_GROUPS) {
    console.log(`[${group.codes}]`);
    console.log(`  Purpose: ${group.scope}`);
    console.log(`  Detects: ${group.blocks}\n`);
  }
  console.log('Commands:');
  console.log(
    '  pnpm selfcheck -- --quick    Source/content/image checks plus type, lint, deps, and unit tests.'
  );
  console.log(
    '  pnpm analyze                Full checks, OSV, production output, deployment dry-runs, and E2E.'
  );
}
