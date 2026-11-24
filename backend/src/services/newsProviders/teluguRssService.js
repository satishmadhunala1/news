/**
 * Additional Telugu RSS provider — official public feeds only.
 * Currently includes BBC Telugu (https://feeds.bbci.co.uk/telugu/rss.xml).
 * Metadata + headline/link only. No full-article scrape.
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

const TELUGU_FEEDS = [
  {
    id: 'bbc-telugu',
    label: 'BBC Telugu',
    url: 'https://feeds.bbci.co.uk/telugu/rss.xml',
    sourceName: 'BBC Telugu',
    location: 'india',
    language: 'te',
    maxItems: 12,
  },
];

function detectLocationFromText(text) {
  const blob = String(text || '').toLowerCase();
  if (/hyderabad|హైదరాబాద్|secunderabad|cyberabad/.test(blob)) return 'hyderabad';
  if (/telangana|తెలంగాణ|warangal|khammam|karimnagar/.test(blob)) return 'telangana';
  if (/andhra|ఆంధ్ర|amaravati|vijayawada|visakhapatnam|vizag/.test(blob)) return 'andhra-pradesh';
  if (/world|international|అంతర్జాతీయ|us |uk |china|russia|europe/.test(blob)) return 'international';
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
        creator: item.creator || item.author || feed.sourceName,
        sourceName: feed.sourceName || feed.label,
        language: 'te',
        locationHint: detectLocationFromText(`${title} ${snippet}`) || feed.location,
        categoryHint: feed.category || null,
        feedId: feed.id,
        feedLabel: feed.label,
        imageUrl: item.enclosure?.url || null,
      };
    });

    return { provider: 'telugu-rss', feedId: feed.id, articles, error: null };
  } catch (err) {
    logger.error('Telugu RSS feed failed', { feedId: feed.id, message: err.message });
    return { provider: 'telugu-rss', feedId: feed.id, articles: [], error: err.message };
  }
}

async function fetchConfiguredFeeds(feeds = TELUGU_FEEDS) {
  if (!config.teluguRss.enabled) {
    logger.warn('Additional Telugu RSS skipped: disabled');
    return { provider: 'telugu-rss', results: [], articles: [], skipped: true, errors: [] };
  }

  const results = [];
  for (const feed of feeds) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await fetchFeed(feed));
  }

  return {
    provider: 'telugu-rss',
    results,
    articles: results.flatMap((r) => r.articles),
    skipped: false,
    errors: results.filter((r) => r.error).map((r) => ({ feedId: r.feedId, error: r.error })),
  };
}

module.exports = {
  TELUGU_FEEDS,
  fetchFeed,
  fetchConfiguredFeeds,
};
