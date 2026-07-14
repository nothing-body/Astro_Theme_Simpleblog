import type { AstroIntegration } from 'astro';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AlternateLink = { hreflang: string; href: string };

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function tagAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g)) {
    const name = match[1];
    if (name) attributes[name.toLowerCase()] = decodeHtmlAttribute(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

function outputHtmlPath(distDir: string, pageUrl: string): string | null {
  try {
    const segments = decodeURIComponent(new URL(pageUrl).pathname).split('/').filter(Boolean);
    if (segments.some(segment => segment === '.' || segment === '..')) return null;
    const outputPath = path.resolve(distDir, ...segments, 'index.html');
    const relativePath = path.relative(distDir, outputPath);
    return relativePath.startsWith('..') || path.isAbsolute(relativePath) ? null : outputPath;
  } catch {
    return null;
  }
}

async function pageAlternateLinks(distDir: string, pageUrl: string): Promise<AlternateLink[]> {
  const htmlPath = outputHtmlPath(distDir, pageUrl);
  if (!htmlPath || !existsSync(htmlPath)) return [];
  const html = await readFile(htmlPath, 'utf8');
  const links: AlternateLink[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    if (attributes.rel !== 'alternate' || !attributes.hreflang || !attributes.href) continue;
    const targetPath = outputHtmlPath(distDir, attributes.href);
    if (targetPath && existsSync(targetPath)) {
      links.push({ hreflang: attributes.hreflang, href: attributes.href });
    }
  }
  return links;
}

export function localizedSitemapAlternates(): AstroIntegration {
  return {
    name: 'localized-sitemap-alternates',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const sitemapFiles = (await readdir(distDir))
          .filter(name => /^sitemap-\d+\.xml$/.test(name))
          .map(name => path.join(distDir, name));

        for (const sitemapFile of sitemapFiles) {
          const xml = await readFile(sitemapFile, 'utf8');
          const blocks = await Promise.all(
            [...xml.matchAll(/<url>.*?<\/url>/gs)].map(async match => {
              const block = match[0];
              const location = block.match(/<loc>(.*?)<\/loc>/s)?.[1];
              if (!location) return block;
              const links = await pageAlternateLinks(distDir, decodeHtmlAttribute(location));
              const cleanBlock = block.replace(/<xhtml:link\b[^>]*\/>/g, '');
              const alternateXml = links.map(link =>
                `<xhtml:link rel="alternate" hreflang="${escapeXmlAttribute(link.hreflang)}" href="${escapeXmlAttribute(link.href)}"/>`
              ).join('');
              return alternateXml
                ? cleanBlock.replace(`<loc>${location}</loc>`, `<loc>${location}</loc>${alternateXml}`)
                : cleanBlock;
            })
          );
          let index = 0;
          const updated = xml.replace(/<url>.*?<\/url>/gs, original => blocks[index++] ?? original);
          if (updated !== xml) await writeFile(sitemapFile, updated);
        }
      },
    },
  };
}
