/**
 * Normalize provider-specific article shapes into one common structure.
 */

const { canonicalizeUrl, isValidHttpUrl, normalizeHeadline } = require('../utils/url');
const { parseArticleDate } = require('../utils/dates');

/**
 * Common article shape used across the app.
 * @typedef {Object} NormalizedArticle
 */

const PROVIDER_IDS = new Set([
  'gnews',
  'newsapi',
  'google-news-rss',
  'newsdata',
  'gdelt',
  'oneindia-telugu-rss',
  'telugu-rss',
  'unknown',
]);

function publisherFromTitle(title) {
  if (!title) return null;
  const parts = String(title).split(/\s+-\s+/);
  if (parts.length < 2) return null;
  const publisher = parts[parts.length - 1].trim();
  if (publisher.length < 2 || publisher.length > 80) return null;
  return publisher;
}

function pickSourceName(raw, provider) {
  // Prefer real publisher/channel names — never return internal provider ids
  if (raw.source?.name && !PROVIDER_IDS.has(String(raw.source.name).toLowerCase())) {
    return raw.source.name;
  }
  if (
    typeof raw.source === 'string' &&
    raw.source &&
    !PROVIDER_IDS.has(raw.source.toLowerCase())
  ) {
    return raw.source;
  }
  if (raw.creator && !PROVIDER_IDS.has(String(raw.creator).toLowerCase())) {
    // Google News often sets creator to feed title; prefer title suffix when present
    const fromTitle = publisherFromTitle(raw.title);
    if (fromTitle) return fromTitle;
    return raw.creator;
  }
  const fromTitle = publisherFromTitle(raw.title);
  if (fromTitle) return fromTitle;
  if (raw.feedLabel) return raw.feedLabel;
  if (provider === 'gnews') return 'Unknown publisher';
  if (provider === 'newsapi') return 'Unknown publisher';
  if (provider === 'google-news-rss') return 'Google News';
  if (provider === 'newsdata') return 'NewsData';
  if (provider === 'gdelt') return 'GDELT';
  if (provider === 'oneindia-telugu-rss') return 'Oneindia Telugu';
  if (provider === 'telugu-rss') return 'Telugu RSS';
  return 'Unknown publisher';
}

function normalizeFromGNews(raw, context = {}) {
  const url = raw.url || raw.link;
  return {
    title: (raw.title || '').trim(),
    description: (raw.description || '').trim(),
    oneLiner: null,
    teluguOneLiner: null,
    summary: null,
    teluguSummary: null,
    source: 'gnews',
    sourceName: pickSourceName(raw, 'gnews'),
    url,
    canonicalUrl: canonicalizeUrl(url),
    normalizedTitle: normalizeHeadline(raw.title),
    imageUrl: raw.image || null,
    category: context.category || null,
    location: context.location || null,
    publishedAt: parseArticleDate(raw.publishedAt),
    language: context.language || 'en',
    importanceScore: 0,
    rawProviderFields: {
      content: undefined, // do not store full copyrighted body
    },
  };
}

function normalizeFromNewsAPI(raw, context = {}) {
  const url = raw.url;
  return {
    title: (raw.title || '').trim(),
    description: (raw.description || raw.content || '').trim().slice(0, 500),
    oneLiner: null,
    teluguOneLiner: null,
    summary: null,
    teluguSummary: null,
    source: 'newsapi',
    sourceName: pickSourceName(raw, 'newsapi'),
    url,
    canonicalUrl: canonicalizeUrl(url),
    normalizedTitle: normalizeHeadline(raw.title),
    imageUrl: raw.urlToImage || null,
    category: context.category || null,
    location: context.location || null,
    publishedAt: parseArticleDate(raw.publishedAt),
    language: context.language || 'en',
    importanceScore: 0,
    rawProviderFields: {},
  };
}

function detectTeluguScript(text) {
  return /[\u0C00-\u0C7F]/.test(text || '');
}

function normalizeFromGoogleRss(raw, context = {}) {
  const url = raw.link || raw.url;
  const title = (raw.title || '').trim();
  const description = (raw.contentSnippet || '').trim().slice(0, 500);
  const language =
    context.language ||
    raw.language ||
    (detectTeluguScript(`${title} ${description}`) ? 'te' : 'en');

  return {
    title,
    description,
    oneLiner: null,
    teluguOneLiner: null,
    summary: null,
    teluguSummary: null,
    source: 'google-news-rss',
    sourceName: pickSourceName(raw, 'google-news-rss'),
    url,
    canonicalUrl: canonicalizeUrl(url),
    normalizedTitle: normalizeHeadline(raw.title),
    imageUrl: raw.imageUrl || null,
    category: context.category || raw.categoryHint || null,
    // Never use feedId as location (avoids fake locations like "sports")
    location: context.location || raw.locationHint || null,
    publishedAt: parseArticleDate(raw.pubDate),
    language,
    importanceScore: 0,
    rawProviderFields: {},
  };
}

