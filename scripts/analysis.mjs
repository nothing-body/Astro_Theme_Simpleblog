#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { clearTimeout, setTimeout } from 'node:timers';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const projectPackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const isPublicTemplate = projectPackage.name === 'astro-theme-simpleblog';

const ignoredDirs = new Set([
  '.astro',
  '.git',
  '.pnpm-store',
  '.vercel',
  '.wrangler',
  'backup',
  'dist',
  'lighthouse_tmp',
  'node_modules',
  'playwright-report',
  'test-results',
  'tmp',
]);

const ignoredFiles = new Set(['eslint-report.json', 'lighthouse-report.html']);

const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.cloudflare',
  '.env.vps',
  '.env.vercel',
  '.npmrc',
  '.yarnrc',
  '.pnpmrc',
  '.ssh',
  'id_rsa',
  'id_ed25519',
];

const requiredGitignorePatterns = [
  '.env*',
  '!.env.example',
  '!.env.*.example',
  '.npmrc',
  '.yarnrc',
  '.pnpmrc',
  '.ssh/',
  '*.pem',
  '*.key',
  'id_rsa',
  'id_ed25519',
  'dist/',
  'node_modules/',
  '.wrangler/',
  '.vercel/',
  'playwright-report/',
  'test-results/',
];

const commentCheckedExtensions = new Set(['.astro', '.css', '.js', '.mjs', '.ts', '.tsx']);

const sourceExtensions = new Set([
  '.astro',
  '.css',
  '.cjs',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml',
]);

