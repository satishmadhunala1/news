/**
 * Rolling retention: keep only the last N days of news, delete the rest.
 */

const News = require('../models/News');
const config = require('../config');
const logger = require('../utils/logger');

function retentionCutoff(days = config.scheduler.newsRetentionDays) {
  const keepDays = Math.max(1, Number(days) || 7);
  return {
    keepDays,
    cutoff: new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000),
  };
}

/**
 * Delete articles older than the retention window (default 7 days).
 * Uses publishedAt so the feed stays a rolling last-week window.
 */
async function cleanupOldNews({ days } = {}) {
  const { keepDays, cutoff } = retentionCutoff(days);

  const result = await News.deleteMany({
    publishedAt: { $lt: cutoff },
  });

  const deleted = result.deletedCount || 0;
  logger.info('News retention cleanup complete', {
    keepDays,
    cutoff: cutoff.toISOString(),
    deleted,
  });

  return { keepDays, cutoff, deleted };
}

module.exports = {
  cleanupOldNews,
  retentionCutoff,
};
