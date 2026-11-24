/**
 * Central news processing engine.
 * Fetch → normalize → validate → dedupe → score → (optional AI) → save.
 */

const gnews = require('./providers/gnewsService');
const newsapi = require('./providers/newsApiService');
const googleRss = require('./providers/googleNewsRssService');
const newsdata = require('./newsProviders/newsdataService');
const gdelt = require('./newsProviders/gdeltService');
const oneindiaTe = require('./newsProviders/oneindiaTeluguRssService');
const teluguRss = require('./newsProviders/teluguRssService');
const { normalizeMany } = require('./newsNormalizer');
const { dedupeArticles, findExistingNews } = require('./duplicateDetector');
const { enrichArticle } = require('./importanceRanker');
const geminiService = require('./geminiService');
const { enrichMissingImages, fetchOgImage } = require('./imageEnricher');
const News = require('../models/News');
const UserPreferences = require('../models/UserPreferences');
const config = require('../config');
const logger = require('../utils/logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromAllProviders() {
  const providerErrors = [];

  // Prefer GNews for image-rich cards; keep free-plan usage modest
  const gTop = await gnews.fetchTopHeadlines({ country: 'in', max: 10 });
  await sleep(1100);
  const gHyd = await gnews.searchArticles({
    q: 'Hyderabad',
    max: 6,
    country: 'in',
  });
  await sleep(1100);
  const gAp = await gnews.searchArticles({
    q: '"Andhra Pradesh" OR Amaravati OR Vijayawada OR Visakhapatnam',
    max: 8,
    country: 'in',
  });
  await sleep(1100);
  const gTg = await gnews.searchArticles({
    q: 'Telangana',
    max: 6,
    country: 'in',
  });
  await sleep(1100);
  const gEnt = await gnews.searchArticles({
    q: 'Bollywood OR Tollywood OR movies OR cinema OR entertainment',
    max: 8,
    country: 'in',
  });
  await sleep(1100);
  const gBiz = await gnews.searchArticles({
    q: 'India business OR cricket OR technology',
    max: 6,
    country: 'in',
  });

  // Existing providers stay independent; new providers fail without stopping others
  const [nTop, nIndia, nTech, nEnt, nAp, rss, oneindia, teRss] = await Promise.all([
    newsapi.fetchTopHeadlines({ country: 'in', pageSize: 8 }),
    newsapi.searchEverything({
      q: 'India OR Hyderabad OR Telangana OR "Andhra Pradesh"',
      pageSize: 8,
    }),
    newsapi.searchEverything({ q: 'technology OR AI OR cricket', pageSize: 5 }),
    newsapi.searchEverything({
      q: 'Bollywood OR Tollywood OR movies OR cinema OR entertainment',
      pageSize: 8,
    }),
    newsapi.searchEverything({
      q: '"Andhra Pradesh" OR Amaravati OR Vijayawada OR Visakhapatnam',
      pageSize: 8,
    }),
    googleRss.fetchConfiguredFeeds(),
    oneindiaTe.fetchConfiguredFeeds(),
    teluguRss.fetchConfiguredFeeds(),
  ]);

  // Sequential for quota-sensitive APIs
  let newsdataBundle = { articles: [], errors: [], skipped: true, provider: 'newsdata' };
  let gdeltBundle = { articles: [], errors: [], skipped: true, provider: 'gdelt' };
  try {
    newsdataBundle = await newsdata.fetchRegionalBundles();
  } catch (err) {
    providerErrors.push({ provider: 'newsdata', error: err.message });
  }
  try {
    gdeltBundle = await gdelt.fetchRegionalBundles();
  } catch (err) {
    providerErrors.push({ provider: 'gdelt', error: err.message });
  }

  for (const result of [
    gTop,
    gHyd,
    gAp,
    gTg,
    gEnt,
    gBiz,
    nTop,
    nIndia,
    nTech,
    nEnt,
    nAp,
    rss,
    oneindia,
    teRss,
    newsdataBundle,
    gdeltBundle,
  ]) {
    if (result.error) providerErrors.push({ provider: result.provider, error: result.error });
    if (result.errors?.length) {
      result.errors.forEach((e) =>
        providerErrors.push({
          provider: result.provider || 'unknown',
          error: e.error,
          feedId: e.feedId || e.key,
        })
      );
    }
  }

  if (!nTop.error && nTop.articles.length === 0 && !nTop.skipped) {
    providerErrors.push({
      provider: 'newsapi',
      error:
        'top-headlines returned 0 articles (common on NewsAPI developer plan). Using /everything results instead.',
    });
  }

  const newsdataNormalized = (newsdataBundle.articles || []).map((article) =>
    normalizeMany([article], 'newsdata', {
      location: article.locationHint || 'india',
      language: article.languageHint || 'en',
      category: article.categoryHint || undefined,
    })
  ).flat();

  const gdeltNormalized = (gdeltBundle.articles || []).map((article) =>
    normalizeMany([article], 'gdelt', {
      location: article.locationHint || 'international',
      language: article.languageHint || 'en',
    })
  ).flat();

  const normalized = [
    ...normalizeMany(gTop.articles, 'gnews', { location: 'india', language: 'en' }),
    ...normalizeMany(gHyd.articles, 'gnews', { location: 'hyderabad', language: 'en' }),
    ...normalizeMany(gAp.articles, 'gnews', { location: 'andhra-pradesh', language: 'en' }),
    ...normalizeMany(gTg.articles, 'gnews', { location: 'telangana', language: 'en' }),
    ...normalizeMany(gEnt.articles, 'gnews', { category: 'entertainment', location: 'india', language: 'en' }),
    ...normalizeMany(gBiz.articles, 'gnews', { location: 'india', language: 'en' }),
    ...normalizeMany(nTop.articles, 'newsapi', { location: 'india', language: 'en' }),
    ...normalizeMany(nIndia.articles, 'newsapi', { location: 'india', language: 'en' }),
    ...normalizeMany(nTech.articles, 'newsapi', { category: 'technology-ai', language: 'en' }),
    ...normalizeMany(nEnt.articles, 'newsapi', { category: 'entertainment', location: 'india', language: 'en' }),
    ...normalizeMany(nAp.articles, 'newsapi', { location: 'andhra-pradesh', language: 'en' }),
    ...normalizeMany(rss.articles || [], 'google-news-rss'),
    ...normalizeMany(oneindia.articles || [], 'oneindia-telugu-rss', { language: 'te' }),
    ...normalizeMany(teRss.articles || [], 'telugu-rss', { language: 'te' }),
    ...newsdataNormalized,
    ...gdeltNormalized,
  ];

  return { normalized, providerErrors };
}

