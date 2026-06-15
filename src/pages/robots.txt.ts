import type { APIRoute } from 'astro';
import { getSiteUrl } from '../lib/site';

// Search crawlers: must stay crawlable for Google / Bing indexing.
const searchCrawlers = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Slurp',
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
] as const;

// AI / data crawlers: opt out of training and bulk scraping.
// Google-Extended does NOT control Google Search indexing (Googlebot does).
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

function renderUserAgentRules(agents: readonly string[], directive: 'Allow' | 'Disallow'): string {
  return agents.map(agent => `User-agent: ${agent}\n${directive}: /`).join('\n\n');
}

export const GET: APIRoute = ({ site }) => {
  const siteUrl = getSiteUrl(site);
  const body = [
    '# Search indexing: allow Googlebot and other search/social preview crawlers.',
    renderUserAgentRules(searchCrawlers, 'Allow'),
    '',
    'User-agent: *\nAllow: /',
    '',
    '# AI / data crawlers: disallow training and bulk scraping.',
    '# Google-Extended only opts out of Gemini training; it does not block Google Search.',
    renderUserAgentRules(blockedAiCrawlers, 'Disallow'),
    '',
    `Sitemap: ${siteUrl}/sitemap-index.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
