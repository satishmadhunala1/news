/**
 * GNews provider — independent service.
 * Docs: https://gnews.io/docs/v4
 */

const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

const client = axios.create({
  baseURL: config.gnews.baseUrl,
  timeout: config.requestTimeoutMs,
});

/**
 * Fetch top headlines for a country (ISO 2-letter).
 */
async function fetchTopHeadlines({ country = 'in', category = 'general', max = 10, lang = 'en' } = {}) {
  if (!config.gnews.enabled) {
    logger.warn('GNews skipped: API key not configured');
    return { provider: 'gnews', articles: [], error: null, skipped: true };
  }

  try {
    const { data } = await client.get('/top-headlines', {
      params: {
        token: config.gnews.apiKey,
        country,
        category,
        max,
        lang,
      },
    });

    return {
      provider: 'gnews',
      articles: Array.isArray(data.articles) ? data.articles : [],
      error: null,
      skipped: false,
      total: data.totalArticles,
    };
  } catch (err) {
    const message = err.response?.data?.errors?.[0] || err.response?.data?.message || err.message;
    logger.error('GNews top-headlines failed', { message, status: err.response?.status });
    return { provider: 'gnews', articles: [], error: message, skipped: false };
  }
}

/**
 * Search articles by query (location/topic).
 */
async function searchArticles({ q, max = 10, lang = 'en', country } = {}) {
  if (!config.gnews.enabled) {
    return { provider: 'gnews', articles: [], error: null, skipped: true };
  }
  if (!q) {
    return { provider: 'gnews', articles: [], error: 'Missing search query', skipped: false };
  }

  try {
    const params = {
      token: config.gnews.apiKey,
      q,
      max,
      lang,
    };
    if (country) params.country = country;

    const { data } = await client.get('/search', { params });

    return {
      provider: 'gnews',
      articles: Array.isArray(data.articles) ? data.articles : [],
      error: null,
      skipped: false,
      total: data.totalArticles,
    };
  } catch (err) {
    const message = err.response?.data?.errors?.[0] || err.response?.data?.message || err.message;
    logger.error('GNews search failed', { message, status: err.response?.status });
    return { provider: 'gnews', articles: [], error: message, skipped: false };
  }
}

module.exports = {
  fetchTopHeadlines,
  searchArticles,
};
