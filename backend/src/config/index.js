/**
 * Central application configuration.
 * Loads environment variables once and exposes typed helpers.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true' || value === '1';
}

function asInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  port: asInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.TZ || 'Asia/Kolkata',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',

  mongodbUri: process.env.MONGODB_URI || '',

  gnews: {
    apiKey: process.env.GNEWS_API_KEY || '',
    baseUrl: process.env.GNEWS_BASE_URL || 'https://gnews.io/api/v4',
    enabled: Boolean(process.env.GNEWS_API_KEY),
  },

  newsapi: {
    apiKey: process.env.NEWSAPI_API_KEY || '',
    baseUrl: process.env.NEWSAPI_BASE_URL || 'https://newsapi.org/v2',
    enabled: Boolean(process.env.NEWSAPI_API_KEY),
  },

  googleNewsRss: {
    enabled: asBool(process.env.GOOGLE_NEWS_RSS_ENABLED, true),
  },

  newsdata: {
    apiKey: process.env.NEWSDATA_API_KEY || '',
    baseUrl: process.env.NEWSDATA_BASE_URL || 'https://newsdata.io/api/1',
    enabled: asBool(process.env.NEWSDATA_ENABLED, true) && Boolean(process.env.NEWSDATA_API_KEY),
  },

  gdelt: {
    baseUrl: process.env.GDELT_BASE_URL || 'https://api.gdeltproject.org/api/v2/doc/doc',
    enabled: asBool(process.env.GDELT_ENABLED, true),
  },

  oneindiaTeluguRss: {
    enabled: asBool(process.env.ONEINDIA_TELUGU_RSS_ENABLED, true),
  },

  teluguRss: {
    enabled: asBool(process.env.TELUGU_RSS_ENABLED, true),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    enabled: asBool(process.env.GEMINI_ENABLED, true) && Boolean(process.env.GEMINI_API_KEY),
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled:
      asBool(process.env.TELEGRAM_ENABLED, true) &&
      Boolean(process.env.TELEGRAM_BOT_TOKEN) &&
      Boolean(process.env.TELEGRAM_CHAT_ID),
  },

  scheduler: {
    enabled: asBool(process.env.SCHEDULER_ENABLED, true),
    // Every 30 minutes: :00 and :30
    intervalCron: process.env.INTERVAL_FETCH_CRON || '*/30 * * * *',
    morningCron: process.env.MORNING_BRIEFING_CRON || '0 9 * * *',
    afternoonCron: process.env.AFTERNOON_UPDATE_CRON || '0 13 * * *',
    eveningCron: process.env.EVENING_BRIEFING_CRON || '0 19 * * *',
    maxArticlesPerBriefing: asInt(process.env.MAX_ARTICLES_PER_BRIEFING, 10),
  },

  requestTimeoutMs: asInt(process.env.REQUEST_TIMEOUT_MS, 15000),
};

module.exports = config;
