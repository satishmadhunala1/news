/**
 * Oneindia Telugu RSS provider — independent service.
 * Official feeds from https://telugu.oneindia.com/rss/
 * Uses rss-parser. Metadata + headline/link only (no full-article scrape).
 */

const Parser = require('rss-parser');
const config = require('../../config');
const logger = require('../../utils/logger');

const parser = new Parser({
  timeout: config.requestTimeoutMs,
  headers: {
    'User-Agent': 'PersonalNewsAssistant/1.0 (+local; RSS subscriber)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

const ONEINDIA_TE_FEEDS = [
  {
    id: 'oneindia-te-news',
    label: 'Oneindia Telugu',
    url: 'https://telugu.oneindia.com/rss/telugu-news-fb.xml',
    location: 'india',
    language: 'te',
    maxItems: 12,
  },
  {
    id: 'oneindia-te-sports',
    label: 'Oneindia Telugu Sports',
    url: 'https://telugu.oneindia.com/rss/telugu-sports-fb.xml',
    location: 'india',
    language: 'te',
    category: 'sports',
    maxItems: 8,
  },
  {
    id: 'oneindia-te-entertainment',
    label: 'Oneindia Telugu Entertainment',
    url: 'https://telugu.oneindia.com/rss/telugu-entertainment-fb.xml',
    location: 'india',
    language: 'te',
    category: 'entertainment',
    maxItems: 8,
  },
];

function detectLocationFromText(text) {
  const blob = String(text || '').toLowerCase();
  if (/hyderabad|హైదరాబాద్|secunderabad|cyberabad/.test(blob)) return 'hyderabad';
  if (/telangana|తెలంగాణ|warangal|khammam|karimnagar/.test(blob)) return 'telangana';
  if (/andhra|ఆంధ్ర|amaravati|vijayawada|visakhapatnam|vizag/.test(blob)) return 'andhra-pradesh';
  return 'india';
}

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const maxItems = feed.maxItems || 10;
    const articles = (parsed.items || []).slice(0, maxItems).map((item) => {
      const title = item.title || '';
      const snippet = item.contentSnippet || item.summary || '';
      return {
        title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        contentSnippet: snippet,
        creator: item.creator || item.author || 'Oneindia Telugu',
        sourceName: 'Oneindia Telugu',
        language: 'te',
        locationHint: detectLocationFromText(`${title} ${snippet}`) || feed.location,
        categoryHint: feed.category || null,
        feedId: feed.id,
        feedLabel: feed.label,
        imageUrl: item.enclosure?.url || null,
      };
    });

    return { provider: 'oneindia-telugu-rss', feedId: feed.id, articles, error: null };
  } catch (err) {
    logger.error('Oneindia Telugu RSS failed', { feedId: feed.id, message: err.message });
    return { provider: 'oneindia-telugu-rss', feedId: feed.id, articles: [], error: err.message };
  }
}

async function fetchConfiguredFeeds(feeds = ONEINDIA_TE_FEEDS) {
  if (!config.oneindiaTeluguRss.enabled) {
    logger.warn('Oneindia Telugu RSS skipped: disabled');
    return { provider: 'oneindia-telugu-rss', results: [], articles: [], skipped: true, errors: [] };
  }

  const results = [];
  for (const feed of feeds) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await fetchFeed(feed));
  }

  return {
    provider: 'oneindia-telugu-rss',
    results,
    articles: results.flatMap((r) => r.articles),
    skipped: false,
    errors: results.filter((r) => r.error).map((r) => ({ feedId: r.feedId, error: r.error })),
  };
}

module.exports = {
  ONEINDIA_TE_FEEDS,
  fetchFeed,
  fetchConfiguredFeeds,
};