function normalizeFromNewsData(raw, context = {}) {
  const url = raw.link || raw.url;
  const title = (raw.title || '').trim();
  const description = (raw.description || raw.content || '').trim().slice(0, 500);
  const language =
    context.language ||
    raw.languageHint ||
    (Array.isArray(raw.language) ? raw.language[0] : raw.language) ||
    (detectTeluguScript(`${title} ${description}`) ? 'te' : 'en');

  const sourceName =
    raw.source_id ||
    raw.source_name ||
    (Array.isArray(raw.creator) ? raw.creator[0] : raw.creator) ||
    pickSourceName(raw, 'newsdata');

  return {
    title,
    description,
    oneLiner: null,
    teluguOneLiner: null,
    summary: null,
    teluguSummary: null,
    source: 'newsdata',
    sourceName: String(sourceName),
    url,
    canonicalUrl: canonicalizeUrl(url),
    normalizedTitle: normalizeHeadline(title),
    imageUrl: raw.image_url || null,
    category: context.category || raw.categoryHint || null,
    location: context.location || raw.locationHint || null,
    publishedAt: parseArticleDate(raw.pubDate || raw.pub_date),
    language: language === 'telugu' ? 'te' : language,
    importanceScore: 0,
    rawProviderFields: {},
  };
}

function parseGdeltSeenDate(seendate) {
  if (!seendate) return null;
  const s = String(seendate).trim();
  // Formats: 20241120T123045Z or 20241120123045
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (m) {
    return parseArticleDate(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  }
  return parseArticleDate(s);
}

function normalizeFromGdelt(raw, context = {}) {
  const url = raw.url || raw.link;
  const title = (raw.title || '').trim();
  const language =
    context.language ||
    raw.languageHint ||
    (raw.language === 'Telugu' || raw.language === 'te' ? 'te' : 'en');

  // domain is often the publisher identity in GDELT ArtList
  const sourceName = raw.domain || raw.sourceCommonName || pickSourceName(raw, 'gdelt');

  return {
    title,
    description: `Coverage from ${sourceName}`.slice(0, 500),
    oneLiner: null,
    teluguOneLiner: null,
    summary: null,
    teluguSummary: null,
    source: 'gdelt',
    sourceName: String(sourceName),
    url,
    canonicalUrl: canonicalizeUrl(url),
    normalizedTitle: normalizeHeadline(title),
    imageUrl: raw.socialimage || null,
    category: context.category || null,
    location: context.location || raw.locationHint || null,
    publishedAt: parseGdeltSeenDate(raw.seendate) || parseArticleDate(raw.publishedAt),
    language,
    importanceScore: 0,
    rawProviderFields: {},
  };
}

function normalizeFromGenericRss(raw, provider, context = {}) {
  const url = raw.link || raw.url;
  const title = (raw.title || '').trim();
  const description = (raw.contentSnippet || raw.description || '').trim().slice(0, 500);
  const language =
    context.language ||
    raw.language ||
    raw.languageHint ||
    (detectTeluguScript(`${title} ${description}`) ? 'te' : 'en');

  return {
    title,
    description,
    oneLiner: null,
    teluguOneLiner: null,
    summary: null,
    teluguSummary: null,
    source: provider,
    sourceName: raw.sourceName || pickSourceName(raw, provider),
    url,
    canonicalUrl: canonicalizeUrl(url),
    normalizedTitle: normalizeHeadline(title),
    imageUrl: raw.imageUrl || null,
    category: context.category || raw.categoryHint || null,
    location: context.location || raw.locationHint || null,
    publishedAt: parseArticleDate(raw.pubDate || raw.publishedAt),
    language,
    importanceScore: 0,
    rawProviderFields: {},
  };
}

function normalizeArticle(raw, provider, context = {}) {
  let article;
  if (provider === 'gnews') article = normalizeFromGNews(raw, context);
  else if (provider === 'newsapi') article = normalizeFromNewsAPI(raw, context);
  else if (provider === 'google-news-rss') article = normalizeFromGoogleRss(raw, context);
  else if (provider === 'newsdata') article = normalizeFromNewsData(raw, context);
  else if (provider === 'gdelt') article = normalizeFromGdelt(raw, context);
  else if (provider === 'oneindia-telugu-rss' || provider === 'telugu-rss') {
    article = normalizeFromGenericRss(raw, provider, context);
  } else {
    article = {
      title: (raw.title || '').trim(),
      description: (raw.description || '').trim(),
      summary: null,
      teluguSummary: null,
      source: provider || 'unknown',
      sourceName: pickSourceName(raw, provider),
      url: raw.url || raw.link,
      canonicalUrl: canonicalizeUrl(raw.url || raw.link),
      normalizedTitle: normalizeHeadline(raw.title),
      imageUrl: raw.imageUrl || raw.image || null,
      category: context.category || null,
      location: context.location || null,
      publishedAt: parseArticleDate(raw.publishedAt || raw.pubDate),
      language: context.language || 'en',
      importanceScore: 0,
      rawProviderFields: {},
    };
  }

  return article;
}

function isValidNormalizedArticle(article) {
  if (!article?.title || article.title.length < 8) return false;
  if (!isValidHttpUrl(article.url)) return false;
  if (!article.canonicalUrl) return false;
  if (!article.publishedAt) return false;
  // Reject placeholder removed articles from NewsAPI
  if (/^\[removed\]$/i.test(article.title)) return false;
  return true;
}

function normalizeMany(rawArticles, provider, context = {}) {
  return (rawArticles || [])
    .map((raw) => normalizeArticle(raw, provider, context))
    .filter(isValidNormalizedArticle);
}

module.exports = {
  normalizeArticle,
  normalizeMany,
  isValidNormalizedArticle,
};
