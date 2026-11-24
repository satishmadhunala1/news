/**
 * Topic search: look in Mongo first, then live-fetch providers if thin/empty.
 * Optional location filter; also guesses place from the query (e.g. Yogi → UP).
 */

const gnews = require('./providers/gnewsService');
const newsapi = require('./providers/newsApiService');
const googleRss = require('./providers/googleNewsRssService');
const { normalizeMany } = require('./newsNormalizer');
const { dedupeArticles, findExistingNews } = require('./duplicateDetector');
const { enrichArticle, detectLocation } = require('./importanceRanker');
const News = require('../models/News');
const logger = require('../utils/logger');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Guess a location id from free-text when the user did not pick a filter. */
function inferLocationFromQuery(q) {
  const blob = String(q || '').toLowerCase();
  const rules = [
    {
      id: 'greater-noida',
      needles: ['greater noida', 'noida', 'gautam buddh', 'gautam buddha', 'yeida'],
    },
    {
      id: 'uttar-pradesh',
      needles: [
        'uttar pradesh',
        ' u.p',
        ' up ',
        'yogi',
        'lucknow',
        'varanasi',
        'prayagraj',
        'kanpur',
        'gorakhpur',
        'sharada',
        'sharda',
        'ayodhya',
        'meerut',
      ],
    },
    { id: 'delhi', needles: ['delhi', 'new delhi', 'ndmc'] },
    { id: 'hyderabad', needles: ['hyderabad', 'secunderabad', 'cyberabad'] },
    { id: 'telangana', needles: ['telangana', 'warangal'] },
    {
      id: 'andhra-pradesh',
      needles: ['andhra', 'amaravati', 'vijayawada', 'visakhapatnam', 'vizag'],
    },
  ];

  const padded = ` ${blob} `;
  for (const rule of rules) {
    if (rule.needles.some((n) => padded.includes(n) || blob.includes(n.trim()))) {
      return rule.id;
    }
  }
  return null;
}

function buildTextFilter(q) {
  const tokens = String(q)
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8)
    .map(escapeRegex);

  // Prefer full-phrase match; also match when key words appear (friend tip → find story)
  const phrase = escapeRegex(q.trim());
  const or = [
    { title: new RegExp(phrase, 'i') },
    { description: new RegExp(phrase, 'i') },
    { summary: new RegExp(phrase, 'i') },
    { teluguSummary: new RegExp(phrase, 'i') },
    { sourceName: new RegExp(phrase, 'i') },
  ];

  if (tokens.length >= 2) {
    const loose = tokens.map((t) => ({
      $or: [
        { title: new RegExp(t, 'i') },
        { description: new RegExp(t, 'i') },
        { summary: new RegExp(t, 'i') },
      ],
    }));
    or.push({ $and: loose });
  }

  return { $or: or };
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function liveFetchTopic(q, locationHint, { forceLocation = false } = {}) {
  const query = q.trim();
  const settled = await Promise.allSettled([
    withTimeout(googleRss.searchByQuery(query), 12000, 'rss'),
    withTimeout(newsapi.searchEverything({ q: query, pageSize: 10, sortBy: 'relevancy' }), 12000, 'newsapi'),
    withTimeout(gnews.searchArticles({ q: query, max: 8, country: 'in' }), 12000, 'gnews'),
  ]);

  const rss =
    settled[0].status === 'fulfilled'
      ? settled[0].value
      : { articles: [], error: settled[0].reason?.message || 'rss failed' };
  const napi =
    settled[1].status === 'fulfilled'
      ? settled[1].value
      : { articles: [], error: settled[1].reason?.message || 'newsapi failed' };
  const g =
    settled[2].status === 'fulfilled'
      ? settled[2].value
      : { articles: [], error: settled[2].reason?.message || 'gnews failed' };

  const hint = locationHint || inferLocationFromQuery(query) || null;
  const normalized = [
    ...normalizeMany(rss.articles || [], 'google-news-rss', {
      location: hint || undefined,
      language: 'en',
    }),
    ...normalizeMany(napi.articles || [], 'newsapi', {
      location: hint || 'india',
      language: 'en',
    }),
    ...normalizeMany(g.articles || [], 'gnews', {
      location: hint || 'india',
      language: 'en',
    }),
  ].map((article) => {
    const enriched = enrichArticle(article);
    // Explicit search filter wins; otherwise keep inferred place over generic india/world
    if (hint && (forceLocation || !enriched.location || ['international', 'india', 'world'].includes(enriched.location))) {
      return { ...enriched, location: hint };
    }
    return enriched;
  });

  const { unique } = dedupeArticles(normalized);
  const saved = [];
  const errors = [];

  for (const article of unique.slice(0, 20)) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const existing = await findExistingNews(News, article);
      if (existing) continue;
      // eslint-disable-next-line no-await-in-loop
      const doc = await News.create({
        title: article.title,
        description: article.description,
        oneLiner: article.description?.slice(0, 140) || article.title,
        summary: article.description || article.title,
        source: article.source,
        sourceName: article.sourceName,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        normalizedTitle: article.normalizedTitle,
        imageUrl: article.imageUrl,
        category: article.category,
        location: article.location || detectLocation(article),
        publishedAt: article.publishedAt || new Date(),
        fetchedAt: new Date(),
        importanceScore: article.importanceScore || 0,
        isSent: false,
        language: article.language || 'en',
      });
      saved.push(doc.toObject());
    } catch (err) {
      if (err.code === 11000) continue;
      errors.push(err.message);
    }
  }

  logger.info('Topic live search complete', {
    query,
    locationHint: hint,
    fetched: unique.length,
    saved: saved.length,
    providerErrors: [rss.error, napi.error, g.error].filter(Boolean),
    saveErrors: errors.length,
  });

  return { saved, hint, fetched: unique.length };
}

