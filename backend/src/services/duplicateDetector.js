/**
 * Duplicate detection using canonical URLs and normalized headlines.
 */

const { normalizeHeadline, canonicalizeUrl } = require('../utils/url');

function buildKey(article) {
  const urlKey = article.canonicalUrl || canonicalizeUrl(article.url);
  const titleKey = article.normalizedTitle || normalizeHeadline(article.title);
  return { urlKey, titleKey };
}

/**
 * Deduplicate a list of normalized articles in memory.
 * Prefers the first occurrence (callers should sort by preferred source if needed).
 */
function dedupeArticles(articles) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const unique = [];
  let duplicateCount = 0;

  for (const article of articles) {
    const { urlKey, titleKey } = buildKey(article);

    if (urlKey && seenUrls.has(urlKey)) {
      duplicateCount += 1;
      continue;
    }
    // Same headline within a short window is treated as duplicate
    if (titleKey && titleKey.length > 20 && seenTitles.has(titleKey)) {
      duplicateCount += 1;
      continue;
    }

    if (urlKey) seenUrls.add(urlKey);
    if (titleKey && titleKey.length > 20) seenTitles.add(titleKey);
    unique.push(article);
  }

  return { unique, duplicateCount };
}

/**
 * Check if an article already exists in MongoDB by url or normalized title.
 */
async function findExistingNews(NewsModel, article) {
  const canonicalUrl = article.canonicalUrl || canonicalizeUrl(article.url);
  const normalizedTitle = article.normalizedTitle || normalizeHeadline(article.title);

  const or = [];
  if (canonicalUrl) or.push({ canonicalUrl });
  if (article.url) or.push({ url: article.url });
  if (normalizedTitle && normalizedTitle.length > 20) {
    or.push({ normalizedTitle });
  }
  if (!or.length) return null;

  return NewsModel.findOne({ $or: or }).lean();
}

module.exports = {
  dedupeArticles,
  findExistingNews,
  buildKey,
};
