/**
 * GDELT DOC 2.0 provider — independent service.
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 * No API key required. Operators like sourcelang: go inside query.
 */

const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

const client = axios.create({
  baseURL: config.gdelt.baseUrl,
  timeout: config.requestTimeoutMs,
  headers: {
    'User-Agent': 'PersonalNewsAssistant/1.0 (local research; contact: localhost)',
    Accept: 'application/json',
  },
});

/**
 * @param {object} options
 * @param {string} options.query GDELT query string
 * @param {number} [options.maxrecords]
 * @param {string} [options.timespan] e.g. 24h, 3d, 7d
 */
async function searchArticles({ query, maxrecords = 10, timespan = '3d' } = {}) {
  if (!config.gdelt.enabled) {
    logger.warn('GDELT skipped: disabled in config');
    return { provider: 'gdelt', articles: [], error: null, skipped: true };
  }
  if (!query) {
    return { provider: 'gdelt', articles: [], error: 'Missing query', skipped: false };
  }

  try {
    const { data } = await client.get('', {
      params: {
        query,
        mode: 'ArtList',
        format: 'json',
        maxrecords: Math.min(maxrecords, 50),
        timespan,
        sort: 'DateDesc',
      },
    });

    const articles = Array.isArray(data?.articles) ? data.articles : [];
    return {
      provider: 'gdelt',
      articles,
      error: null,
      skipped: false,
      total: articles.length,
    };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    logger.error('GDELT DOC request failed', { message, status: err.response?.status });
    return { provider: 'gdelt', articles: [], error: message, skipped: false };
  }
}

async function fetchRegionalBundles() {
  if (!config.gdelt.enabled) {
    return { provider: 'gdelt', results: [], articles: [], skipped: true, errors: [] };
  }

  // GDELT is strongest for English; Telugu coverage via sourcelang is limited,
  // so we keep India/World English + regional English keyword searches.
  const queries = [
    {
      key: 'india-en',
      query: '(India OR Bharat) sourcecountry:IN sourcelang:eng',
      location: 'india',
      language: 'en',
    },
    {
      key: 'telangana-en',
      query: '(Telangana OR Hyderabad) sourcecountry:IN sourcelang:eng',
      location: 'telangana',
      language: 'en',
    },
    {
      key: 'andhra-en',
      query: '("Andhra Pradesh" OR Amaravati OR Vijayawada) sourcecountry:IN sourcelang:eng',
      location: 'andhra-pradesh',
      language: 'en',
    },
    {
      key: 'hyderabad-en',
      query: '(Hyderabad OR Secunderabad OR Cyberabad) sourcecountry:IN sourcelang:eng',
      location: 'hyderabad',
      language: 'en',
    },
    {
      key: 'world-en',
      query: '(world OR international OR geopolitics) sourcelang:eng',
      location: 'international',
      language: 'en',
    },
  ];

  const results = [];
  const errors = [];
  const articles = [];

  for (const item of queries) {
    // eslint-disable-next-line no-await-in-loop
    const result = await searchArticles({ query: item.query, maxrecords: 8, timespan: '2d' });
    results.push({ ...result, key: item.key, locationHint: item.location, languageHint: item.language });
    if (result.error) errors.push({ key: item.key, error: result.error });
    for (const article of result.articles || []) {
      articles.push({
        ...article,
        locationHint: item.location,
        languageHint: item.language,
      });
    }
    // Be polite — GDELT rate-limits aggressive clients (429)
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 1500));
  }

  return {
    provider: 'gdelt',
    results,
    articles,
    skipped: false,
    errors,
  };
}

module.exports = {
  searchArticles,
  fetchRegionalBundles,
};