async function processAndStore({ useAi = true } = {}) {
  const startedAt = Date.now();
  const { normalized, providerErrors } = await fetchFromAllProviders();

  const { unique, duplicateCount } = dedupeArticles(normalized);
  let enriched = unique.map(enrichArticle);

  let fresh = [];
  for (const article of enriched) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await findExistingNews(News, article);
    if (!existing) fresh.push(article);
  }

  // Pull real article images (og:image) when providers omit them — no color placeholders
  fresh = await enrichMissingImages(fresh, { max: 30, concurrency: 4 });

  // Cap AI batch size per run to control cost/time; rest still saved with fallbacks
  const AI_LIMIT = 40;
  const forAi = fresh.slice(0, AI_LIMIT);
  const withoutAi = fresh.slice(AI_LIMIT);

  let processed = withoutAi.map((a) => ({
    ...a,
    oneLiner: a.description?.slice(0, 140) || a.title,
    summary: a.description || a.title,
  }));

  if (useAi && config.gemini.enabled && forAi.length) {
    const prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
    const includeTelugu = prefs?.preferredLanguage !== 'en';
    // Always generate Telugu when language preference is te/both; default both for UI switch
    const wantTelugu = includeTelugu || prefs?.preferredLanguage == null;

    const batches = [];
    for (let i = 0; i < forAi.length; i += 4) {
      batches.push(forAi.slice(i, i + 4));
    }
    const aiProcessed = [];
    for (const batch of batches) {
      // eslint-disable-next-line no-await-in-loop
      const result = await geminiService.processArticleBatch(batch, { includeTelugu: wantTelugu });
      aiProcessed.push(...result);
      // eslint-disable-next-line no-await-in-loop
      await sleep(400);
    }
    processed = [...aiProcessed, ...processed];
  } else if (!useAi || !config.gemini.enabled) {
    processed = fresh.map((a) => ({
      ...a,
      oneLiner: a.description?.slice(0, 140) || a.title,
      summary: a.description || a.title,
    }));
  }

  const saved = [];
  const saveErrors = [];

  for (const article of processed) {
    try {
      const doc = await News.create({
        title: article.title,
        description: article.description,
        oneLiner: article.oneLiner || null,
        teluguOneLiner: article.teluguOneLiner || null,
        summary: article.summary,
        teluguSummary: article.teluguSummary || null,
        source: article.source,
        sourceName: article.sourceName,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        normalizedTitle: article.normalizedTitle,
        imageUrl: article.imageUrl,
        category: article.category,
        location: article.location,
        publishedAt: article.publishedAt,
        fetchedAt: new Date(),
        importanceScore: article.importanceScore || 0,
        isSent: false,
        language: article.language || 'en',
      });
      saved.push(doc);
    } catch (err) {
      if (err.code === 11000) {
        continue;
      }
      saveErrors.push({ title: article.title, error: err.message });
    }
  }

  const report = {
    fetched: normalized.length,
    afterDedupe: unique.length,
    duplicatesSkipped: duplicateCount + (unique.length - fresh.length),
    saved: saved.length,
    providerErrors,
    saveErrors,
    durationMs: Date.now() - startedAt,
  };

  logger.info('News processing complete', report);
  return { report, articles: saved };
}

/**
 * Backfill images for already-saved articles that have no imageUrl.
 */
async function backfillMissingImages({ limit = 40 } = {}) {
  const missing = await News.find({
    $or: [{ imageUrl: null }, { imageUrl: '' }, { imageUrl: { $exists: false } }],
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  let updated = 0;
  for (const article of missing) {
    // eslint-disable-next-line no-await-in-loop
    const imageUrl = await fetchOgImage(article.url, article.title);
    if (!imageUrl) continue;
    // eslint-disable-next-line no-await-in-loop
    await News.updateOne({ _id: article._id }, { $set: { imageUrl } });
    updated += 1;
    // eslint-disable-next-line no-await-in-loop
    await sleep(350);
  }

  logger.info('Image backfill complete', { checked: missing.length, updated });
  return { checked: missing.length, updated };
}

module.exports = {
  fetchFromAllProviders,
  processAndStore,
  backfillMissingImages,
};
