/**
 * NewsAPI.org provider — independent service.
 * Docs: https://newsapi.org/docs
 * Developer plan: requests from localhost/server only; articles may be delayed.
 */

const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

const client = axios.create({
  baseURL: config.newsapi.baseUrl,
  timeout: config.requestTimeoutMs,
  headers: {
    'X-Api-Key': config.newsapi.apiKey,
  },
});

async function fetchTopHeadlines({ country = 'in', category, pageSize = 10, q } = {}) {
  if (!config.newsapi.enabled) {
    logger.warn('NewsAPI skipped: API key not configured');
    return { provider: 'newsapi', articles: [], error: null, skipped: true };
  }

  try {
    const params = { country, pageSize };
    if (category) params.category = category;
    if (q) params.q = q;

    const { data } = await client.get('/top-headlines', { params });

    return {
      provider: 'newsapi',
      articles: Array.isArray(data.articles) ? data.articles : [],
      error: null,
      skipped: false,
      total: data.totalResults,
    };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    logger.error('NewsAPI top-headlines failed', { message, status: err.response?.status });
    return { provider: 'newsapi', articles: [], error: message, skipped: false };
  }
}

async function searchEverything({ q, pageSize = 10, language = 'en', sortBy = 'publishedAt' } = {}) {
  if (!config.newsapi.enabled) {
    return { provider: 'newsapi', articles: [], error: null, skipped: true };
  }
  if (!q) {
    return { provider: 'newsapi', articles: [], error: 'Missing search query', skipped: false };
  }

  try {
    const { data } = await client.get('/everything', {
      params: { q, pageSize, language, sortBy },
    });

    return {
      provider: 'newsapi',
      articles: Array.isArray(data.articles) ? data.articles : [],
      error: null,
      skipped: false,
      total: data.totalResults,
    };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    logger.error('NewsAPI everything failed', { message, status: err.response?.status });
    return { provider: 'newsapi', articles: [], error: message, skipped: false };
  }
}

module.exports = {
  fetchTopHeadlines,
  searchEverything,
};
