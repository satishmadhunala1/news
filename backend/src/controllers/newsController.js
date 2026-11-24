const { validationResult } = require('express-validator');
const News = require('../models/News');
const { processAndStore, backfillMissingImages } = require('../services/newsProcessor');

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * English: exclude native Telugu-only items.
 * Telugu: native Telugu feeds OR articles that already have Telugu summaries.
 * Controllers fall back to unfiltered results when Telugu set is empty (until next fetch).
 */
function languageFilter(language) {
  if (language === 'te') {
    return {
      $or: [
        { language: 'te' },
        { teluguSummary: { $nin: [null, ''] } },
        { teluguOneLiner: { $nin: [null, ''] } },
      ],
    };
  }
  if (language === 'en') {
    return { language: { $ne: 'te' } };
  }
  return {};
}

async function findWithLanguageFallback(baseFilter, language, { sort, skip = 0, limit = 20 } = {}) {
  const preferred = mergeFilters(baseFilter, languageFilter(language));
  // Prefer stories that already have real images (Edge-style cards)
  const withImagesFirst = {
    hasImage: { $cond: [{ $and: [{ $ne: ['$imageUrl', null] }, { $ne: ['$imageUrl', ''] }] }, 1, 0] },
  };

  let items = await News.aggregate([
    { $match: preferred },
    { $addFields: withImagesFirst },
    { $sort: { hasImage: -1, ...(sort || { publishedAt: -1 }) } },
    { $skip: skip },
    { $limit: limit },
    { $project: { hasImage: 0 } },
  ]);
  let total = await News.countDocuments(preferred);

  // Until Telugu summaries/feeds fill up, keep the UI usable
  if (language === 'te' && total === 0) {
    items = await News.aggregate([
      { $match: baseFilter || {} },
      { $addFields: withImagesFirst },
      { $sort: { hasImage: -1, ...(sort || { publishedAt: -1 }) } },
      { $skip: skip },
      { $limit: limit },
      { $project: { hasImage: 0 } },
    ]);
    total = await News.countDocuments(baseFilter || {});
  }

  return { items, total };
}

function mergeFilters(...parts) {
  const cleaned = parts.filter((p) => p && Object.keys(p).length > 0);
  if (!cleaned.length) return {};
  if (cleaned.length === 1) return cleaned[0];
  return { $and: cleaned };
}

async function listNews(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const base = {};
    if (req.query.category) base.category = req.query.category;
    if (req.query.location) base.location = req.query.location;
    if (req.query.source) base.source = req.query.source;
    if (req.query.minImportance) base.importanceScore = { $gte: Number(req.query.minImportance) };

    const { items, total } = await findWithLanguageFallback(base, req.query.language, {
      sort: { publishedAt: -1 },
      skip,
      limit,
    });

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      data: items,
    });
  } catch (err) {
    next(err);
  }
}

async function latestNews(req, res, next) {
  try {
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 20);
    const { items } = await findWithLanguageFallback({}, req.query.language, {
      sort: { publishedAt: -1 },
      limit,
    });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function importantNews(req, res, next) {
  try {
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 20);
    const min = Number.parseInt(req.query.minImportance, 10) || 60;
    const { items } = await findWithLanguageFallback(
      { importanceScore: { $gte: min } },
      req.query.language,
      { sort: { importanceScore: -1, publishedAt: -1 }, limit }
    );
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function byCategory(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await findWithLanguageFallback(
      { category: req.params.category },
      req.query.language,
      { sort: { publishedAt: -1 }, skip, limit }
    );
    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit) || 1, data: items });
  } catch (err) {
    next(err);
  }
}

async function byLocation(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await findWithLanguageFallback(
      { location: req.params.location },
      req.query.language,
      { sort: { publishedAt: -1 }, skip, limit }
    );
    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit) || 1, data: items });
  } catch (err) {
    next(err);
  }
}

async function searchNews(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }
    const { page, limit, skip } = parsePagination(req.query);
    const textFilter = {
      $or: [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { summary: new RegExp(q, 'i') },
        { teluguSummary: new RegExp(q, 'i') },
        { sourceName: new RegExp(q, 'i') },
      ],
    };
    const filter = mergeFilters(textFilter, languageFilter(req.query.language));
    const [items, total] = await Promise.all([
      News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
      News.countDocuments(filter),
    ]);
    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit) || 1, data: items });
  } catch (err) {
    next(err);
  }
}

async function fetchNews(req, res, next) {
  try {
    const useAi = req.body?.useAi !== false;
    const result = await processAndStore({ useAi });
    res.json({ success: true, ...result.report, sample: result.articles.slice(0, 5) });
  } catch (err) {
    next(err);
  }
}

async function enrichImages(req, res, next) {
  try {
    const limit = Math.min(80, Number.parseInt(req.body?.limit, 10) || 40);
    const result = await backfillMissingImages({ limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function toggleBookmark(req, res, next) {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, error: 'News not found' });
    news.bookmarked = !news.bookmarked;
    await news.save();
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
}

async function savedNews(req, res, next) {
  try {
    const { items } = await findWithLanguageFallback(
      { bookmarked: true },
      req.query.language,
      { sort: { updatedAt: -1 }, limit: 100 }
    );
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function dashboardStats(req, res, next) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const language = req.query.language;

    const [{ items: important }, { items: latest, total }, todayPack, lastArticle] = await Promise.all([
      findWithLanguageFallback(
        { importanceScore: { $gte: 60 } },
        language,
        { sort: { importanceScore: -1 }, limit: 8 }
      ),
      findWithLanguageFallback({}, language, { sort: { publishedAt: -1 }, limit: 12 }),
      findWithLanguageFallback({ fetchedAt: { $gte: startOfDay } }, language, {
        sort: { fetchedAt: -1 },
        limit: 1,
      }),
      News.findOne().sort({ fetchedAt: -1 }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        todayCount: todayPack.total,
        total,
        important,
        latest,
        lastUpdated: lastArticle?.fetchedAt || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNews,
  latestNews,
  importantNews,
  byCategory,
  byLocation,
  searchNews,
  fetchNews,
  enrichImages,
  toggleBookmark,
  savedNews,
  dashboardStats,
};
