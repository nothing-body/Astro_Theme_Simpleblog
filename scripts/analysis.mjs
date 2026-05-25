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
  const execPath = process.env.npm_execpath;
  if (execPath && fs.existsSync(execPath)) {
    return { command: process.execPath, prefix: [execPath] };
  }
  return { command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', prefix: [] };
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
  const badChars =
    /[\uFFFD\uE000-\uF8FF]|[\u875c\u929d\u5697\u7507\u96ff\u646e\u64a0\u922d\u61ad\u76ba\u875e\u761a\u66ba\u8763\u981d\u981b\u92c6\u978e\u6468\u9758\u8751\u875b\u64a3\u928b\u66b9\u7441\u9903\u977d\u865c\u8a3e\u8c62\u6f66]/;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!badChars.test(text)) continue;
    const line = text.split(/\r?\n/).findIndex(value => badChars.test(value)) + 1;
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
    const safeGa4 = rel(file) === 'src/components/HeadMeta.astro' && /safeJsonStringify\(safeGa4Id\)/.test(text);
    if (!safeJsonLd && !safeGa4) failures += fail(`Unsafe or unreviewed set:html usage: ${rel(file)}`);
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

function scanLocaleRoutes() {
  section('Locale route parity scan');
  const pagesDir = path.join(ROOT, 'src', 'pages');
  let failures = 0;
  const requiredRoots = [
    'index.astro',
    'about.astro',
    'contact.astro',
    'disclaimer.astro',
    'privacy.astro',
    'posts.astro',
    'no-category.astro',
    'page/[page].astro',
    'posts/[...slug].astro',
    'categories/[category]/[page].astro',
    'tags/[tag]/[page].astro',
  ];

  for (const route of requiredRoots) {
    if (!fs.existsSync(path.join(pagesDir, route))) failures += fail(`Missing default route: src/pages/${route}`);
    for (const locale of ['en', 'zh-tw', 'zh-cn']) {
      if (!fs.existsSync(path.join(pagesDir, locale, route))) {
        failures += fail(`Missing localized route: src/pages/${locale}/${route}`);
      }
    }
  }

  if (failures === 0) ok('Default and localized route files are present.');
  return failures;
}

function scanCommentLanguage(files) {
  section('Code comment language scan');
  let failures = 0;
  const badChars = /[\p{Script=Han}\uFFFD\uE000-\uF8FF]/u;
  const lineComment = /^\s*\/\//;
  const blockCommentLine = /^\s*(\/\*|\*|\*\/)/;
  const inlineComment = /\/\/|\/\*/;

  for (const file of files.filter(item => commentCheckedExtensions.has(path.extname(item)))) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!badChars.test(lineText) || !inlineComment.test(lineText)) return;
      if (lineComment.test(lineText) || blockCommentLine.test(lineText) || /\/\*.*\*\//.test(lineText)) {
        failures += fail(`Non-English or mojibake code comment: ${rel(file)}:${index + 1}`);
      }
    });
  }

  if (failures === 0) ok('Code comments contain no Chinese or mojibake markers.');
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
    ['Static asset immutable cache', /\/_astro\/\*\s+Cache-Control:\s*public, max-age=31536000, immutable/s],
  ];
  let failures = 0;
  for (const [label, regex] of checks) {
    failures += regex.test(headers) ? ok(label) : fail(`Missing or weak header: ${label}`);
  }
  return failures;
}

function scanRobots() {
  section('Robots and sitemap scan');
  let failures = 0;
  const robotsSource = path.join(ROOT, 'src', 'pages', 'robots.txt.ts');
  if (!fs.existsSync(robotsSource)) failures += fail('src/pages/robots.txt.ts is missing.');
  const sitemap = path.join(ROOT, 'dist', 'sitemap-index.xml');
  if (!fs.existsSync(sitemap)) failures += fail('dist/sitemap-index.xml missing; build may have failed.');
  if (failures === 0) ok('Robots source and built sitemap exist.');
  return failures;
}

function scanBuiltSeo() {
  section('Built SEO scan');
  const pages = ['dist/index.html', 'dist/en/index.html', 'dist/zh-tw/index.html', 'dist/zh-cn/index.html'];
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
  const en = path.join(ROOT, 'dist', 'en', 'index.html');
  let failures = 0;
  if (!fs.existsSync(root)) return fail('dist/index.html is missing.');
  const rootHtml = fs.readFileSync(root, 'utf8');
  if (!/<html[^>]+lang="en"/.test(rootHtml)) failures += fail('Default root page is not marked lang="en".');
  if (!/rel="alternate" hreflang="x-default"[^>]+href="[^"]+"/.test(rootHtml)) {
    failures += fail('Default root page is missing x-default alternate link.');
  }
  if (fs.existsSync(en)) {
    const enHtml = fs.readFileSync(en, 'utf8');
    const rootCanonical = rootHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const enCanonical = enHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (rootCanonical && enCanonical && rootCanonical !== enCanonical) {
      failures += fail('/en canonical differs from root canonical; this can split SEO signals.');
    }
  }
  if (failures === 0) ok('Root defaults to English and /en canonical stays consolidated.');
  return failures;
}

function scanReadmes() {
  section('README duplication scan');
  const duplicateNames = ['README.en.md', 'README_en.md', 'README_zh-TW.md'];
  let failures = 0;
  for (const name of duplicateNames) {
    if (fs.existsSync(path.join(ROOT, name))) failures += fail(`Duplicate legacy README exists: ${name}`);
  }
  if (failures === 0) ok('No legacy duplicate README files found.');
  return failures;
}

let failures = 0;
section('Command checks');
for (const script of quick ? ['check', 'lint', 'lint:css', 'build'] : ['check', 'lint', 'lint:css', 'build', 'test']) {
  console.log(`\n$ package ${script}`);
  failures += runScript(script);
}

const files = textFiles();
failures += scanDangerousSyntax(files);
failures += scanMojibake(files);
failures += scanCommentLanguage(files);
failures += scanRawHtmlUsage(files);
failures += scanBlankTargetLinks(files);
failures += scanLocaleRoutes();
failures += scanRemovedArtifacts();
failures += scanGitignore();
failures += scanHeaders();
failures += scanRobots();
failures += scanBuiltSeo();
failures += scanDefaultEnglishSeo();
failures += scanReadmes();

if (failures > 0) {
  console.error(`\nSelf-check completed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nSelf-check completed successfully.');
