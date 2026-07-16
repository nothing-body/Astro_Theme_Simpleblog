import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Audit, readText, relative, walkFiles } from './core.ts';

function attribute(tag: string, name: string): string {
  for (const match of tag.matchAll(/\b([:\w-]+)=["']([^"']*)["']/gi)) {
    const attributeName = match[1];
    const value = match[2];
    if (attributeName?.toLowerCase() === name.toLowerCase() && value !== undefined) return value;
  }
  return '';
}

function outputPathForUrl(dist: string, href: string, siteOrigin: string): string | null {
  try {
    const url = new URL(href, siteOrigin);
    if (url.origin !== siteOrigin) return null;
    const segments = decodeURIComponent(url.pathname).split('/').filter(Boolean);
    if (segments.some(segment => segment === '.' || segment === '..')) return null;
    const base = path.resolve(dist, ...segments);
    const relativePath = path.relative(dist, base);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
    const candidates = path.extname(base)
      ? [base]
      : [path.join(base, 'index.html'), `${base}.html`];
    return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
  } catch {
    return null;
  }
}

function expectedPagePath(dist: string, file: string): string {
  const relativePath = path.relative(dist, file).replaceAll('\\', '/');
  if (relativePath === 'index.html') return '/';
  if (!relativePath.includes('/') && relativePath.endsWith('.html')) {
    return `/${relativePath.slice(0, -'.html'.length)}/`;
  }
  return `/${relativePath.replace(/\/index\.html$/, '')}/`;
}

/*
 * Output audit inspects the real production artifact rather than trusting
 * source configuration alone. It verifies SEO ownership, CSP-compatible HTML,
 * responsive image output, internal-link existence, Pagefind/Partytown assets,
 * route policy, robots.txt, sitemap targets, and bundle-size budgets.
 */
