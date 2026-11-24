/**
 * NewsData.io provider — independent service.
 * Docs: https://newsdata.io/documentation
 * Endpoint used: /api/1/latest
 */

const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

const client = axios.create({
  baseURL: config.newsdata.baseUrl,
  timeout: config.requestTimeoutMs,
});

/**
 * Fetch latest articles.
 * @param {object} options
 * @param {string} [options.q]
 * @param {string} [options.country] ISO country code, e.g. in
 * @param {string} [options.language] en | te
 * @param {string} [options.category]
 * @param {number} [options.size] free plan often max 10
 */
async function fetchLatest({
  q,
  country = 'in',
  language = 'en',
  category,
  size = 8,
} = {}) {
  if (!config.newsdata.enabled) {
    logger.warn('NewsData skipped: disabled or API key missing');
    return { provider: 'newsdata', articles: [], error: null, skipped: true };
  }

  try {
    const params = {
      apikey: config.newsdata.apiKey,
      size: Math.min(size, 10),
    };
    if (q) params.q = q;
    if (country) params.country = country;
    if (language) params.language = language;
    if (category) params.category = category;

    const { data } = await client.get('/latest', { params });

    if (data.status === 'error') {
      const message = data.results?.message || data.message || 'NewsData API error';
      logger.error('NewsData latest failed', { message });
      return { provider: 'newsdata', articles: [], error: message, skipped: false };
    }

    const articles = Array.isArray(data.results) ? data.results : [];
    return {
      provider: 'newsdata',
      articles,
      error: null,
      skipped: false,
      total: data.totalResults,
      language,
    };
  } catch (err) {
    const message = err.response?.data?.results?.message || err.response?.data?.message || err.message;
    logger.error('NewsData request failed', { message, status: err.response?.status });
    return { provider: 'newsdata', articles: [], error: message, skipped: false };
  }
}

/**
 * Regional convenience fetches for this project.
 */
async function fetchRegionalBundles() {
  if (!config.newsdata.enabled) {
    return { provider: 'newsdata', results: [], articles: [], skipped: true, errors: [] };
  }

  const queries = [
    { key: 'india-en', q: 'India', language: 'en', country: 'in', location: 'india' },
    { key: 'india-te', q: 'India OR Bharat OR భారత్', language: 'te', country: 'in', location: 'india' },
    { key: 'telangana-te', q: 'Telangana OR తెలంగాణ', language: 'te', country: 'in', location: 'telangana' },
    { key: 'andhra-en', q: '"Andhra Pradesh" OR Amaravati OR Vijayawada OR Visakhapatnam', language: 'en', country: 'in', location: 'andhra-pradesh' },
    { key: 'andhra-te', q: '"Andhra Pradesh" OR ఆంధ్రప్రదేశ్', language: 'te', country: 'in', location: 'andhra-pradesh' },
    { key: 'hyderabad-te', q: 'Hyderabad OR హైదరాబాద్', language: 'te', country: 'in', location: 'hyderabad' },
    { key: 'entertainment-en', q: 'Bollywood OR Tollywood OR movies OR cinema', language: 'en', country: 'in', location: 'india', category: 'entertainment' },
    { key: 'entertainment-te', q: 'సినిమా OR టాలీవుడ్ OR movie', language: 'te', country: 'in', location: 'india', category: 'entertainment' },
    { key: 'world-en', q: 'world OR international', language: 'en', country: null, location: 'international' },
  ];

  const results = [];
  const errors = [];
  const articles = [];

  for (const item of queries) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fetchLatest({
      q: item.q,
      language: item.language,
      country: item.country || undefined,
      size: 6,
    });
    results.push({ ...result, key: item.key, locationHint: item.location, languageHint: item.language });
    if (result.error) errors.push({ key: item.key, error: result.error });
    for (const article of result.articles || []) {
      articles.push({
        ...article,
        locationHint: item.location,
        languageHint: item.language,
        categoryHint: item.category || null,
      });
    }
    // Free-plan friendly pacing
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 700));
  }

  return {
    provider: 'newsdata',
    results,
    articles,
    skipped: false,
    errors,
  };
}

module.exports = {
  fetchLatest,
  fetchRegionalBundles,
};