/**
 * Search library; if empty/thin on page 1, live-fetch then search again.
 */
async function searchTopic({
  q,
  location,
  language,
  page = 1,
  limit = 15,
  live = true,
} = {}) {
  const query = String(q || '').trim();
  if (!query) {
    return { items: [], total: 0, page, limit, totalPages: 1, liveFetched: 0, inferredLocation: null };
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const textFilter = buildTextFilter(query);
  const locationFilter = location ? { location } : {};
  const langPart =
    language === 'te'
      ? {
          $or: [
            { language: 'te' },
            { teluguSummary: { $nin: [null, ''] } },
            { teluguOneLiner: { $nin: [null, ''] } },
          ],
        }
      : language === 'en'
        ? { language: { $ne: 'te' } }
        : {};

  const baseFilter = {
    $and: [textFilter, locationFilter, langPart].filter((p) => Object.keys(p).length > 0),
  };

  let total = await News.countDocuments(baseFilter);
  let liveFetched = 0;
  let inferredLocation = location || inferLocationFromQuery(query);
  let liveSaved = [];

  const shouldLive = live !== false && page === 1 && total < 3;
  if (shouldLive) {
    try {
      const liveResult = await withTimeout(
        liveFetchTopic(query, location || inferredLocation, {
          forceLocation: Boolean(location),
        }),
        35000,
        'liveFetchTopic'
      );
      liveFetched = liveResult.saved.length;
      liveSaved = liveResult.saved || [];
      if (liveResult.hint) inferredLocation = liveResult.hint;
      total = await News.countDocuments(baseFilter);
    } catch (err) {
      logger.warn('Live topic fetch skipped', { query, message: err.message });
    }
  }

  let items = await News.find(baseFilter).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean();

  // After a live fetch, if the strict location filter still matches nothing,
  // show what we just pulled for this topic so the user is not left blank.
  if (page === 1 && items.length === 0 && liveSaved.length) {
    items = liveSaved.slice(0, limit);
    total = Math.max(total, liveSaved.length);
  }

  // Telugu empty → show English matches rather than a blank page
  if (language === 'te' && items.length === 0) {
    const enFilter = {
      $and: [textFilter, locationFilter].filter((p) => Object.keys(p).length > 0),
    };
    total = await News.countDocuments(enFilter);
    items = await News.find(enFilter).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean();
  }

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    liveFetched,
    inferredLocation,
  };
}

module.exports = {
  searchTopic,
  inferLocationFromQuery,
  liveFetchTopic,
};