const dangerousPatterns = [
  { label: 'eval()', regex: /\beval\s*\(/ },
  { label: 'new Function()', regex: /\bnew\s+Function\s*\(/ },
  { label: 'document.write()', regex: /\bdocument\.write\s*\(/ },
  {
    label: 'HTML string injection APIs',
    regex: /\.(innerHTML|outerHTML)\s*=|\.insertAdjacentHTML\s*\(/,
  },
  { label: 'child_process shell:true', regex: /shell\s*:\s*true/ },
  { label: 'disabled SSH host-key checking', regex: /StrictHostKeyChecking\s*=\s*no/ },
  { label: 'plain sshpass usage', regex: /\bsshpass\b/ },
  { label: 'destructive rm -rf', regex: /\brm\s+-rf\b/ },
];

const allowedDangerousMatches = [
  { file: 'scripts/analysis.mjs', labels: new Set(dangerousPatterns.map(item => item.label)) },
];

const filterBlockablePatterns = [
  {
    label: 'legacy privacy-cfg id/class',
    regex:
      /\b(privacy-cfg|toggle-privacy-cfg|footer-privacy-trigger|privacy-trigger-btn|privacy-inline-panel|remember-timezone-toggle|enable-analytics-toggle)\b/,
  },
  {
    label: 'filterable cookie-banner id/class',
    regex: /\b(id|class)=["'][^"']*(cookie-consent|cookie-banner|gdpr-banner|onetrust)[^"']*["']/i,
  },
];

const requiredComponentWiring = [
  {
    file: 'src/components/CookieConsent.astro',
    patterns: [/id=["']site-prefs-layer["']/, /bb-prefs-modal\.js/],
  },
  {
    file: 'src/components/Footer.astro',
    patterns: [/id=["']footer-prefs-trigger["']/, /bb-footer-prefs\.js/],
  },
  { file: 'src/components/HeadMeta.astro', patterns: [/bb-settings-bootstrap\.js/, /bb-ga4\.js/] },
  { file: 'public/scripts/bb-prefs-modal.js', patterns: [/open-site-prefs/] },
  {
    file: 'public/scripts/bb-settings-bootstrap.js',
    patterns: [/bb-privacy-v1/, /__privacySettings/],
  },
  { file: 'src/components/Navbar.astro', patterns: [/bb-navbar\.js/] },
  { file: 'src/components/BookmarkLinks.astro', patterns: [/bb-bookmarks\.js/] },
  { file: 'src/components/Sidebar.astro', patterns: [/bb-sidebar\.js/] },
  { file: 'src/components/HomeClockScript.astro', patterns: [/bb-home-clock\.js/] },
  { file: 'src/components/HomeHero.astro', patterns: [/HomeClockScript/, /intro-title/] },
  {
    file: 'src/components/HomeLatestPosts.astro',
    patterns: [/PostCard/, /BookmarkLinks/, /latest-section/],
  },
  {
    file: 'src/layouts/BlogPostLayout.astro',
    patterns: [/bb-post-back\.js/, /bb-post-back-config/],
  },
  {
    file: 'src/components/LeavingNotice.astro',
    patterns: [/bb-leaving-notice\.js/, /robots="noindex, nofollow"/],
  },
  { file: 'src/components/SiteSettingsInline.astro', patterns: [/bb-settings-inline\.js/] },
  { file: 'src/layouts/BaseLayout.astro', patterns: [/bb-back-to-top\.js/] },
  { file: 'src/pages/404.astro', patterns: [/bb-404-locale\.js/] },
];

const requiredPublicScripts = [
  'public/scripts/bb-navbar.js',
  'public/scripts/bb-bookmarks.js',
  'public/scripts/bb-sidebar.js',
  'public/scripts/bb-home-clock.js',
  'public/scripts/bb-last-list.js',
  'public/scripts/bb-no-category-redirect.js',
  'public/scripts/bb-prefs-modal.js',
  'public/scripts/bb-footer-prefs.js',
  'public/scripts/bb-settings-bootstrap.js',
  'public/scripts/bb-settings-inline.js',
  'public/scripts/bb-ga4.js',
  'public/scripts/bb-post-back.js',
  'public/scripts/bb-back-to-top.js',
  'public/scripts/bb-leaving-notice.js',
  'public/scripts/bb-404-locale.js',
];

const postsRouteFiles = [
  'src/pages/posts.astro',
  'src/pages/page/[page].astro',
  'src/pages/zh-tw/posts.astro',
  'src/pages/zh-tw/page/[page].astro',
  'src/pages/zh-cn/posts.astro',
  'src/pages/zh-cn/page/[page].astro',
];

const optionalComponents = new Set(['src/components/NotFoundPage.astro']);

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  return 1;
}

function ok(message) {
  console.log(`[OK] ${message}`);
  return 0;
}

function getPackageRunner() {
  if (process.platform === 'win32') {
    if (fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml'))) {
      return {
        command: 'cmd.exe',
        prefix: ['/d', '/s', '/c', 'pnpm.cmd', 'run'],
      };
    }

    return {
      command: 'cmd.exe',
      prefix: ['/d', '/s', '/c', 'npm.cmd', 'run'],
    };
  }

  return {
    command: 'npm',
    prefix: ['run'],
  };
}

function runScript(name) {
  const runner = getPackageRunner();
  const result = spawnSync(runner.command, [...runner.prefix, name], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    console.error(`[FAIL] ${name}: ${result.error.message}`);
    return 1;
  }
  if (result.status !== 0) return 1;

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replaceAll(
    String.fromCharCode(27),
    ''
  );
  if (/\[[^\]]*ERROR[^\]]*\]/i.test(output) || /\berror\s+ts\(\d+\)/i.test(output)) {
    console.error(`[FAIL] ${name} emitted an error marker despite exiting with status 0.`);
    return 1;
  }

  return 0;
}

function runDeploymentDryRuns() {
  section('Deployment script execution checks');

  const scriptsDir = path.join(ROOT, 'scripts');
  const deploymentScripts = fs
    .readdirSync(scriptsDir)
    .filter(file => /^(deploy_|uploaddist_).+\.mjs$/.test(file))
    .sort();

  let failures = 0;
  for (const file of deploymentScripts) {
    const result = spawnSync(process.execPath, ['--check', path.join(scriptsDir, file)], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      const detail = (result.stderr || result.stdout || result.error?.message || '').trim();
      failures += fail(`${file} failed Node.js syntax validation${detail ? `:\n${detail}` : '.'}`);
    }
  }

  const combinations = [
    'cf',
    'vps',
    'vercel',
    'cf+vps',
    'cf+vercel',
    'vps+vercel',
    'cf+vps+vercel',
  ];
  const modes = [
    ...combinations.map(combination => `direct:${combination}`),
    ...['github', 'gitlab', 'codeberg'].flatMap(provider =>
      combinations.map(combination => `${provider}:${combination}`)
    ),
  ];
  const safeEnv = { ...process.env };
  for (const key of Object.keys(safeEnv)) {
    if (
      /(?:TOKEN|SECRET|PASSWORD|PASSPHRASE|PRIVATE_KEY|VPS_HOST|VPS_USER|VPS_TARGET_DIR|ACCOUNT_ID|PROJECT_ID)/i.test(
        key
      )
    ) {
      delete safeEnv[key];
    }
  }

  const switchScript = path.join(scriptsDir, 'deploy_switch.mjs');
  const missingEnv = '.env.selfcheck-missing';
  for (const mode of modes) {
    const result = spawnSync(
      process.execPath,
      [
        switchScript,
        `--mode=${mode}`,
        '--dry-run',
        '--lang=en',
        `--cf-env=${missingEnv}`,
        `--vps-env=${missingEnv}`,
        `--vercel-env=${missingEnv}`,
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: safeEnv,
        maxBuffer: 2 * 1024 * 1024,
        shell: false,
        windowsHide: true,
      }
    );
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    if (result.error || result.status !== 0) {
      const detail = (result.stderr || result.stdout || result.error?.message || '').trim();
      failures += fail(`Deployment dry-run failed for ${mode}${detail ? `:\n${detail}` : '.'}`);
      continue;
    }
    if (!/\b(?:pnpm|npm)\b|\bgit push\b/.test(output)) {
      failures += fail(`Deployment dry-run for ${mode} did not produce an executable command.`);
    }
  }

  if (failures === 0) {
    ok(
      `${deploymentScripts.length} deployment scripts passed syntax checks and ${modes.length} isolated deployment modes passed dry-run execution.`
    );
  }
  return failures;
}

function runDevSmoke() {
  section('Astro dev startup smoke test');
  const astroCli = path.join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
  if (!fs.existsSync(astroCli)) return Promise.resolve(fail('Astro CLI is missing.'));

  return new Promise(resolve => {
    const child = spawn(
      process.execPath,
      [astroCli, 'dev', '--host', '127.0.0.1', '--port', '4397'],
      {
        cwd: ROOT,
        env: process.env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let output = '';
    let settled = false;
    let readyTimer;

    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (readyTimer) clearTimeout(readyTimer);
      child.kill();
      resolve(result);
    };

    const inspect = chunk => {
      output += chunk.toString();
      if (/\[[^\]]*ERROR[^\]]*\]/i.test(output)) {
        finish(fail(`Astro dev emitted an error during startup:\n${output.trim()}`));
        return;
      }
      if (/ready in|watching for file changes/i.test(output) && !readyTimer) {
        readyTimer = setTimeout(() => {
          ok('Astro dev reaches ready state without loader errors.');
          finish(0);
        }, 750);
      }
    };

    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.on('error', error => finish(fail(`Unable to start Astro dev: ${error.message}`)));
    child.on('exit', code => {
      if (!settled) finish(fail(`Astro dev exited before ready state (status ${code}).`));
    });

    const timeout = setTimeout(
      () => finish(fail(`Astro dev did not reach ready state.\n${output.trim()}`)),
      15000
    );
  });
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    if (ignoredFiles.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function textFiles() {
  return walk(ROOT).filter(file => sourceExtensions.has(path.extname(file)));
}

function countFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(full, predicate);
    else if (predicate(full)) count += 1;
  }
  return count;
}

function isAllowed(file, label) {
  const normalized = rel(file);
  return allowedDangerousMatches.some(item => item.file === normalized && item.labels.has(label));
}

function scanDangerousSyntax(files) {
  section('Dangerous syntax scan');
  let failures = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const { label, regex } of dangerousPatterns) {
      regex.lastIndex = 0;
      if (!regex.test(text) || isAllowed(file, label)) continue;
      const line = lines.findIndex(value => regex.test(value)) + 1;
      failures += fail(`${label}: ${rel(file)}:${line}`);
    }
  }
  if (failures === 0) ok('No unexpected dangerous syntax found.');
  return failures;
}

function scanBuiltContentProvenance() {
  section('Built content provenance scan');
  let failures = 0;

  for (const lang of ['en', 'zh-tw', 'zh-cn']) {
    const contentDir = path.join(ROOT, 'src', 'content', 'blog', lang);
    const sourceCount = countFiles(contentDir, file => {
      if (!/\.mdx?$/i.test(file) || path.basename(file).toLowerCase() === 'getting-started.md') {
        return false;
      }
      const text = fs.readFileSync(file, 'utf8');
      const frontmatter = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      return !/^\s*draft:\s*true\s*$/im.test(frontmatter);
    });
    const postsDir = path.join(ROOT, 'dist', ...(lang === 'en' ? [] : [lang]), 'posts');
    const builtCount = countFiles(
      postsDir,
      file => path.basename(file) === 'index.html' && path.dirname(file) !== postsDir
    );

    if (sourceCount !== builtCount) {
      failures += fail(
        `${lang} has ${sourceCount} publishable source post(s) but ${builtCount} built post page(s); generated content may be stale or untraceable.`
      );
    }
  }

  const packageJson = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  const cleaner = path.join(ROOT, 'scripts', 'clean-generated.mjs');
  if (
    !fs.existsSync(cleaner) ||
    !/"build"\s*:\s*"[^"]*clean-generated\.mjs[^"]*astro build"/.test(packageJson)
  ) {
    failures += fail('Build must clean .astro and dist before generating deployable output.');
  }

  if (failures === 0) ok('Every built post is accounted for by current publishable source content.');
  return failures;
}

function scanMojibake(files) {
  section('Mojibake scan');
  let failures = 0;
  const mojibakeChars = [
    0x875c, 0x875e, 0x761a, 0x64d0, 0x9908, 0x7507, 0x929d, 0x7629, 0x9758, 0x96ff, 0x7485, 0x6470,
    0x8761, 0x9708, 0x8a68, 0x95ac, 0x8758, 0x92b5, 0x981d, 0x66ba, 0x977d, 0x55b2, 0x7a62,
  ].map(code => String.fromCodePoint(code));
  const latinMojibakeFragments = [
    [0x00c3],
    [0x00c2],
    [0x00e2, 0x20ac],
    [0x00ef, 0x00bf, 0x00bd],
  ].map(codes => String.fromCodePoint(...codes));
  const knownMojibakeFragments = [
    [0x8c8a, 0x60dc],
    [0x875e],
    [0x64d0],
    [0x61bf],
    [0x92c6],
    [0x95ac],
    [0x64a0],
  ].map(codes => String.fromCodePoint(...codes));
  const hasBadChar = value =>
    /[\uFFFD\uE000-\uF8FF]/u.test(value) ||
    latinMojibakeFragments.some(fragment => value.includes(fragment)) ||
    mojibakeChars.some(char => value.includes(char)) ||
    knownMojibakeFragments.some(fragment => value.includes(fragment));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!hasBadChar(text)) continue;
    const line = text.split(/\r?\n/).findIndex(value => hasBadChar(value)) + 1;
    failures += fail(`Possible mojibake/private-use character: ${rel(file)}:${line}`);
  }
  if (failures === 0) ok('No mojibake markers found in project text files.');
  return failures;
}
function scanRawHtmlUsage(files) {
  section('Raw HTML safety scan');
  let failures = 0;
  for (const file of files.filter(item => path.extname(item) === '.astro')) {
    const text = fs.readFileSync(file, 'utf8');
    if (!/\bset:html\s*=/.test(text)) continue;
    const safeJsonLd = /type="application\/ld\+json"\s+set:html=\{safeJsonStringify\(/.test(text);
    const safeJsonConfig =
      /type="application\/json"\s+id="bb-post-back-config"\s+set:html=\{safeJsonStringify\(/.test(
        text
      );
    if (!safeJsonLd && !safeJsonConfig)
      failures += fail(`Unsafe or unreviewed set:html usage: ${rel(file)}`);
  }
  if (failures === 0)
    ok('Raw HTML injection points are restricted to JSON-LD or sanitized analytics bootstrap.');
  return failures;
}

function scanBlankTargetLinks(files) {
  section('External link safety scan');
  let failures = 0;
  const targetBlank = /<a\b[^>]*target=["']_blank["'][^>]*>/g;
  for (const file of files.filter(item => ['.astro', '.md', '.mdx'].includes(path.extname(item)))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(targetBlank)) {
      const tag = match[0];
      if (!/rel=["'][^"']*\bnoopener\b[^"']*\bnoreferrer\b[^"']*["']/.test(tag)) {
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        failures += fail(`target="_blank" missing rel="noopener noreferrer": ${rel(file)}:${line}`);
      }
    }
  }
  if (failures === 0) ok('External blank-target links include noopener noreferrer.');
  return failures;
}

function scanI18nIntegrity() {
  section('i18n integrity scan');
  const uiFile = path.join(ROOT, 'src', 'i18n', 'ui.ts');
  let failures = 0;
  if (!fs.existsSync(uiFile)) return fail('Missing src/i18n/ui.ts.');

  const text = fs.readFileSync(uiFile, 'utf8');
  const localeBlocks = [...text.matchAll(/^\s{2}(['"]?[\w-]+['"]?):\s*\{([\s\S]*?)^\s{2}\},/gm)];
  const entries = new Map();
  for (const [, rawLocale, body] of localeBlocks) {
    const locale = rawLocale.replace(/['"]/g, '');
    const keys = [...body.matchAll(/^\s{4}['"]([^'"]+)['"]:/gm)].map(match => match[1]);
    entries.set(locale, new Set(keys));
  }

  for (const locale of ['en', 'zh-tw', 'zh-cn']) {
    if (!entries.has(locale)) failures += fail(`Missing i18n locale block: ${locale}`);
  }

  const base = entries.get('en') ?? new Set();
  for (const locale of ['zh-tw', 'zh-cn']) {
    const current = entries.get(locale) ?? new Set();
    for (const key of base) {
      if (!current.has(key)) failures += fail(`Missing i18n key ${locale}.${key}`);
    }
    for (const key of current) {
      if (!base.has(key)) failures += fail(`Unexpected i18n key ${locale}.${key}`);
    }
  }

  if (failures === 0) ok('Required translation keys are present for all locales.');
  return failures;
}

function scanAccessibilityWiring(files) {
  section('Accessibility wiring scan');
  let failures = 0;
  const navbar = files.find(file => rel(file) === 'src/components/Navbar.astro');
  const layout = files.find(file => rel(file) === 'src/layouts/BaseLayout.astro');
  if (!navbar) failures += fail('Missing src/components/Navbar.astro.');
  if (!layout) failures += fail('Missing src/layouts/BaseLayout.astro.');
  if (!navbar || !layout) return failures;

  const navbarText = fs.readFileSync(navbar, 'utf8');
  const layoutText = fs.readFileSync(layout, 'utf8');
  if (!/href=["']#main-content["']/.test(navbarText)) {
    failures += fail('Skip link does not target #main-content.');
  }
  if (!/<main\b[^>]*id=["']main-content["']/.test(layoutText)) {
    failures += fail('Base layout main element is missing id="main-content".');
  }
  if (!/<main\b[^>]*tabindex=["']-1["']/.test(layoutText)) {
    failures += fail('Base layout main element is missing tabindex="-1" for skip-link focus.');
  }

  if (failures === 0) ok('Skip-link target is wired to the main content element.');
  return failures;
}

function scanLocaleRoutes() {
  section('Locale route parity scan');
  const pagesDir = path.join(ROOT, 'src', 'pages');
  let failures = 0;
  const requiredRoots = [
    '404.astro',
    'index.astro',
    'about.astro',
    'contact.astro',
    'disclaimer.astro',
    'privacy.astro',
    'posts.astro',
    'no-category.astro',
    'page/[page].astro',
    'posts/[...slug].astro',
    'categories/[...categoryPath].astro',
    'tags/[tag]/[page].astro',
  ];

  if (fs.existsSync(path.join(pagesDir, 'en'))) {
    failures += fail(
      'Duplicate English route tree still exists at src/pages/en; English lives at src/pages root.'
    );
  }

  for (const route of requiredRoots) {
    if (!fs.existsSync(path.join(pagesDir, route)))
      failures += fail(`Missing default route: src/pages/${route}`);
    for (const locale of ['zh-tw', 'zh-cn']) {
      if (!fs.existsSync(path.join(pagesDir, locale, route))) {
        failures += fail(`Missing localized route: src/pages/${locale}/${route}`);
      }
    }
  }

  if (failures === 0) ok('Default English routes and zh-tw/zh-cn localized routes are present.');
  return failures;
}

function scanCommentLanguage(files) {
  section('Code comment corruption scan');
  let failures = 0;
  const mojibakeChars = [
    0x875c, 0x875e, 0x761a, 0x64d0, 0x9908, 0x7507, 0x929d, 0x7629, 0x9758, 0x96ff, 0x7485, 0x6470,
    0x8761, 0x9708, 0x8a68, 0x95ac, 0x8758, 0x92b5, 0x981d, 0x66ba, 0x977d, 0x55b2, 0x7a62,
  ].map(code => String.fromCodePoint(code));
  const latinMojibakeFragments = [
    [0x00c3],
    [0x00c2],
    [0x00e2, 0x20ac],
    [0x00ef, 0x00bf, 0x00bd],
  ].map(codes => String.fromCodePoint(...codes));
  const knownMojibakeFragments = [
    [0x8c8a, 0x60dc],
    [0x875e],
    [0x64d0],
    [0x61bf],
    [0x92c6],
    [0x95ac],
    [0x64a0],
  ].map(codes => String.fromCodePoint(...codes));
  const hasBadChar = value =>
    /[\uFFFD\uE000-\uF8FF]/u.test(value) ||
    latinMojibakeFragments.some(fragment => value.includes(fragment)) ||
    mojibakeChars.some(char => value.includes(char)) ||
    knownMojibakeFragments.some(fragment => value.includes(fragment));
  const lineComment = /^\s*\/\//;
  const blockCommentLine = /^\s*(\/\*|\*|\*\/)/;
  const inlineComment = /\/\/|\/\*/;

  for (const file of files.filter(item => commentCheckedExtensions.has(path.extname(item)))) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!hasBadChar(lineText) || !inlineComment.test(lineText)) return;
      if (
        lineComment.test(lineText) ||
        blockCommentLine.test(lineText) ||
        /\/\*.*\*\//.test(lineText)
      ) {
        failures += fail(`Non-English or mojibake code comment: ${rel(file)}:${index + 1}`);
      }
    });
  }

  if (failures === 0) ok('Code comments contain no mojibake markers.');
  return failures;
}
function scanRemovedArtifacts() {
  section('Removed artifact scan');
  let failures = 0;
  const forbiddenPaths = ['src/purgecss-output'];
  for (const item of forbiddenPaths) {
    if (fs.existsSync(path.join(ROOT, item)))
      failures += fail(`Removed/generated artifact still exists: ${item}`);
  }

  const packageJson = path.join(ROOT, 'package.json');
  const postcssConfig = path.join(ROOT, 'postcss.config.cjs');
  for (const file of [packageJson, postcssConfig].filter(item => fs.existsSync(item))) {
    const text = fs.readFileSync(file, 'utf8');
    if (/purgecss|ENABLE_PURGECSS|@fullhuman\/postcss-purgecss/i.test(text)) {
      failures += fail(`PurgeCSS configuration or dependency remains: ${rel(file)}`);
    }
  }

  if (failures === 0) ok('No removed build artifacts or PurgeCSS configuration found.');
  return failures;
}

function scanGitignore() {
  section('Sensitive file and .gitignore scan');
  let failures = 0;
  const gitignorePath = path.join(ROOT, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return fail('.gitignore is missing.');
  const gitignoreLines = fs
    .readFileSync(gitignorePath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const pattern of requiredGitignorePatterns) {
    if (!gitignoreLines.includes(pattern)) failures += fail(`.gitignore missing: ${pattern}`);
  }

  for (const file of sensitiveFiles) {
    if (fs.existsSync(path.join(ROOT, file))) {
      console.warn(`[WARN] Local sensitive/runtime file exists and must stay untracked: ${file}`);
    }
  }

  if (failures === 0) ok('.gitignore contains required sensitive-file protections.');
  return failures;
}

function scanHeaders() {
  section('Security headers scan');
  const file = path.join(ROOT, 'public', '_headers');
  if (!fs.existsSync(file)) return fail('public/_headers is missing.');
  const headers = fs.readFileSync(file, 'utf8');
  const checks = [
    ['X-Frame-Options', /X-Frame-Options:\s*DENY/],
    ['X-Content-Type-Options', /X-Content-Type-Options:\s*nosniff/],
    ['Referrer-Policy', /Referrer-Policy:\s*strict-origin-when-cross-origin/],
    ['HSTS', /Strict-Transport-Security:\s*max-age=31536000/],
    [
      'CSP object/frame/base restrictions',
      /Content-Security-Policy:.*object-src 'none'.*frame-ancestors 'none'.*base-uri 'self'/s,
    ],
    [
      'CSP hardened script-src',
      /script-src 'self' https:\/\/www\.googletagmanager\.com https:\/\/www\.google-analytics\.com/,
    ],
    [
      'Static asset immutable cache',
      /\/_astro\/\*\s+Cache-Control:\s*public, max-age=31536000, immutable/s,
    ],
  ];
  let failures = 0;
  for (const [label, regex] of checks) {
    failures += regex.test(headers) ? ok(label) : fail(`Missing or weak header: ${label}`);
  }
  if (/script-src[^;]*'unsafe-inline'/.test(headers)) {
    failures += fail("CSP script-src still allows 'unsafe-inline'.");
  } else {
    ok("CSP script-src excludes 'unsafe-inline'.");
  }
  return failures;
}

function scanPublicScripts() {
  section('Public client script scan');
  let failures = 0;
  for (const item of requiredPublicScripts) {
    if (!fs.existsSync(path.join(ROOT, item)))
      failures += fail(`Missing public client script: ${item}`);
  }
  if (failures === 0) ok('Required public client scripts are present.');
  return failures;
}

function scanPublicScriptInventory(files) {
  section('Public script inventory scan');
  let failures = 0;
  const scriptsDir = path.join(ROOT, 'public', 'scripts');
  if (!fs.existsSync(scriptsDir)) return fail('public/scripts directory is missing.');

  const scriptFiles = fs.readdirSync(scriptsDir).filter(name => name.endsWith('.js'));
  const corpus = files
    .filter(file => {
      const normalized = rel(file);
      return normalized.startsWith('src/') || normalized.startsWith('public/');
    })
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');

  for (const name of scriptFiles) {
    const reference = `/scripts/${name}`;
    if (!corpus.includes(reference)) {
      failures += fail(`Orphan public script (no src reference): public/scripts/${name}`);
    }
  }

  for (const item of requiredPublicScripts) {
    const name = path.basename(item);
    if (!scriptFiles.includes(name))
      failures += fail(`Required script missing from public/scripts: ${name}`);
  }

  if (failures === 0) ok('All public scripts are referenced and required scripts exist.');
  return failures;
}

function scanRoutesCentralization() {
  section('Posts route centralization scan');
  let failures = 0;
  for (const routeFile of postsRouteFiles) {
    const full = path.join(ROOT, routeFile);
    if (!fs.existsSync(full)) {
      failures += fail(`Missing posts route file: ${routeFile}`);
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    const isPageOneRoute = routeFile.endsWith('posts.astro');
    if (
      isPageOneRoute &&
      (!/from\s+['"][^'"]*lib\/routes['"]/.test(text) || !/getPostsPageUrl/.test(text))
    ) {
      failures += fail(
        `${routeFile} must import getPostsPageUrl from src/lib/routes for canonical page-one URLs.`
      );
    }
    if (/\/page\/\$\{/.test(text) && !/getPostsListUrl|getPostsPageUrl/.test(text)) {
      failures += fail(`${routeFile} contains inline pagination URL construction.`);
    }
  }
  if (failures === 0) ok('Posts pagination routes use centralized src/lib/routes helpers.');
  return failures;
}

function scanLangSwitchWiring() {
  section('Language switch wiring scan');
  let failures = 0;
  const utilsFile = path.join(ROOT, 'src', 'i18n', 'utils.ts');
  if (!fs.existsSync(utilsFile)) return fail('src/i18n/utils.ts is missing.');
  const text = fs.readFileSync(utilsFile, 'utf8');
  const requiredPatterns = [
    [/from\s+['"][^'"]*lib\/routes['"]/, 'import from src/lib/routes'],
    [/stripLocalePathParts/, 'stripLocalePathParts usage'],
    [/getTargetLangRoute/, 'shared route resolver'],
    [/parts\[0\]\s*===\s*['"]posts['"]\s*&&\s*parts\.length\s*>\s*1/, 'article branch'],
    [/getPostUrl/, 'translated article URL lookup'],
    [/buildDynamicCategoryMapping/, 'translated category mapping'],
    [/buildDynamicTagMapping/, 'translated tag mapping'],
    [/getTotalPages/, 'target page bound checking'],
  ];
  for (const [pattern, label] of requiredPatterns) {
    if (!pattern.test(text)) failures += fail(`Language route resolver missing ${label}.`);
  }

  const navbarFile = path.join(ROOT, 'src', 'components', 'Navbar.astro');
  const headMetaFile = path.join(ROOT, 'src', 'components', 'HeadMeta.astro');
  const navbarText = fs.existsSync(navbarFile) ? fs.readFileSync(navbarFile, 'utf8') : '';
  const headMetaText = fs.existsSync(headMetaFile) ? fs.readFileSync(headMetaFile, 'utf8') : '';
  if (!/languageRoutes/.test(navbarText) || /getCollection/.test(navbarText)) {
    failures += fail('Navbar must consume shared languageRoutes without reading content itself.');
  }
  if (!/languageRoutes/.test(headMetaText) || /getLocalizedUrl/.test(headMetaText)) {
    failures += fail('HeadMeta must consume resolved languageRoutes instead of prefix-only URLs.');
  }
  if (failures === 0) ok('Language switching uses one bounded, content-aware route resolver.');
  return failures;
}

function scanSourceLandmarks(files) {
  section('Source landmark uniqueness scan');
  let failures = 0;
  const astroFiles = files.filter(file => file.endsWith('.astro'));

  for (const file of astroFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const mainIds = text.match(/id=["']main-content["']/g) ?? [];
    if (rel(file) === 'src/layouts/BaseLayout.astro') {
      if (mainIds.length !== 1) failures += fail('BaseLayout must define one #main-content.');
    } else if (mainIds.length > 0) {
      failures += fail(`Nested or duplicate #main-content source: ${rel(file)}`);
    }
  }

  if (failures === 0) ok('Only BaseLayout defines the main-content landmark.');
  return failures;
}

function getBuiltHtmlForUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const configuredOrigin = String(process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (configuredOrigin && url.origin !== new URL(configuredOrigin).origin) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const segments = pathname.split('/').filter(Boolean);
  if (segments.at(-1)?.endsWith('.html')) return path.join(ROOT, 'dist', ...segments);
  return path.join(ROOT, 'dist', ...segments, 'index.html');
}

function extractAlternateLinks(html) {
  return Array.from(
    html.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["'][^>]*>/gi),
    match => ({ lang: match[1], href: match[2].replaceAll('&amp;', '&') })
  );
}

function extractCanonical(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
}

function scanBuiltLandmarksAndAlternates() {
  section('Built landmarks and hreflang graph scan');
  let failures = 0;
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) return fail('dist/ is missing; run build first.');

  const htmlFiles = walk(distDir).filter(file => file.endsWith('.html'));
  for (const file of htmlFiles) {
    if (/^google[a-z0-9]+\.html$/i.test(path.basename(file))) continue;
    const html = fs.readFileSync(file, 'utf8');
    const mainCount = (html.match(/<main\b/gi) ?? []).length;
    const mainIdCount = (html.match(/id=["']main-content["']/gi) ?? []).length;
    if (mainCount !== 1 || mainIdCount !== 1) {
      failures += fail(`${rel(file)} must contain exactly one main and one #main-content.`);
    }

    const alternates = extractAlternateLinks(html);
    if (alternates.length === 0) continue;
    const canonical = extractCanonical(html);
    const seenLanguages = new Set();
    if (!canonical) {
      failures += fail(`${rel(file)} has alternates but no canonical URL.`);
      continue;
    }

    for (const alternate of alternates) {
      if (seenLanguages.has(alternate.lang)) {
        failures += fail(`${rel(file)} duplicates hreflang ${alternate.lang}.`);
      }
      seenLanguages.add(alternate.lang);
      const targetFile = getBuiltHtmlForUrl(alternate.href);
      if (!targetFile || !fs.existsSync(targetFile)) {
        failures += fail(`${rel(file)} hreflang target does not exist: ${alternate.href}`);
        continue;
      }

      if (alternate.lang !== 'x-default') {
        const targetHtml = fs.readFileSync(targetFile, 'utf8');
        const targetHrefs = new Set(extractAlternateLinks(targetHtml).map(item => item.href));
        if (!targetHrefs.has(canonical)) {
          failures += fail(`${rel(targetFile)} does not reciprocate hreflang to ${canonical}.`);
        }
      }
    }

    if (!seenLanguages.has('x-default')) {
      failures += fail(`${rel(file)} alternate set is missing x-default.`);
    }
  }

  if (failures === 0) ok('Built pages have one main landmark and a reciprocal hreflang graph.');
  return failures;
}

function scanSitemapAlternates() {
  section('Sitemap hreflang target scan');
  let failures = 0;
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) return fail('dist/ is missing; run build first.');
  const sitemapFiles = walk(distDir).filter(file => /sitemap-\d+\.xml$/i.test(file));

  for (const file of sitemapFiles) {
    const xml = fs.readFileSync(file, 'utf8');
    for (const blockMatch of xml.matchAll(/<url>(.*?)<\/url>/gs)) {
      const block = blockMatch[1];
      const loc = block.match(/<loc>(.*?)<\/loc>/s)?.[1]?.replaceAll('&amp;', '&');
      if (!loc) continue;
      const pageFile = getBuiltHtmlForUrl(loc);
      if (!pageFile || !fs.existsSync(pageFile)) {
        failures += fail(`Sitemap location has no built page: ${loc}`);
        continue;
      }

      const htmlAlternates = new Set(
        extractAlternateLinks(fs.readFileSync(pageFile, 'utf8')).map(
          item => `${item.lang}|${item.href}`
        )
      );
      const sitemapAlternates = new Set(
        Array.from(
          block.matchAll(/<xhtml:link\b[^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/>/g),
          match => `${match[1]}|${match[2].replaceAll('&amp;', '&')}`
        )
      );
      if (htmlAlternates.size !== sitemapAlternates.size) {
        failures += fail(`Sitemap alternate count differs from HTML for ${loc}.`);
      }
      for (const item of htmlAlternates) {
        if (!sitemapAlternates.has(item)) failures += fail(`Sitemap missing alternate ${item}.`);
      }
    }
  }

  if (failures === 0) ok('Sitemap hreflang entries match HTML and point to built pages.');
  return failures;
}

function scanClientSecurityAndPerformance() {
  section('Client privacy, navigation, and old-device scan');
  let failures = 0;
  const settings = fs.readFileSync(path.join(ROOT, 'public/scripts/bb-settings-bootstrap.js'), 'utf8');
  const ga4 = fs.readFileSync(path.join(ROOT, 'public/scripts/bb-ga4.js'), 'utf8');
  const postBack = fs.readFileSync(path.join(ROOT, 'public/scripts/bb-post-back.js'), 'utf8');
  const clock = fs.readFileSync(path.join(ROOT, 'public/scripts/bb-home-clock.js'), 'utf8');
  const sidebar = fs.readFileSync(path.join(ROOT, 'public/scripts/bb-sidebar.js'), 'utf8');

  if (!/===\s*true/.test(settings) || /Object\.assign\s*\(/.test(settings)) {
    failures += fail('Privacy settings must normalize allowlisted fields to strict booleans.');
  }
  if (!/loaded\s*&&[\s\S]*location\.reload\s*\(/.test(ga4)) {
    failures += fail('GA4 consent revocation must stop an already loaded analytics session.');
  }
  if (!/new URL\(lastPath,[\s\S]*origin\s*!==\s*window\.location\.origin/.test(postBack)) {
    failures += fail('Post-back path must be parsed and restricted to the current origin.');
  }
  if ((clock.match(/new Intl\.DateTimeFormat/g) ?? []).length !== 2 || !/formatterTimezone/.test(clock)) {
    failures += fail('Clock formatters must be cached and rebuilt only after timezone changes.');
  }
  if (!/saveData/.test(sidebar) || !/slow-2g/.test(sidebar) || !/effectiveType/.test(sidebar)) {
    failures += fail('Sidebar prefetch must respect data saver and slow network connections.');
  }

  if (failures === 0) ok('Client scripts enforce consent, same-origin navigation, and low-cost behavior.');
  return failures;
}

function scanDeploymentEnvPrecedence() {
  section('Deployment environment precedence scan');
  let failures = 0;
  for (const file of [
    'scripts/uploaddist_cf.mjs',
    'scripts/uploaddist_vercel.mjs',
    'scripts/uploaddist_vps.mjs',
  ]) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (!/process\.env\[key\]\s*===\s*undefined/.test(text)) {
      failures += fail(`${file} may overwrite an environment-injected deployment secret.`);
    }
  }
  if (failures === 0) ok('Deployment env files only fill values absent from process env.');
  return failures;
}

function scanPaginationStyleOwnership() {
  section('Pagination CSS ownership scan');
  let failures = 0;
  const component = fs.readFileSync(path.join(ROOT, 'src/components/Pagination.astro'), 'utf8');
  const globalCss = fs.readFileSync(path.join(ROOT, 'src/styles/global.css'), 'utf8');
  if (/\.pagination\s*\{/.test(component)) {
    failures += fail('Pagination.astro duplicates globally owned pagination styles.');
  }
  if (!/\.pagination\s*\{/.test(globalCss)) {
    failures += fail('global.css is missing the canonical pagination styles.');
  }
  if (failures === 0) ok('Pagination styles have one global owner.');
  return failures;
}

function scanLibExports() {
  section('Library export scan');
  let failures = 0;
  const libDir = path.join(ROOT, 'src', 'lib');
  if (!fs.existsSync(libDir)) return fail('src/lib is missing.');

  const corpus = walk(ROOT)
    .filter(file => {
      const normalized = rel(file);
      if (
        normalized.startsWith('src/lib/') &&
        normalized.endsWith('.ts') &&
        !normalized.endsWith('.test.ts')
      ) {
        return false;
      }
      return (
        normalized.startsWith('src/') ||
        normalized.startsWith('tests/') ||
        normalized.endsWith('.spec.ts') ||
        normalized.startsWith('public/scripts/')
      );
    })
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const identifiers = new Set(corpus.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []);

  for (const entry of fs.readdirSync(libDir)) {
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
    const filePath = path.join(libDir, entry);
    const text = fs.readFileSync(filePath, 'utf8');
    const exported = [
      ...text.matchAll(/^export function (\w+)/gm),
      ...text.matchAll(/^export const (\w+)/gm),
    ].map(match => match[1]);

    for (const name of exported) {
      const localReferences = (text.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []).filter(
        identifier => identifier === name
      ).length;
      if (!identifiers.has(name) && localReferences <= 1) {
        failures += fail(`Exported symbol appears unused: ${name} in src/lib/${entry}`);
      }
    }
  }

  if (failures === 0) ok('Exported helpers in src/lib are referenced.');
  return failures;
}

function scanTypesWiring(files) {
  section('Shared types wiring scan');
  let failures = 0;
  const typesFile = path.join(ROOT, 'src', 'types', 'index.ts');
  if (!fs.existsSync(typesFile)) return fail('src/types/index.ts is missing.');

  const corpus = files
    .filter(file => rel(file) !== 'src/types/index.ts')
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');

  if (!/from\s+['"][^'"]*types['"]/.test(corpus) && !/from\s+['"]\.\.\/types['"]/.test(corpus)) {
    failures += fail('src/types/index.ts is not imported anywhere; shared types are dead code.');
  }

  const breadcrumbs = path.join(ROOT, 'src', 'components', 'Breadcrumbs.astro');
  if (fs.existsSync(breadcrumbs)) {
    const text = fs.readFileSync(breadcrumbs, 'utf8');
    if (!/from\s+['"][^'"]*types['"]/.test(text)) {
      failures += fail('Breadcrumbs.astro should import BreadcrumbItem from src/types.');
    }
    if (/export interface BreadcrumbItem/.test(text)) {
      failures += fail('Breadcrumbs.astro duplicates BreadcrumbItem; use src/types instead.');
    }
  }

  if (failures === 0) ok('Shared types module is wired into components.');
  return failures;
}

function scanEnvExample() {
  section('Environment template scan');
  let failures = 0;
  const envExample = path.join(ROOT, '.env.example');
  if (!fs.existsSync(envExample)) return fail('.env.example is missing.');

  const text = fs.readFileSync(envExample, 'utf8');
  const siteUrlMatch = text.match(/^PUBLIC_SITE_URL=(.+)$/m);
  if (!siteUrlMatch) {
    failures += fail('.env.example must document PUBLIC_SITE_URL.');
  } else {
    const value = siteUrlMatch[1].trim();
    if (!/^https:\/\//.test(value))
      failures += fail('PUBLIC_SITE_URL in .env.example must use https://.');
    if (value !== 'https://example.com') {
      failures += fail(
        '.env.example PUBLIC_SITE_URL must use the portable https://example.com placeholder.'
      );
    }
    if (/\/$/.test(value)) failures += fail('PUBLIC_SITE_URL in .env.example must not end with /.');
  }

  if (!/^PUBLIC_CONTACT_EMAIL=.+$/m.test(text)) {
    failures += fail('.env.example must document PUBLIC_CONTACT_EMAIL.');
  } else if (!/^PUBLIC_CONTACT_EMAIL=[^@\s]+@example\.com$/m.test(text)) {
    failures += fail('.env.example PUBLIC_CONTACT_EMAIL must use an example.com placeholder.');
  }

  const siteModule = path.join(ROOT, 'src', 'lib', 'site.ts');
  const siteText = fs.existsSync(siteModule) ? fs.readFileSync(siteModule, 'utf8') : '';
  if (/contact@example\.com/.test(siteText) || !/PUBLIC_CONTACT_EMAIL is required/.test(siteText)) {
    failures += fail(
      'Runtime contact email must be required; example.com belongs only in public templates.'
    );
  }

  if (failures === 0) ok('Environment template uses portable, non-sensitive placeholders.');
  return failures;
}

function extractPaginationBlock(html) {
  const match = html.match(/<nav class="pagination"[^>]*>[\s\S]*?<\/nav>/);
  return match?.[0] ?? '';
}

function scanBuiltPaginationLocale() {
  section('Built pagination locale scan');
  let failures = 0;
  const samples = [
    { file: 'dist/zh-tw/page/2/index.html', localePrefix: '/zh-tw/', forbidLegacyEn: false },
    { file: 'dist/zh-cn/page/2/index.html', localePrefix: '/zh-cn/', forbidLegacyEn: false },
    { file: 'dist/page/2/index.html', localePrefix: '/page/', forbidLegacyEn: true },
  ];
  const existingSamples = samples.filter(sample => fs.existsSync(path.join(ROOT, sample.file)));

  if (existingSamples.length === 0) {
    ok('Pagination locale samples are not required for a single-page content set.');
    return 0;
  }

  for (const sample of samples) {
    const full = path.join(ROOT, sample.file);
    if (!fs.existsSync(full)) {
      failures += fail(`Missing built pagination sample: ${sample.file}`);
      continue;
    }
    const html = fs.readFileSync(full, 'utf8');
    const pagination = extractPaginationBlock(html);
    if (!pagination) {
      failures += fail(`${sample.file} missing pagination navigation block.`);
      continue;
    }
    if (sample.localePrefix === '/page/') {
      const hasEnglishPagination =
        pagination.includes('href="/page/') ||
        pagination.includes('href="/posts') ||
        pagination.includes("href='/posts");
      if (!hasEnglishPagination) {
        failures += fail(`${sample.file} pagination links missing English /posts or /page/N URLs.`);
      }
    } else {
      const localizedPosts = `href="${sample.localePrefix.slice(0, -1)}/posts`;
      const localizedPostsAlt = `href='${sample.localePrefix.slice(0, -1)}/posts`;
      const hasLocalizedPagination =
        pagination.includes(`href="${sample.localePrefix}`) ||
        pagination.includes(`href='${sample.localePrefix}`) ||
        pagination.includes(localizedPosts) ||
        pagination.includes(localizedPostsAlt);
      if (!hasLocalizedPagination) {
        failures += fail(
          `${sample.file} pagination links missing locale prefix ${sample.localePrefix}`
        );
      }
    }
    if (
      sample.localePrefix !== '/page/' &&
      /class="page-btn"[^>]*href="\/page\/\d+"/.test(pagination)
    ) {
      failures += fail(
        `${sample.file} pagination contains bare /page/N links without locale prefix.`
      );
    }
    if (sample.forbidLegacyEn && /class="page-btn"[^>]*href="\/en\/page\//.test(pagination)) {
      failures += fail(`${sample.file} English pagination must not use legacy /en/ prefix.`);
    }
  }

  if (failures === 0) ok('Built pagination pages preserve locale-specific URLs.');
  return failures;
}

function scanBuiltNoindexPages() {
  section('Built noindex page scan');
  let failures = 0;
  const samples = [
    { file: 'dist/404.html', pattern: /noindex/i },
    { file: 'dist/zh-tw/404/index.html', pattern: /noindex/i },
    { file: 'dist/zh-cn/404/index.html', pattern: /noindex/i },
    { file: 'dist/no-category/index.html', pattern: /noindex/i },
    { file: 'dist/zh-tw/no-category/index.html', pattern: /noindex/i },
    { file: 'dist/zh-cn/no-category/index.html', pattern: /noindex/i },
    { file: 'dist/leaving/index.html', pattern: /noindex/i },
    { file: 'dist/zh-tw/leaving/index.html', pattern: /noindex/i },
    { file: 'dist/zh-cn/leaving/index.html', pattern: /noindex/i },
  ];

  for (const { file, pattern } of samples) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      failures += fail(`Missing built page for noindex check: ${file}`);
      continue;
    }
    const html = fs.readFileSync(full, 'utf8');
    if (!pattern.test(html)) failures += fail(`${file} missing robots noindex directive.`);
  }

  if (failures === 0) ok('Utility pages ship noindex robots directives.');
  return failures;
}

function scanSitemapContent() {
  section('Sitemap content scan');
  let failures = 0;
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) return fail('dist/ is missing; run build first.');

  const sitemapFiles = walk(distDir).filter(file => /sitemap.*\.xml$/i.test(rel(file)));
  if (sitemapFiles.length === 0) return fail('No sitemap XML files found in dist/.');

  let combined = '';
  for (const file of sitemapFiles) {
    combined += fs.readFileSync(file, 'utf8');
  }

  if (/\/posts\/?<\/loc>/i.test(combined) || /<loc>[^<]*\/posts\/?<\/loc>/i.test(combined)) {
    failures += fail(
      'Sitemap still includes /posts listing URLs; these duplicate /page/1 canonicals.'
    );
  }

  const postUrlPattern = /<loc>[^<]+\/(?:zh-tw\/|zh-cn\/)?posts\/[^<]+<\/loc>/i;
  if (!postUrlPattern.test(combined)) {
    failures += fail('Sitemap does not include any blog post URLs.');
  }

  if (/example\.com/i.test(combined) && !isPublicTemplate) {
    failures += fail('Sitemap still references example.com; set PUBLIC_SITE_URL before build.');
  }

  if (failures === 0) ok('Sitemap excludes duplicate /posts URLs and includes post entries.');
  return failures;
}

function scanBuiltUnsafeUrls() {
  section('Built unsafe URL scan');
  let failures = 0;
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) return fail('dist/ is missing; run build first.');

  const htmlFiles = walk(distDir).filter(file => file.endsWith('.html'));
  const unsafePatterns = [
    { label: 'script URL scheme in anchor', regex: /<a\b[^>]*href=["']javascript:/i },
    { label: 'data: URL in anchor', regex: /<a\b[^>]*href=["']data:/i },
  ];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const { label, regex } of unsafePatterns) {
      if (regex.test(html)) failures += fail(`${label} in ${rel(file)}`);
    }
  }

  if (failures === 0) ok('Built HTML contains no javascript: or data: anchor URLs.');
  return failures;
}

function scanCssIntegrity(files) {
  section('CSS integrity scan');
  let failures = 0;
  const cssFiles = files.filter(
    file => rel(file).startsWith('src/styles/') && file.endsWith('.css')
  );
  const idCounts = new Map();

  for (const file of cssFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/#([a-zA-Z][\w-]*)\b/g)) {
      const id = match[1];
      const key = id;
      const entry = idCounts.get(key) ?? { count: 0, files: new Set() };
      entry.count += 1;
      entry.files.add(rel(file));
      idCounts.set(key, entry);
    }
  }

  for (const [id, entry] of idCounts) {
    if (entry.files.size > 1) {
      failures += fail(
        `Duplicate CSS id selector #${id} across files: ${[...entry.files].join(', ')}`
      );
    }
  }

  const globalCss = path.join(ROOT, 'src', 'styles', 'global.css');
  if (fs.existsSync(globalCss)) {
    const text = fs.readFileSync(globalCss, 'utf8');
    const importantCount = (text.match(/!important/g) ?? []).length;
    if (importantCount > 40) {
      failures += fail(
        `global.css has ${importantCount} !important rules; reduce specificity conflicts.`
      );
    }
    if (!/content-visibility:\s*auto/.test(text) && !/contain-intrinsic-size/.test(text)) {
      const postCard = path.join(ROOT, 'src', 'components', 'PostCard.astro');
      const postCardText = fs.existsSync(postCard) ? fs.readFileSync(postCard, 'utf8') : '';
      if (!/content-visibility:\s*auto/.test(postCardText)) {
        console.warn(
          '[WARN] No content-visibility optimizations found on post cards or global layout.'
        );
      }
    }
  }

  if (failures === 0) ok('CSS id selectors are not duplicated across stylesheets.');
  return failures;
}

function scanCssLayoutConflicts() {
  section('CSS layout and hover conflict scan');
  let failures = 0;
  const globalCss = path.join(ROOT, 'src', 'styles', 'global.css');
  const postCard = path.join(ROOT, 'src', 'components', 'PostCard.astro');

  if (fs.existsSync(globalCss)) {
    const text = fs.readFileSync(globalCss, 'utf8');
    const mainContentMatch = text.match(/\.main-content\s*\{([\s\S]*?)\n\}/);

    if (mainContentMatch) {
      const body = mainContentMatch[1];
      if (/min-width:\s*0/.test(body) && !/overflow:\s*visible/.test(body)) {
        failures += fail(
          'global.css .main-content has min-width:0 without overflow:visible; hover transforms may clip left/right borders.'
        );
      }
      if (/content-visibility:\s*auto/.test(body)) {
        failures += fail(
          'global.css .main-content uses content-visibility:auto; this can clip transformed post-card borders on hover.'
        );
      }
    }

    if (
      /\.glass-card\s*:hover\s*\{/.test(text) &&
      !/\.glass-card:not\(\.post-card\):hover/.test(text)
    ) {
      failures += fail(
        'global.css .glass-card:hover still applies to post cards; use .glass-card:not(.post-card):hover to avoid transform conflicts.'
      );
    }

    if (!/\.post-card\.glass-card:hover/.test(text)) {
      failures += fail(
        'global.css missing dedicated .post-card.glass-card:hover rule for article list cards.'
      );
    }

    const globalPostHover = text.match(
      /@media\s*\(hover:\s*hover\)\s*\{[\s\S]*?\.post-card:hover\s*\{([\s\S]*?)\}/
    );
    if (globalPostHover && /scale\s*\(/.test(globalPostHover[1])) {
      failures += fail(
        'global.css .post-card:hover must not use scale(); it clips borders in flex layouts.'
      );
    }
  } else {
    failures += fail('src/styles/global.css is missing.');
  }

  if (fs.existsSync(postCard)) {
    const text = fs.readFileSync(postCard, 'utf8');

    if (!/class="post-card glass-card"/.test(text)) {
      failures += fail(
        'PostCard.astro must use class="post-card glass-card" so hover styles stay predictable.'
      );
    }

    if (!/overflow:\s*visible/.test(text)) {
      failures += fail(
        'PostCard.astro .post-card should set overflow:visible to keep borders visible during hover transforms.'
      );
    }

    for (const [, body] of text.matchAll(/\.post-card:hover\s*\{([\s\S]*?)\}/g)) {
      if (/scale\s*\(/.test(body)) {
        failures += fail(
          'PostCard.astro .post-card:hover must not use scale(); it clips borders inside flex containers.'
        );
      }
    }
  } else {
    failures += fail('src/components/PostCard.astro is missing.');
  }

  if (failures === 0)
    ok('Flex containers and post-card hover styles avoid border-clipping patterns.');
  return failures;
}

function scanCssDuplication() {
  section('CSS duplication scan');
  let failures = 0;
  const globalCss = path.join(ROOT, 'src', 'styles', 'global.css');
  const postCard = path.join(ROOT, 'src', 'components', 'PostCard.astro');

  if (fs.existsSync(globalCss) && fs.existsSync(postCard)) {
    const globalText = fs.readFileSync(globalCss, 'utf8');
    const postCardText = fs.readFileSync(postCard, 'utf8');
    const sharedSelectors = ['.post-card-link', '.post-card-title', '.post-card-footer'];

    for (const selector of sharedSelectors) {
      const selectorStart = `${selector} {`;
      const inGlobal = globalText.includes(selectorStart);
      const inComponent = postCardText.includes(selectorStart);
      if (inGlobal && inComponent) {
        failures += fail(
          `${selector} is defined in both global.css and PostCard.astro; duplicated styles can drift and cause hover/layout bugs.`
        );
      }
    }
  }

  if (failures === 0)
    ok('Post card styles are not duplicated across global.css and PostCard.astro.');
  return failures;
}

function scanGoogleVerification() {
  section('Google Search Console verification scan');
  let failures = 0;
  const publicDir = path.join(ROOT, 'public');
  const publicFiles = fs.existsSync(publicDir)
    ? fs.readdirSync(publicDir).filter(name => /^google[a-z0-9]+\.html$/i.test(name))
    : [];

  if (publicFiles.length === 0) {
    if (isPublicTemplate) {
      ok('Public template intentionally omits site-owner verification files.');
    } else {
      failures += fail('Missing google*.html verification file in public/.');
    }
  } else if (publicFiles.length > 1) {
    failures += fail(`Multiple verification files in public/: ${publicFiles.join(', ')}`);
  }

  const builtVerification = path.join(ROOT, 'dist', publicFiles[0] ?? '');
  if (publicFiles[0] && !fs.existsSync(builtVerification)) {
    failures += fail(`Built dist missing verification file: ${publicFiles[0]}`);
  }

  if (failures === 0 && publicFiles.length === 1) {
    ok('Google Search Console verification file is present.');
  }
  return failures;
}

function scanProductionSiteUrl() {
  section('Production site URL scan');
  let failures = 0;
  const siteUrl = String(process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const robotsFile = path.join(ROOT, 'dist', 'robots.txt');
  const robotsText = fs.existsSync(robotsFile) ? fs.readFileSync(robotsFile, 'utf8') : '';
  const builtSiteUrl =
    robotsText.match(/^Sitemap:\s*(https:\/\/[^/\s]+)\/sitemap-index\.xml$/m)?.[1] ?? '';

  if (!siteUrl) {
    if (builtSiteUrl && !/example\.com/i.test(builtSiteUrl)) {
      ok(`Build output site URL is ${builtSiteUrl}`);
    } else {
      console.warn(
        '[WARN] PUBLIC_SITE_URL is unset and dist/robots.txt does not expose a valid production sitemap URL.'
      );
    }
  } else if (!/^https:\/\//.test(siteUrl)) {
    failures += fail('PUBLIC_SITE_URL must start with https://');
  } else if (/example\.com/i.test(siteUrl) && !isPublicTemplate) {
    failures += fail('PUBLIC_SITE_URL must not use example.com in production checks.');
  } else if (/example\.com/i.test(siteUrl)) {
    ok('Public template build uses the documented example.com placeholder.');
  } else {
    ok(`PUBLIC_SITE_URL is set to ${siteUrl}`);
  }

  const astroConfig = path.join(ROOT, 'astro.config.mjs');
  if (fs.existsSync(astroConfig)) {
    const text = fs.readFileSync(astroConfig, 'utf8');
    if (!/process\.env\.PUBLIC_SITE_URL/.test(text)) {
      failures += fail('astro.config.mjs must read site URL from process.env.PUBLIC_SITE_URL.');
    }
    if (/PUBLIC_SITE_URL\s*\|\|\s*['"`]https?:\/\//.test(text)) {
      failures += fail('astro.config.mjs must not hardcode a production site URL fallback.');
    }
    if (/https:\/\/example\.com/i.test(text)) {
      failures += fail('astro.config.mjs fallback site URL must not be example.com.');
    }
  }

  if (failures === 0 && (siteUrl || builtSiteUrl))
    ok('Production site URL configuration looks valid.');
  return failures;
}

function scanEnRedirects() {
  section('English duplicate URL redirect scan');
  const file = path.join(ROOT, 'public', '_redirects');
  let failures = 0;
  if (!fs.existsSync(file)) return fail('public/_redirects is missing.');
  const text = fs.readFileSync(file, 'utf8');
  if (!/\/en\s+\/\s+301/.test(text)) failures += fail('_redirects missing /en -> / rule.');
  if (!/\/en\/\*\s+\/:splat\s+301/.test(text))
    failures += fail('_redirects missing /en/* -> /:splat rule.');
  if (failures === 0) ok('Cloudflare redirects consolidate /en duplicate URLs.');
  return failures;
}

function scanRedirectTargets() {
  section('Static redirect target scan');
  const file = path.join(ROOT, 'public', '_redirects');
  if (!fs.existsSync(file)) return fail('public/_redirects is missing.');

  let failures = 0;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [, target = ''] = line.split(/\s+/);
    if (!target.startsWith('/') || /[:*]/.test(target)) continue;

    const targetPath = decodeURIComponent(target.split(/[?#]/, 1)[0]);
    const relativeTarget = targetPath.replace(/^\/+|\/+$/g, '');
    const builtTarget = relativeTarget
      ? path.join(ROOT, 'dist', relativeTarget, 'index.html')
      : path.join(ROOT, 'dist', 'index.html');
    if (!fs.existsSync(builtTarget)) {
      failures += fail(
        `public/_redirects:${index + 1} points to a missing built route: ${target}`
      );
    }
  }

  if (failures === 0) ok('Exact local redirect destinations exist in the current build.');
  return failures;
}

function scanExecutableInlineScripts(files) {
  section('Executable inline script scan');
  let failures = 0;
  for (const file of files.filter(item => path.extname(item) === '.astro')) {
    const text = fs.readFileSync(file, 'utf8');
    const inlineScripts = [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    for (const [, attrs, body] of inlineScripts) {
      if (!/\bis:inline\b/.test(attrs)) continue;
      if (/type=["']application\/ld\+json["']/.test(attrs)) continue;
      if (/type=["']application\/json["']/.test(attrs)) continue;
      if (/src=/.test(attrs)) continue;
      if (!body.trim()) continue;
      const line = text.slice(0, text.indexOf(body)).split(/\r?\n/).length;
      failures += fail(`Executable inline script remains: ${rel(file)}:${line}`);
    }
  }
  if (failures === 0) ok('No executable is:inline scripts in Astro components/pages.');
  return failures;
}

function scanRobots() {
  section('Robots and sitemap scan');
  let failures = 0;
  const robotsSource = path.join(ROOT, 'src', 'pages', 'robots.txt.ts');
  if (!fs.existsSync(robotsSource)) failures += fail('src/pages/robots.txt.ts is missing.');

  const sitemap = path.join(ROOT, 'dist', 'sitemap-index.xml');
  if (!fs.existsSync(sitemap))
    failures += fail('dist/sitemap-index.xml missing; build may have failed.');

  const robotsBuilt = path.join(ROOT, 'dist', 'robots.txt');
  if (!fs.existsSync(robotsBuilt)) {
    failures += fail('dist/robots.txt missing; build may have failed.');
  } else {
    const robotsText = fs.readFileSync(robotsBuilt, 'utf8');
    const readGroup = agent => {
      const lines = robotsText.split(/\r?\n/);
      const group = [];
      let collecting = false;

      for (const line of lines) {
        const userAgent = line.match(/^User-agent:\s*(.+?)\s*$/i)?.[1];
        if (userAgent) {
          if (collecting) break;
          collecting = userAgent.toLowerCase() === agent.toLowerCase();
          continue;
        }

        if (collecting) {
          if (/^Sitemap:/i.test(line)) break;
          group.push(line);
        }
      }

      return group.join('\n');
    };
    const googlebotGroup = readGroup('Googlebot');
    const wildcardGroup = readGroup('*');
    if (!/Allow:\s*\//i.test(googlebotGroup)) {
      failures += fail('dist/robots.txt must allow Googlebot to crawl the site (Allow: /).');
    }
    if (/Disallow:\s*\//i.test(googlebotGroup)) {
      failures += fail('dist/robots.txt must not Disallow: / for Googlebot.');
    }
    if (/Disallow:\s*\//i.test(wildcardGroup) && !/Allow:\s*\//i.test(wildcardGroup)) {
      failures += fail('dist/robots.txt must not Disallow: / for User-agent: *.');
    }
    if (!/Sitemap:\s*https?:\/\//i.test(robotsText)) {
      failures += fail('dist/robots.txt must include an absolute Sitemap URL.');
    }
    if (/example\.com/i.test(robotsText) && !isPublicTemplate) {
      failures += fail(
        'dist/robots.txt still references example.com; set PUBLIC_SITE_URL before build.'
      );
    }
  }

  const sitemapIndex = path.join(ROOT, 'dist', 'sitemap-index.xml');
  if (fs.existsSync(sitemapIndex)) {
    const sitemapText = fs.readFileSync(sitemapIndex, 'utf8');
    if (/example\.com/i.test(sitemapText) && !isPublicTemplate) {
      failures += fail(
        'dist/sitemap-index.xml still references example.com; set PUBLIC_SITE_URL before build.'
      );
    }
  }

  if (failures === 0) ok('Robots rules allow Googlebot and sitemap is present.');
  return failures;
}

function scanBuiltSeo() {
  section('Built SEO scan');
  const pages = ['dist/index.html', 'dist/zh-tw/index.html', 'dist/zh-cn/index.html'];
  let failures = 0;
  for (const page of pages) {
    const full = path.join(ROOT, page);
    if (!fs.existsSync(full)) {
      failures += fail(`${page} is missing.`);
      continue;
    }
    const html = fs.readFileSync(full, 'utf8');
    for (const [label, regex] of [
      ['title', /<title>[^<]+<\/title>/],
      ['description', /<meta name="description" content="[^"]+"/],
      ['canonical', /<link rel="canonical" href="https?:\/\/[^"]+"/],
      ['hreflang', /<link rel="alternate" hreflang=/],
      ['json-ld', /type="application\/ld\+json"/],
    ]) {
      failures += regex.test(html) ? 0 : fail(`${page} missing ${label}.`);
    }
    if (/example\.com/i.test(html) && !isPublicTemplate) {
      failures += fail(
        `${page} canonical/SEO still references example.com; set PUBLIC_SITE_URL before build.`
      );
    }
  }
  if (failures === 0) ok('Key built pages include core SEO tags.');
  return failures;
}

function scanDefaultEnglishSeo() {
  section('Default English SEO scan');
  const root = path.join(ROOT, 'dist', 'index.html');
  const builtEnDir = path.join(ROOT, 'dist', 'en');
  let failures = 0;
  if (!fs.existsSync(root)) return fail('dist/index.html is missing.');
  const rootHtml = fs.readFileSync(root, 'utf8');
  if (!/<html[^>]+lang="en"/.test(rootHtml))
    failures += fail('Default root page is not marked lang="en".');
  if (!/rel="alternate" hreflang="x-default"[^>]+href="[^"]+"/.test(rootHtml)) {
    failures += fail('Default root page is missing x-default alternate link.');
  }
  if (
    !isPublicTemplate &&
    !/property="og:image" content="[^"]*og-default\.png/.test(rootHtml)
  ) {
    failures += fail('Default root page is missing og-default.png Open Graph image.');
  }
  if (fs.existsSync(builtEnDir)) {
    failures += fail(
      'dist/en still exists; duplicate English HTML should be removed from build output.'
    );
  }
  if (failures === 0) ok('Root defaults to English without duplicate /en build output.');
  return failures;
}

function scanReadmes() {
  section('README duplication scan');
  const duplicateNames = ['README.en.md', 'README_en.md'];
  let failures = 0;
  for (const name of duplicateNames) {
    if (fs.existsSync(path.join(ROOT, name)))
      failures += fail(`Duplicate legacy README exists: ${name}`);
  }
  if (failures === 0) ok('No legacy duplicate README files found.');
  return failures;
}

function scanDocumentationLocales() {
  section('Documentation locale completeness scan');
  let failures = 0;
  const groups = [
    ['README.md', 'README.zh-TW.md', 'README.zh-CN.md'],
    ['MARKDOWN_GUIDE.en.md', 'MARKDOWN_GUIDE.zh-TW.md', 'MARKDOWN_GUIDE.zh-CN.md'],
    ['BOOKMARKS_GUIDE.en.md', 'BOOKMARKS_GUIDE.zh-TW.md', 'BOOKMARKS_GUIDE.zh-CN.md'],
    ['DEPLOYMENT.en.md', 'DEPLOYMENT.zh-TW.md', 'DEPLOYMENT.zh-CN.md'],
    ['scripts/README.en.md', 'scripts/README.zh-TW.md', 'scripts/README.zh-CN.md'],
  ];

  for (const group of groups) {
    for (const file of group) {
      const full = path.join(ROOT, file);
      if (!fs.existsSync(full)) {
        failures += fail(`Missing documentation locale file: ${file}`);
        continue;
      }
      if (fs.readFileSync(full, 'utf8').trim().length < 500) {
        failures += fail(`Documentation locale file is unexpectedly incomplete: ${file}`);
      }
    }
  }

  const indexFile = path.join(ROOT, 'MARKDOWN_GUIDE.md');
  const indexText = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
  for (const file of ['MARKDOWN_GUIDE.en.md', 'MARKDOWN_GUIDE.zh-TW.md', 'MARKDOWN_GUIDE.zh-CN.md']) {
    if (!indexText.includes(`./${file}`)) {
      failures += fail(`MARKDOWN_GUIDE.md is missing locale link: ${file}`);
    }
  }

  if (failures === 0) ok('README, Markdown, bookmark, deployment, and script guides exist in all locales.');
  return failures;
}

function scanDocumentationIntegrity() {
  section('Documentation links and commands scan');
  let failures = 0;
  const documentationFiles = [
    'README.md',
    'README.zh-TW.md',
    'README.zh-CN.md',
    'MARKDOWN_GUIDE.md',
    'MARKDOWN_GUIDE.en.md',
    'MARKDOWN_GUIDE.zh-TW.md',
    'MARKDOWN_GUIDE.zh-CN.md',
    'BOOKMARKS_GUIDE.en.md',
    'BOOKMARKS_GUIDE.zh-TW.md',
    'BOOKMARKS_GUIDE.zh-CN.md',
    'DEPLOYMENT.en.md',
    'DEPLOYMENT.zh-TW.md',
    'DEPLOYMENT.zh-CN.md',
    'scripts/README.en.md',
    'scripts/README.zh-TW.md',
    'scripts/README.zh-CN.md',
  ];
  const packageScripts = new Set(Object.keys(projectPackage.scripts ?? {}));
  const pnpmBuiltins = new Set(['add', 'dlx', 'exec', 'install', 'remove', 'run']);

  for (const relativeFile of documentationFiles) {
    const file = path.join(ROOT, relativeFile);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');

    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, '');
      if (/^(?:[a-z]+:|#|\/\/)/i.test(rawTarget)) continue;
      const pathPart = rawTarget.split('#', 1)[0];
      if (!pathPart) continue;
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(pathPart);
      } catch {
        failures += fail(`${relativeFile} contains an invalid encoded link: ${rawTarget}`);
        continue;
      }
      const target = path.resolve(path.dirname(file), decodedPath);
      if (!fs.existsSync(target)) {
        failures += fail(`${relativeFile} links to a missing local file: ${rawTarget}`);
      }
    }

    for (const match of text.matchAll(/^\s*pnpm\s+([a-z][\w:-]*)/gim)) {
      const command = match[1];
      if (!pnpmBuiltins.has(command) && !packageScripts.has(command)) {
        failures += fail(`${relativeFile} documents an unknown pnpm command: ${command}`);
      }
    }
    for (const match of text.matchAll(/^\s*npm\s+run\s+([a-z][\w:-]*)/gim)) {
      const command = match[1];
      if (!packageScripts.has(command)) {
        failures += fail(`${relativeFile} documents an unknown npm script: ${command}`);
      }
    }
  }

  const deploymentRequirements = [
    'PUBLIC_SITE_URL',
    'PUBLIC_CONTACT_EMAIL',
    '--dry-run',
    '.github/workflows/deploy.yml',
    'upgrade_astro.mjs',
  ];
  for (const relativeFile of ['DEPLOYMENT.en.md', 'DEPLOYMENT.zh-TW.md', 'DEPLOYMENT.zh-CN.md']) {
    const text = fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
    for (const required of deploymentRequirements) {
      if (!text.includes(required)) {
        failures += fail(`${relativeFile} is missing required deployment guidance: ${required}`);
      }
    }
  }

  if (isPublicTemplate) {
    const expectedDemo = '<a href="https://blog.gkbb.de/">Live Demo</a>';
    for (const relativeFile of ['README.md', 'README.zh-TW.md', 'README.zh-CN.md']) {
      const text = fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
      if (!text.includes(expectedDemo)) {
        failures += fail(`${relativeFile} must preserve the intentional blog.gkbb.de Live Demo link.`);
      }
    }
  }

  if (failures === 0) {
    ok('Local documentation links, package commands, deployment requirements, and demo links are valid.');
  }
  return failures;
}

function scanFilterBlockableDom(files) {
  section('Ad-blocker filterable DOM scan');
  let failures = 0;
  const targets = files.filter(file => {
    const ext = path.extname(file);
    return ext === '.astro' || ext === '.css' || ext === '.ts';
  });

  for (const file of targets) {
    const text = fs.readFileSync(file, 'utf8');
    for (const { label, regex } of filterBlockablePatterns) {
      regex.lastIndex = 0;
      if (!regex.test(text)) continue;
      const line = text.split(/\r?\n/).findIndex(value => regex.test(value)) + 1;
      failures += fail(`${label}: ${rel(file)}:${line}`);
    }
  }

  if (failures === 0) ok('No ad-blocker filterable cookie/privacy DOM identifiers found.');
  return failures;
}

function scanComponentWiring() {
  section('Component wiring scan');
  let failures = 0;
  for (const item of requiredComponentWiring) {
    const full = path.join(ROOT, item.file);
    if (!fs.existsSync(full)) {
      failures += fail(`Missing required component: ${item.file}`);
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    for (const pattern of item.patterns) {
      if (!pattern.test(text))
        failures += fail(`Missing wiring pattern ${pattern} in ${item.file}`);
    }
  }
  if (failures === 0) ok('Cookie/settings component wiring is present.');
  return failures;
}

function scanDeadComponents(files) {
  section('Dead component scan');
  const componentsDir = path.join(ROOT, 'src', 'components');
  if (!fs.existsSync(componentsDir)) return fail('src/components is missing.');

  const corpus = files
    .filter(file => rel(file).startsWith('src/'))
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');

  let failures = 0;
  for (const entry of fs.readdirSync(componentsDir)) {
    if (!entry.endsWith('.astro')) continue;
    const relPath = `src/components/${entry}`;
    if (optionalComponents.has(relPath)) continue;
    const importName = entry.replace(/\.astro$/, '');
    const references = [
      `../components/${importName}.astro`,
      `../../components/${importName}.astro`,
      `../components/${importName}`,
      `../../components/${importName}`,
      `<${importName}`,
    ];
    if (!references.some(reference => corpus.includes(reference))) {
      failures += fail(`Unused Astro component (dead code): ${relPath}`);
    }
  }

  if (failures === 0) ok('All components under src/components are referenced.');
  return failures;
}

function scanOgAsset() {
  section('Open Graph asset scan');
  let failures = 0;
  const logo = path.join(ROOT, 'public', 'logo.ico');
  const ogDefault = path.join(ROOT, 'public', 'og-default.png');
  const headMeta = path.join(ROOT, 'src', 'components', 'HeadMeta.astro');
  if (!isPublicTemplate && !fs.existsSync(logo) && !fs.existsSync(ogDefault)) {
    failures += fail('Missing public/logo.ico and public/og-default.png for OG fallback.');
  }
  if (fs.existsSync(headMeta)) {
    const text = fs.readFileSync(headMeta, 'utf8');
    if (/og-default\.png/.test(text) && !fs.existsSync(ogDefault)) {
      failures += fail('HeadMeta references og-default.png but the asset is missing.');
    }
  }
  if (failures === 0) {
    ok(
      isPublicTemplate
        ? 'Public template has no broken references to private branding assets.'
        : 'Open Graph fallback asset is available.'
    );
  }
  return failures;
}

function scanDuplicateVerificationFiles() {
  section('Search verification duplication scan');
  let failures = 0;
  const rootHtml = fs.readdirSync(ROOT).filter(name => /^google[a-z0-9]+\.html$/i.test(name));
  for (const name of rootHtml) {
    failures += fail(`Search verification file should live in public/, not repo root: ${name}`);
  }
  if (failures === 0) ok('No duplicate search-verification HTML in repo root.');
  return failures;
}

function scanHardcodedSecrets(files) {
  section('Hardcoded secret scan');
  let failures = 0;
  const secretPatterns = [
    { label: 'Cloudflare API token shape', regex: /CLOUDFLARE_API_TOKEN\s*=\s*['"][^'"]{20,}['"]/ },
    { label: 'private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { label: 'AWS access key id', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  ];
  const targets = files.filter(
    file => !rel(file).startsWith('.env') && !rel(file).endsWith('.example')
  );

  for (const file of targets) {
    const text = fs.readFileSync(file, 'utf8');
    for (const { label, regex } of secretPatterns) {
      if (regex.test(text)) failures += fail(`${label}: ${rel(file)}`);
    }
  }

  if (failures === 0) ok('No hardcoded secret patterns detected in tracked source files.');
  return failures;
}

function scanBuiltSettingsPanel() {
  section('Built settings panel scan');
  const pages = ['dist/index.html', 'dist/zh-tw/index.html', 'dist/zh-cn/index.html'];
  let failures = 0;
  for (const page of pages) {
    const full = path.join(ROOT, page);
    if (!fs.existsSync(full)) {
      failures += fail(`${page} is missing.`);
      continue;
    }
    const html = fs.readFileSync(full, 'utf8');
    if (!/id="site-prefs-layer"/.test(html))
      failures += fail(`${page} missing site-prefs-layer markup.`);
    if (/id="privacy-cfg"/.test(html))
      failures += fail(`${page} still ships legacy privacy-cfg id.`);
    if (!/bb-prefs-modal\.js/.test(html))
      failures += fail(`${page} missing bb-prefs-modal.js wiring.`);
  }
  if (failures === 0) ok('Built pages include neutral settings panel markup.');
  return failures;
}

function scanPerformanceHints() {
  section('Legacy device performance scan');
  let failures = 0;
  const globalCss = path.join(ROOT, 'src', 'styles', 'global.css');
  if (fs.existsSync(globalCss)) {
    const text = fs.readFileSync(globalCss, 'utf8');
    if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(text)) {
      failures += fail('global.css is missing prefers-reduced-motion safeguards.');
    }
  }

  const layout = path.join(ROOT, 'src', 'layouts', 'BaseLayout.astro');
  const backToTopScript = path.join(ROOT, 'public', 'scripts', 'bb-back-to-top.js');
  if (fs.existsSync(layout)) {
    const text = fs.readFileSync(layout, 'utf8');
    const hasBackToTopWiring = /bb-back-to-top\.js/.test(text);
    const backToTopUsesRaf =
      fs.existsSync(backToTopScript) &&
      /requestAnimationFrame/.test(fs.readFileSync(backToTopScript, 'utf8')) &&
      /passive:\s*true/.test(fs.readFileSync(backToTopScript, 'utf8'));
    if (!hasBackToTopWiring || !backToTopUsesRaf) {
      failures += fail(
        'Back-to-top scroll handler should be externalized with rAF + passive listeners.'
      );
    }
  }

  if (failures === 0) ok('Basic legacy-device performance safeguards are present.');
  return failures;
}

let failures = 0;
section('Command checks');
for (const script of quick
  ? ['check', 'lint', 'lint:css', 'build']
  : ['check', 'lint', 'lint:css', 'build', 'test']) {
  console.log(`\n$ package ${script}`);
  failures += runScript(script);
}
failures += runDeploymentDryRuns();
failures += await runDevSmoke();

const files = textFiles();
failures += scanEnvExample();
failures += scanProductionSiteUrl();
failures += scanOgAsset();
failures += scanGoogleVerification();
failures += scanDuplicateVerificationFiles();
failures += scanDangerousSyntax(files);
failures += scanHardcodedSecrets(files);
failures += scanMojibake(files);
failures += scanCommentLanguage(files);
failures += scanRawHtmlUsage(files);
failures += scanBlankTargetLinks(files);
failures += scanFilterBlockableDom(files);
failures += scanCssIntegrity(files);
failures += scanCssLayoutConflicts();
failures += scanCssDuplication(files);
failures += scanPaginationStyleOwnership();
failures += scanComponentWiring();
failures += scanDeadComponents(files);
failures += scanLibExports();
failures += scanTypesWiring(files);
failures += scanRoutesCentralization();
failures += scanLangSwitchWiring();
failures += scanSourceLandmarks(files);
failures += scanI18nIntegrity();
failures += scanAccessibilityWiring(files);
failures += scanLocaleRoutes();
failures += scanRemovedArtifacts();
failures += scanGitignore();
failures += scanHeaders();
failures += scanPublicScripts();
failures += scanPublicScriptInventory(files);
failures += scanEnRedirects();
failures += scanRedirectTargets();
failures += scanExecutableInlineScripts(files);
failures += scanPerformanceHints();
failures += scanClientSecurityAndPerformance();
failures += scanDeploymentEnvPrecedence();
failures += scanRobots();
failures += scanSitemapContent();
failures += scanSitemapAlternates();
failures += scanBuiltContentProvenance();
failures += scanBuiltSeo();
failures += scanDefaultEnglishSeo();
failures += scanBuiltPaginationLocale();
failures += scanBuiltNoindexPages();
failures += scanBuiltUnsafeUrls();
failures += scanBuiltSettingsPanel();
failures += scanBuiltLandmarksAndAlternates();
failures += scanDocumentationLocales();
failures += scanDocumentationIntegrity();
failures += scanReadmes();

if (failures > 0) {
  console.error(`\nSelf-check completed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nSelf-check completed successfully.');
