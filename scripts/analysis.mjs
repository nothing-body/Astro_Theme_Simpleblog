#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');

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

const ignoredFiles = new Set([
  'eslint-report.json',
  'lighthouse-report.html',
]);

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
  '.env',
  '.env.local',
  '.env.production',
  '.env.*.local',
  '.env.cloudflare',
  '.env.vps',
  '.env.vercel',
  '.env*.secret',
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
  { label: 'HTML string injection APIs', regex: /\.(innerHTML|outerHTML)\s*=|\.insertAdjacentHTML\s*\(/ },
  { label: 'child_process shell:true', regex: /shell\s*:\s*true/ },
  { label: 'disabled SSH host-key checking', regex: /StrictHostKeyChecking\s*=\s*no/ },
  { label: 'plain sshpass usage', regex: /\bsshpass\b/ },
  { label: 'destructive rm -rf', regex: /\brm\s+-rf\b/ },
];

const allowedDangerousMatches = [
  { file: 'scripts/analysis.mjs', labels: new Set(dangerousPatterns.map(item => item.label)) },
];

const filterBlockablePatterns = [
  { label: 'legacy privacy-cfg id/class', regex: /\b(privacy-cfg|toggle-privacy-cfg|footer-privacy-trigger|privacy-trigger-btn|privacy-inline-panel|remember-timezone-toggle|enable-analytics-toggle)\b/ },
  { label: 'filterable cookie-banner id/class', regex: /\b(id|class)=["'][^"']*(cookie-consent|cookie-banner|gdpr-banner|onetrust)[^"']*["']/i },
];

const requiredComponentWiring = [
  { file: 'src/components/CookieConsent.astro', patterns: [/id=["']site-prefs-layer["']/, /bb-prefs-modal\.js/] },
  { file: 'src/components/Footer.astro', patterns: [/id=["']footer-prefs-trigger["']/, /bb-footer-prefs\.js/] },
  { file: 'src/components/HeadMeta.astro', patterns: [/bb-settings-bootstrap\.js/, /bb-ga4\.js/] },
  { file: 'public/scripts/bb-prefs-modal.js', patterns: [/open-site-prefs/] },
  { file: 'public/scripts/bb-settings-bootstrap.js', patterns: [/bb-privacy-v1/, /__privacySettings/] },
  { file: 'src/components/Navbar.astro', patterns: [/bb-navbar\.js/] },
  { file: 'src/components/BookmarkLinks.astro', patterns: [/bb-bookmarks\.js/] },
  { file: 'src/components/Sidebar.astro', patterns: [/bb-sidebar\.js/] },
  { file: 'src/components/HomeClockScript.astro', patterns: [/bb-home-clock\.js/] },
  { file: 'src/components/HomeHero.astro', patterns: [/HomeClockScript/, /intro-title/] },
  { file: 'src/components/HomeLatestPosts.astro', patterns: [/PostCard/, /BookmarkLinks/, /latest-section/] },
];

const requiredPublicScripts = [
  'public/scripts/bb-navbar.js',
  'public/scripts/bb-bookmarks.js',
  'public/scripts/bb-sidebar.js',
  'public/scripts/bb-home-clock.js',
  'public/scripts/bb-last-list.js',
  'public/scripts/bb-no-category-redirect.js',
];

const optionalComponents = new Set([
  'src/components/NotFoundPage.astro',
]);

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
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (result.error) {
    console.error(`[FAIL] ${name}: ${result.error.message}`);
    return 1;
  }
  return result.status === 0 ? 0 : 1;
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

function scanMojibake(files) {
  section('Mojibake scan');
  let failures = 0;
  const mojibakeChars = [
    0x875c, 0x875e, 0x761a, 0x64d0, 0x9908, 0x7507, 0x929d, 0x7629, 0x9758,
    0x96ff, 0x7485, 0x6470, 0x8761, 0x9708, 0x8a68, 0x95ac, 0x8758, 0x92b5,
    0x981d, 0x66ba, 0x977d, 0x55b2, 0x7a62,
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
    const safeJsonConfig = /type="application\/json"\s+id="bb-post-back-config"\s+set:html=\{safeJsonStringify\(/.test(text);
    if (!safeJsonLd && !safeJsonConfig) failures += fail(`Unsafe or unreviewed set:html usage: ${rel(file)}`);
  }
  if (failures === 0) ok('Raw HTML injection points are restricted to JSON-LD or sanitized analytics bootstrap.');
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
    failures += fail('Duplicate English route tree still exists at src/pages/en; English lives at src/pages root.');
  }

  for (const route of requiredRoots) {
    if (!fs.existsSync(path.join(pagesDir, route))) failures += fail(`Missing default route: src/pages/${route}`);
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
    0x875c, 0x875e, 0x761a, 0x64d0, 0x9908, 0x7507, 0x929d, 0x7629, 0x9758,
    0x96ff, 0x7485, 0x6470, 0x8761, 0x9708, 0x8a68, 0x95ac, 0x8758, 0x92b5,
    0x981d, 0x66ba, 0x977d, 0x55b2, 0x7a62,
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
      if (lineComment.test(lineText) || blockCommentLine.test(lineText) || /\/\*.*\*\//.test(lineText)) {
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
  const forbiddenPaths = [
    'src/purgecss-output',
  ];
  for (const item of forbiddenPaths) {
    if (fs.existsSync(path.join(ROOT, item))) failures += fail(`Removed/generated artifact still exists: ${item}`);
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
    ['CSP object/frame/base restrictions', /Content-Security-Policy:.*object-src 'none'.*frame-ancestors 'none'.*base-uri 'self'/s],
    ['CSP hardened script-src', /script-src 'self' https:\/\/www\.googletagmanager\.com https:\/\/www\.google-analytics\.com/],
    ['Static asset immutable cache', /\/_astro\/\*\s+Cache-Control:\s*public, max-age=31536000, immutable/s],
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
    if (!fs.existsSync(path.join(ROOT, item))) failures += fail(`Missing public client script: ${item}`);
  }
  if (failures === 0) ok('Required public client scripts are present.');
  return failures;
}

function scanEnRedirects() {
  section('English duplicate URL redirect scan');
  const file = path.join(ROOT, 'public', '_redirects');
  let failures = 0;
  if (!fs.existsSync(file)) return fail('public/_redirects is missing.');
  const text = fs.readFileSync(file, 'utf8');
  if (!/\/en\s+\/\s+301/.test(text)) failures += fail('_redirects missing /en -> / rule.');
  if (!/\/en\/\*\s+\/:splat\s+301/.test(text)) failures += fail('_redirects missing /en/* -> /:splat rule.');
  if (failures === 0) ok('Cloudflare redirects consolidate /en duplicate URLs.');
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
  if (!fs.existsSync(sitemap)) failures += fail('dist/sitemap-index.xml missing; build may have failed.');

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
  if (!/<html[^>]+lang="en"/.test(rootHtml)) failures += fail('Default root page is not marked lang="en".');
  if (!/rel="alternate" hreflang="x-default"[^>]+href="[^"]+"/.test(rootHtml)) {
    failures += fail('Default root page is missing x-default alternate link.');
  }
  if (!/property="og:image" content="[^"]*og-default\.png/.test(rootHtml)) {
    failures += fail('Default root page is missing og-default.png Open Graph image.');
  }
  if (fs.existsSync(builtEnDir)) {
    failures += fail('dist/en still exists; duplicate English HTML should be removed from build output.');
  }
  if (failures === 0) ok('Root defaults to English without duplicate /en build output.');
  return failures;
}

function scanReadmes() {
  section('README duplication scan');
  const duplicateNames = ['README.en.md', 'README_en.md'];
  let failures = 0;
  for (const name of duplicateNames) {
    if (fs.existsSync(path.join(ROOT, name))) failures += fail(`Duplicate legacy README exists: ${name}`);
  }
  if (failures === 0) ok('No legacy duplicate README files found.');
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
      if (!pattern.test(text)) failures += fail(`Missing wiring pattern ${pattern} in ${item.file}`);
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

function scanDeadExports() {
  section('Dead export scan');
  let failures = 0;
  const utilsFile = path.join(ROOT, 'src', 'lib', 'utils.ts');
  if (fs.existsSync(utilsFile)) {
    const utilsText = fs.readFileSync(utilsFile, 'utf8');
    const exported = [...utilsText.matchAll(/^export function (\w+)/gm)].map(match => match[1]);
    const corpus = walk(ROOT)
      .filter(file => {
        const normalized = rel(file);
        if (normalized === 'src/lib/utils.ts') return false;
        return (
          normalized.startsWith('src/') ||
          normalized.startsWith('tests/') ||
          normalized.endsWith('.spec.ts')
        );
      })
      .map(file => fs.readFileSync(file, 'utf8'))
      .join('\n');
    const identifiers = new Set(corpus.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []);
    for (const name of exported) {
      if (!identifiers.has(name)) failures += fail(`Exported helper appears unused: ${name}()`);
    }
  }

  if (failures === 0) ok('Exported helpers in src/lib/utils.ts are referenced.');
  return failures;
}

function scanOgAsset() {
  section('Open Graph asset scan');
  let failures = 0;
  const logo = path.join(ROOT, 'public', 'logo.ico');
  const ogDefault = path.join(ROOT, 'public', 'og-default.png');
  const headMeta = path.join(ROOT, 'src', 'components', 'HeadMeta.astro');
  if (!fs.existsSync(logo) && !fs.existsSync(ogDefault)) {
    failures += fail('Missing public/logo.ico and public/og-default.png for OG fallback.');
  }
  if (fs.existsSync(headMeta)) {
    const text = fs.readFileSync(headMeta, 'utf8');
    if (/og-default\.png/.test(text) && !fs.existsSync(ogDefault)) {
      failures += fail('HeadMeta references og-default.png but the asset is missing.');
    }
  }
  if (failures === 0) ok('Open Graph fallback asset is available.');
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
  const targets = files.filter(file => !rel(file).startsWith('.env') && !rel(file).endsWith('.example'));

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
    if (!/id="site-prefs-layer"/.test(html)) failures += fail(`${page} missing site-prefs-layer markup.`);
    if (/id="privacy-cfg"/.test(html)) failures += fail(`${page} still ships legacy privacy-cfg id.`);
    if (!/bb-prefs-modal\.js/.test(html)) failures += fail(`${page} missing bb-prefs-modal.js wiring.`);
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
      failures += fail('Back-to-top scroll handler should be externalized with rAF + passive listeners.');
    }
  }

  if (failures === 0) ok('Basic legacy-device performance safeguards are present.');
  return failures;
}

let failures = 0;
section('Command checks');
for (const script of quick ? ['check', 'lint', 'lint:css', 'build'] : ['check', 'lint', 'lint:css', 'build', 'test']) {
  console.log(`\n$ package ${script}`);
  failures += runScript(script);
}

const files = textFiles();
failures += scanOgAsset();
failures += scanDuplicateVerificationFiles();
failures += scanDangerousSyntax(files);
failures += scanHardcodedSecrets(files);
failures += scanMojibake(files);
failures += scanCommentLanguage(files);
failures += scanRawHtmlUsage(files);
failures += scanBlankTargetLinks(files);
failures += scanFilterBlockableDom(files);
failures += scanComponentWiring();
failures += scanDeadComponents(files);
failures += scanDeadExports();
failures += scanI18nIntegrity();
failures += scanAccessibilityWiring(files);
failures += scanLocaleRoutes();
failures += scanRemovedArtifacts();
failures += scanGitignore();
failures += scanHeaders();
failures += scanPublicScripts();
failures += scanEnRedirects();
failures += scanExecutableInlineScripts(files);
failures += scanPerformanceHints();
failures += scanRobots();
failures += scanBuiltSeo();
failures += scanDefaultEnglishSeo();
failures += scanBuiltSettingsPanel();
failures += scanReadmes();

if (failures > 0) {
  console.error(`\nSelf-check completed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nSelf-check completed successfully.');