export function checkOutput(audit: Audit): void {
  const dist = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(dist)) {
    audit.error('BUILD001', 'dist is missing; run the production build first.');
    return;
  }
  if (fs.existsSync(path.join(dist, 'page', '1', 'index.html')))
    audit.error('ROUTE002', '/page/1 must not be generated.', 'dist/page/1/index.html');

  const files = walkFiles(dist);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const headers = readText(path.join(process.cwd(), 'public', '_headers'));
  const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1] ?? '';
  const allowedScriptHashes = new Set(
    [...csp.matchAll(/'(sha256-[A-Za-z0-9+/]{43}=)'/g)]
      .map(match => match[1])
      .filter(Boolean) as string[]
  );
  const canonicalOwners = new Map<string, string>();
  let siteOrigin = '';

  const sitemapFiles = files.filter(file => /sitemap-\d+\.xml$/.test(file));
  const sitemap = sitemapFiles.map(readText).join('\n');
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(match => match[1])
    .filter(Boolean) as string[];
  try {
    siteOrigin = new URL(locs[0] ?? '').origin;
    if (!siteOrigin.startsWith('https://')) throw new Error('not HTTPS');
  } catch {
    audit.error('SEO006', 'Sitemap must contain an absolute HTTPS URL.');
  }

  for (const file of htmlFiles) {
    const name = relative(file);
    if (/^dist\/google[a-z0-9_-]+\.html$/i.test(name)) continue;
    const html = readText(file);
    let partytownInitializerCount = 0;
    const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    const canonicalTags = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)].map(
      match => match[0]
    );
    if (!noindex && canonicalTags.length !== 1)
      audit.error(
        'SEO003',
        `Expected exactly one canonical link, found ${canonicalTags.length}.`,
        name
      );
    if (canonicalTags[0]) {
      const href = attribute(canonicalTags[0], 'href');
      if (siteOrigin && href !== new URL(expectedPagePath(dist, file), siteOrigin).href) {
        audit.error('SEO009', `Canonical does not match the generated page path: ${href}`, name);
      }
      const owner = canonicalOwners.get(href);
      if (!noindex && owner && owner !== name)
        audit.error('SEO004', `Duplicate canonical ${href}; also used by ${owner}.`, name);
      else if (!noindex) canonicalOwners.set(href, name);
    }
    if (!noindex) {
      const alternates = [
        ...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>/gi),
      ].map(match => attribute(match[0], 'hreflang'));
      for (const expected of ['en', 'zh-TW', 'zh-CN', 'x-default']) {
        if (!alternates.includes(expected))
          audit.error('SEO005', `Missing hreflang ${expected}.`, name);
      }
      if (new Set(alternates).size !== alternates.length) {
        audit.error('SEO010', 'Duplicate hreflang values found.', name);
      }
    }
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = script[1] ?? '';
      const rawBody = script[2] ?? '';
      const body = rawBody.trim();
      const type = attribute(attrs, 'type').toLowerCase();
      if (!body || type === 'application/ld+json' || type === 'application/json') continue;
      if (!type && body.includes('/* Partytown ') && body.includes('/~partytown/')) {
        partytownInitializerCount += 1;
        const hash = `sha256-${createHash('sha256').update(rawBody).digest('base64')}`;
        if (!allowedScriptHashes.has(hash)) {
          audit.error('CSP005', `Partytown initializer hash is missing from CSP: ${hash}`, name);
        }
        continue;
      }
      audit.error('CSP002', 'Executable inline script found in build output.', name);
    }
    if (partytownInitializerCount !== 1) {
      audit.error(
        'PARTYTOWN003',
        `Expected one Partytown initializer, found ${partytownInitializerCount}.`,
        name
      );
    }
    if (/\sstyle=["']/i.test(html))
      audit.error('CSP003', 'Inline style attribute found in build output.', name);
    if (/<style(?:\s|>)/i.test(html))
      audit.error('CSP004', 'Inline style block found in build output.', name);
    if (/\b(?:javascript|vbscript):/i.test(html))
      audit.error('SEC005', 'Unsafe URL protocol found in build output.', name);
    if (/\/(?:zh-tw\/|zh-cn\/)?leaving\?to=/i.test(html)) {
      audit.error(
        'LINKCHECK006',
        'External destinations must use a URL fragment so they are not written to server logs.',
        name
      );
    }
    if (Buffer.byteLength(html) > 500_000) audit.warn('PERF001', 'HTML exceeds 500 KB.', name);
    const stylesheets = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)];
    if (stylesheets.length !== 1) {
      audit.error(
        'PERF004',
        `Expected one render-blocking stylesheet, found ${stylesheets.length}.`,
        name
      );
    }

    if (siteOrigin) {
      for (const match of html.matchAll(
        /<meta\b[^>]*(?:property=["']og:image["']|name=["']twitter:image["'])[^>]*>/gi
      )) {
        const value = attribute(match[0], 'content');
        if (!value) {
          audit.error('SEO012', 'Social preview image metadata is empty.', name);
          continue;
        }
        let url: URL;
        try {
          url = new URL(value, siteOrigin);
        } catch {
          audit.error('SEO012', `Invalid social preview image URL: ${value}`, name);
          continue;
        }
        if (url.origin === siteOrigin && !outputPathForUrl(dist, url.href, siteOrigin)) {
          audit.error('SEO012', `Missing local social preview image: ${url.pathname}`, name);
        }
      }
    }

    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = match[0];
      if (!attribute(tag, 'data-astro-image')) continue;
      const width = Number(attribute(tag, 'width'));
      const height = Number(attribute(tag, 'height'));
      if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        audit.error(
          'IMAGE009',
          'Optimized article image is missing valid intrinsic dimensions.',
          name
        );
      }
      if (attribute(tag, 'decoding') !== 'async') {
        audit.error('IMAGE010', 'Optimized article image must use asynchronous decoding.', name);
      }
      const loading = attribute(tag, 'loading');
      if (!['eager', 'lazy'].includes(loading)) {
        audit.error(
          'IMAGE011',
          'Optimized article image must declare eager or lazy loading.',
          name
        );
      }
      if (loading === 'eager' && attribute(tag, 'fetchpriority') !== 'high') {
        audit.error('IMAGE012', 'An eager article image must declare high fetch priority.', name);
      }
      if (!attribute(tag, 'srcset') || !attribute(tag, 'sizes')) {
        audit.error(
          'IMAGE013',
          'Optimized article image is missing responsive srcset or sizes.',
          name
        );
      }
      if (!attribute(tag, 'src').startsWith('/_astro/')) {
        audit.error('IMAGE014', 'Article image bypassed Astro image optimization.', name);
      }
    }

    if (siteOrigin) {
      for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
        const tag = match[0];
        const href = attribute(tag, 'href');
        if (!href) continue;
        let target: URL;
        try {
          target = new URL(href, siteOrigin);
        } catch {
          continue;
        }
        if (target.origin === siteOrigin || !['http:', 'https:'].includes(target.protocol))
          continue;
        audit.error(
          'LINKCHECK007',
          `External anchor bypasses the static leaving notice: ${target.href}`,
          name
        );
      }

      for (const tag of html.matchAll(/<(?:a|link|script|img)\b[^>]*>/gi)) {
        const value = attribute(tag[0], /<script|<img/i.test(tag[0]) ? 'src' : 'href');
        if (!value || /^(?:#|mailto:|tel:|data:)/i.test(value)) continue;
        let url: URL;
        try {
          url = new URL(value, siteOrigin);
        } catch {
          audit.error('BUILD003', `Invalid URL in generated HTML: ${value}`, name);
          continue;
        }
        if (url.origin === siteOrigin && !outputPathForUrl(dist, url.href, siteOrigin)) {
          audit.error('BUILD004', `Broken internal URL: ${url.pathname}`, name);
        }
      }
    }
  }

  for (const asset of ['partytown.js', 'partytown-sw.js']) {
    if (!fs.existsSync(path.join(dist, '~partytown', asset))) {
      audit.error(
        'PARTYTOWN004',
        `Missing generated Partytown runtime asset: ${asset}`,
        `dist/~partytown/${asset}`
      );
    }
  }

  const pagefindDirectory = path.join(dist, 'pagefind');
  const pagefindEntryPath = path.join(pagefindDirectory, 'pagefind-entry.json');
  for (const asset of ['pagefind-entry.json', 'pagefind.js', 'pagefind-worker.js']) {
    if (!fs.existsSync(path.join(pagefindDirectory, asset))) {
      audit.error(
        'SEARCH005',
        `Missing generated Pagefind asset: ${asset}`,
        `dist/pagefind/${asset}`
      );
    }
  }
  for (const asset of ['pagefind-component-ui.js', 'pagefind-ui.js', 'pagefind-highlight.js']) {
    if (fs.existsSync(path.join(pagefindDirectory, asset))) {
      audit.error(
        'SEARCH006',
        `Unused Pagefind UI asset was not removed: ${asset}`,
        `dist/pagefind/${asset}`
      );
    }
  }
  if (fs.existsSync(pagefindEntryPath)) {
    const entry = JSON.parse(readText(pagefindEntryPath)) as {
      version?: string;
      languages?: Record<string, { page_count?: number }>;
    };
    if (entry.version !== '1.5.2') {
      audit.error(
        'SEARCH007',
        `Unexpected Pagefind output version: ${entry.version ?? 'missing'}.`
      );
    }
    for (const language of ['en', 'zh-tw', 'zh-cn']) {
      if (!entry.languages?.[language]?.page_count) {
        audit.error('SEARCH008', `Pagefind index has no articles for language: ${language}.`);
      }
    }
  }

  for (const route of ['search/index.html', 'zh-tw/search/index.html', 'zh-cn/search/index.html']) {
    if (!fs.existsSync(path.join(dist, ...route.split('/')))) {
      audit.error(
        'SEARCH009',
        `Missing localized search route: /${route.replace('/index.html', '/')}`
      );
    }
  }

  if (siteOrigin && !sitemap.includes(`<loc>${siteOrigin}/posts/</loc>`))
    audit.error('SEO006', '/posts/ is missing from sitemap.');
  if (/(?:zh-tw\/|zh-cn\/)?page\/1\//.test(sitemap))
    audit.error('SEO007', 'page/1 must not appear in sitemap.');
  if (new Set(locs).size !== locs.length)
    audit.error('SEO008', 'Sitemap contains duplicate loc entries.');
  if (!sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) {
    audit.error('SEO011', 'Sitemap is missing the xhtml namespace required for hreflang links.');
  }
  if (siteOrigin) {
    for (const href of [...sitemap.matchAll(/(?:<loc>|href=")(https:[^<"]+)/g)]
      .map(match => match[1])
      .filter(Boolean) as string[]) {
      if (!outputPathForUrl(dist, href, siteOrigin))
        audit.error('SEO012', `Sitemap URL has no generated page: ${href}`);
    }
    const robotsPath = path.join(dist, 'robots.txt');
    const robots = fs.existsSync(robotsPath) ? readText(robotsPath) : '';
    if (
      !robots.includes('User-agent: Googlebot\nAllow: /') ||
      !robots.includes(`Sitemap: ${siteOrigin}/sitemap-index.xml`)
    ) {
      audit.error(
        'SEO013',
        'robots.txt must allow Googlebot and reference the generated sitemap.',
        'dist/robots.txt'
      );
    }
  }

  for (const file of files) {
    const name = relative(file);
    if (file.endsWith('.map')) audit.error('BUILD002', 'Production source map found.', name);
    const size = fs.statSync(file).size;
    if (file.endsWith('.js') && size > 100_000)
      audit.warn('PERF002', `JavaScript asset is ${Math.ceil(size / 1024)} KB.`, name);
    if (file.endsWith('.css') && size > 200_000)
      audit.warn('PERF003', `CSS asset is ${Math.ceil(size / 1024)} KB.`, name);
  }
}
