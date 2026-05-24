import type { APIRoute } from 'astro';
import { getSiteUrl } from '../lib/site';

const blockedAiCrawlers = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'CCBot',
  'anthropic-ai',
  'Claude-Web',
  'ClaudeBot',
  'Bytespider',
  'PetalBot',
  'Omgili',
  'omgilibot',
  'DataForSeoBot',
  'cohere-ai',
  'PerplexityBot',
  'YouBot',
  'Applebot-Extended',
  'Diffbot',
  'magpie-crawler',
  'Seekr',
  'ImagesiftBot',
  'img2dataset',
  'Timpibot',
  'VelenPublicWebCrawler',
  'Scrapy',
] as const;

const allowedCrawlers = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Slurp',
  'facebookexternalhit',
  'Twitterbot',
] as const;

function renderUserAgentRules(agents: readonly string[], directive: 'Allow' | 'Disallow'): string {
  return agents.map(agent => `User-agent: ${agent}\n${directive}: /`).join('\n\n');
}

export const GET: APIRoute = ({ site }) => {
  const siteUrl = getSiteUrl(site);
  const body = [
    renderUserAgentRules(blockedAiCrawlers, 'Disallow'),
    renderUserAgentRules(allowedCrawlers, 'Allow'),
    'User-agent: *\nAllow: /',
    `Sitemap: ${siteUrl}/sitemap-index.xml`,
    '',
  ].join('\n\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
