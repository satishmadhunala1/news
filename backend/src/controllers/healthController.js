const config = require('../config');
const { getConnectionState } = require('../config/db');

async function getHealth(req, res) {
  res.json({
    success: true,
    status: 'ok',
    service: 'personal-news-assistant-backend',
    timestamp: new Date().toISOString(),
    mongo: getConnectionState(),
    providers: {
      gnews: config.gnews.enabled,
      newsapi: config.newsapi.enabled,
      googleNewsRss: config.googleNewsRss.enabled,
      newsdata: config.newsdata.enabled,
      gdelt: config.gdelt.enabled,
      oneindiaTeluguRss: config.oneindiaTeluguRss.enabled,
      teluguRss: config.teluguRss.enabled,
      gemini: config.gemini.enabled,
      telegram: config.telegram.enabled,
      scheduler: config.scheduler.enabled,
    },
  });
}

module.exports = { getHealth };
