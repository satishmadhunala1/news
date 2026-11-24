/**
 * Google News RSS provider — independent service.
 * No API key required. Uses rss-parser.
 * Includes English + Telugu regional feeds.
 */

const Parser = require('rss-parser');
const config = require('../../config');
const logger = require('../../utils/logger');

const parser = new Parser({
  timeout: config.requestTimeoutMs,
  headers: {
    'User-Agent': 'PersonalNewsAssistant/1.0',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
    ],
  },
});

function extractRssImage(item) {
  if (item.enclosure?.url && /^image\//i.test(item.enclosure.type || 'image/')) {
    return item.enclosure.url;
  }
  if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  const media = item.mediaContent?.[0] || item['media:content'];
  if (media?.$?.url) return media.$.url;
  if (typeof media?.url === 'string') return media.url;
  const thumb = item.mediaThumbnail?.[0] || item['media:thumbnail'];
  if (thumb?.$?.url) return thumb.$.url;
  // Sometimes image is embedded in content HTML
  const html = item['content:encoded'] || item.content || '';
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

/**
 * Build a Google News RSS search URL.
 * Example: https://news.google.com/rss/search?q=Hyderabad&hl=en-IN&gl=IN&ceid=IN:en
 * Telugu: hl=te&gl=IN&ceid=IN:te
 */
function buildSearchFeedUrl({ query, hl = 'en-IN', gl = 'IN', ceid = 'IN:en' }) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

function buildTopicFeedUrl({ topic, hl = 'en-IN', gl = 'IN', ceid = 'IN:en' }) {
  return buildSearchFeedUrl({ query: topic, hl, gl, ceid });
}

const TE = { hl: 'te', gl: 'IN', ceid: 'IN:te' };

const DEFAULT_FEEDS = [
  // English regional / national / world
  { id: 'hyderabad', label: 'Hyderabad', language: 'en', location: 'hyderabad', url: buildSearchFeedUrl({ query: 'Hyderabad' }), maxItems: 10 },
  { id: 'telangana', label: 'Telangana', language: 'en', location: 'telangana', url: buildSearchFeedUrl({ query: 'Telangana' }), maxItems: 10 },
  { id: 'andhra-pradesh', label: 'Andhra Pradesh', language: 'en', location: 'andhra-pradesh', url: buildSearchFeedUrl({ query: 'Andhra Pradesh' }), maxItems: 10 },
  { id: 'india', label: 'India', language: 'en', location: 'india', url: buildSearchFeedUrl({ query: 'India news' }), maxItems: 10 },
  { id: 'technology', label: 'Technology AI', language: 'en', category: 'technology-ai', url: buildSearchFeedUrl({ query: 'Technology OR AI' }), maxItems: 8 },
  { id: 'business', label: 'Business', language: 'en', category: 'business-economy', url: buildSearchFeedUrl({ query: 'Business Economy India' }), maxItems: 8 },
  { id: 'sports', label: 'Sports', language: 'en', location: 'india', category: 'sports', url: buildSearchFeedUrl({ query: 'Sports Cricket' }), maxItems: 8 },
  {
    id: 'entertainment',
    label: 'Entertainment Movies',
    language: 'en',
    location: 'india',
    category: 'entertainment',
    url: buildSearchFeedUrl({ query: 'Bollywood OR Tollywood OR movies OR cinema OR entertainment India' }),
    maxItems: 10,
  },
  { id: 'world', label: 'World', language: 'en', location: 'international', url: buildSearchFeedUrl({ query: 'World news', gl: 'US', hl: 'en-US', ceid: 'US:en' }), maxItems: 8 },

  // Telugu channels / Telugu-language Google News
  { id: 'te-hyderabad', label: 'Hyderabad Telugu', language: 'te', location: 'hyderabad', url: buildSearchFeedUrl({ query: 'హైదరాబాద్ OR Hyderabad', ...TE }), maxItems: 10 },
  { id: 'te-telangana', label: 'Telangana Telugu', language: 'te', location: 'telangana', url: buildSearchFeedUrl({ query: 'తెలంగాణ OR Telangana', ...TE }), maxItems: 10 },
  { id: 'te-andhra', label: 'Andhra Telugu', language: 'te', location: 'andhra-pradesh', url: buildSearchFeedUrl({ query: 'ఆంధ్రప్రదేశ్ OR Andhra Pradesh', ...TE }), maxItems: 10 },
  {
    id: 'te-entertainment',
    label: 'Entertainment Telugu',
    language: 'te',
    location: 'india',
    category: 'entertainment',
    url: buildSearchFeedUrl({ query: 'సినిమా OR టాలీవుడ్ OR movies OR Tollywood', ...TE }),
    maxItems: 10,
  },
  { id: 'te-india', label: 'India Telugu', language: 'te', location: 'india', url: buildSearchFeedUrl({ query: 'భారత్ OR India', ...TE }), maxItems: 10 },
  { id: 'te-world', label: 'World Telugu', language: 'te', location: 'international', url: buildSearchFeedUrl({ query: 'అంతర్జాతీయ OR world', ...TE }), maxItems: 8 },
];

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const maxItems = feed.maxItems || 12;
    const items = (parsed.items || []).slice(0, maxItems).map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate || item.isoDate,
      contentSnippet: item.contentSnippet || item.summary || '',
      creator: item.creator || item.author || parsed.title || 'Google News',
      source: 'google-news-rss',
      feedId: feed.id,
      feedLabel: feed.label,
      language: feed.language || 'en',
      locationHint: feed.location || null,
      categoryHint: feed.category || null,
      imageUrl: extractRssImage(item),
    }));

    return { provider: 'google-news-rss', feedId: feed.id, articles: items, error: null };
  } catch (err) {
    logger.error('Google News RSS feed failed', { feedId: feed.id, message: err.message });
    return { provider: 'google-news-rss', feedId: feed.id, articles: [], error: err.message };
  }
}

async function fetchConfiguredFeeds(feeds = DEFAULT_FEEDS) {
  if (!config.googleNewsRss.enabled) {
    logger.warn('Google News RSS skipped: disabled in config');
    return { provider: 'google-news-rss', results: [], skipped: true };
  }

  const results = [];
  for (const feed of feeds) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await fetchFeed(feed));
  }

  const articles = results.flatMap((r) => r.articles);
  return {
    provider: 'google-news-rss',
    results,
    articles,
    skipped: false,
    errors: results.filter((r) => r.error).map((r) => ({ feedId: r.feedId, error: r.error })),
  };
}

async function searchByQuery(query, options = {}) {
  if (!config.googleNewsRss.enabled) {
    return { provider: 'google-news-rss', articles: [], error: null, skipped: true };
  }
  const feed = {
    id: 'custom',
    label: query,
    language: options.ceid?.includes(':te') ? 'te' : 'en',
    url: buildSearchFeedUrl({ query, ...options }),
  };
  return fetchFeed(feed);
}

module.exports = {
  buildSearchFeedUrl,
  buildTopicFeedUrl,
  DEFAULT_FEEDS,
  fetchFeed,
  fetchConfiguredFeeds,
  searchByQuery,
};
