/**
 * node-cron scheduler — independent of web request lifecycle.
 * Use RUN_SCHEDULER=true on only one process in production.
 *
 * Jobs:
 * - Every 30 minutes: fetch + store new articles; Telegram only for breaking news
 * - 09:00 / 13:00 / 19:00 Asia/Kolkata: full briefings
 */

const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const { processAndStore } = require('./newsProcessor');
const telegramService = require('./telegramService');
const News = require('../models/News');
const UserPreferences = require('../models/UserPreferences');

let jobs = [];
let running = false;

function timeToCron(hhmm, fallback) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return fallback;
  const [h, m] = hhmm.split(':').map(Number);
  return `${m} ${h} * * *`;
}

function isBreakingArticle(article) {
  if (!article) return false;
  if (article.category === 'breaking-news') return true;
  const blob = `${article.title || ''} ${article.description || ''} ${article.summary || ''}`;
  return /\bbreaking\b|\bjust in\b|\bdeveloping story\b/i.test(blob);
}

/**
 * Incremental fetch every 30 minutes.
 * Always stores new articles; Telegram only for new breaking items.
 */
async function runIntervalFetch() {
  if (running) {
    logger.warn('Skipping 30-min fetch: previous job still running');
    return;
  }
  running = true;
  const label = '30-min news fetch';
  try {
    logger.info(`Scheduler: starting ${label}`);
    const { report, articles } = await processAndStore({ useAi: true });

    const prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
    const notificationsOn =
      prefs?.notificationEnabled !== false &&
      prefs?.telegramPaused !== true &&
      prefs?.breakingNewsAlerts !== false;

    let breakingSent = 0;

    if (notificationsOn && config.telegram.enabled) {
      // Prefer breaking items from this fetch batch
      const fromBatch = (articles || [])
        .map((a) => (a.toObject ? a.toObject() : a))
        .filter(isBreakingArticle);

      // Also catch any recent unsent breaking saved by classification
      const fromDb = await News.find({
        isSent: false,
        category: 'breaking-news',
        fetchedAt: { $gte: new Date(Date.now() - 35 * 60 * 1000) },
      })
        .sort({ publishedAt: -1 })
        .limit(5)
        .lean();

      const byId = new Map();
      [...fromBatch, ...fromDb].forEach((a) => {
        const id = String(a._id);
        if (!byId.has(id)) byId.set(id, a);
      });

      const breaking = Array.from(byId.values()).slice(0, 5);

      if (breaking.length) {
        await telegramService.sendMessage(
          config.telegram.chatId,
          `BREAKING UPDATE\n\n${breaking.length} new breaking ${breaking.length === 1 ? 'story' : 'stories'} found.`
        );

        for (const article of breaking) {
          // eslint-disable-next-line no-await-in-loop
          const result = await telegramService.sendNewsArticle(article);
          if (result?.ok) breakingSent += 1;
        }
      }
    }

    logger.info(`Scheduler: ${label} complete`, {
      saved: report?.saved,
      breakingSent,
      durationMs: report?.durationMs,
    });
    return { report, breakingSent };
  } catch (err) {
    logger.error(`Scheduler ${label} failed`, { message: err.message });
    return { error: err.message };
  } finally {
    running = false;
  }
}

async function runBriefing(label) {
  if (running) {
    logger.warn(`Skipping ${label}: previous job still running`);
    return;
  }
  running = true;
  try {
    logger.info(`Scheduler: starting ${label}`);
    const { report, articles } = await processAndStore({ useAi: true });

    const prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
    if (prefs?.telegramPaused || prefs?.notificationEnabled === false) {
      logger.info(`Scheduler: ${label} fetch done, notifications paused`);
      return { report, sent: 0 };
    }

    const max = prefs?.maxArticlesPerBriefing || config.scheduler.maxArticlesPerBriefing;
    const minScore =
      prefs?.notificationFrequency === 'high' ? 45 : prefs?.notificationFrequency === 'low' ? 70 : 55;

    const unsent = await News.find({
      isSent: false,
      importanceScore: { $gte: minScore },
      publishedAt: { $gte: new Date(Date.now() - 36 * 3600 * 1000) },
    })
      .sort({ importanceScore: -1, publishedAt: -1 })
      .limit(max)
      .lean();

    const toSend = unsent.length ? unsent : articles.slice(0, max).map((a) => a.toObject?.() || a);
    await telegramService.sendBriefing(toSend, label);

    if (prefs?.breakingNewsAlerts !== false) {
      const breaking = await News.find({
        category: 'breaking-news',
        isSent: false,
        publishedAt: { $gte: new Date(Date.now() - 12 * 3600 * 1000) },
      })
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean();
      for (const article of breaking) {
        // eslint-disable-next-line no-await-in-loop
        await telegramService.sendNewsArticle(article);
      }
    }

    return { report, sent: toSend.length };
  } catch (err) {
    logger.error(`Scheduler ${label} failed`, { message: err.message });
    return { error: err.message };
  } finally {
    running = false;
  }
}

async function startScheduler() {
  if (!config.scheduler.enabled) {
    logger.info('Scheduler disabled by config');
    return;
  }

  stopScheduler();

  const prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
  const morning = timeToCron(prefs?.morningBriefingTime, config.scheduler.morningCron);
  const afternoon = timeToCron(prefs?.afternoonBriefingTime, config.scheduler.afternoonCron);
  const evening = timeToCron(prefs?.eveningBriefingTime, config.scheduler.eveningCron);
  const intervalCron = config.scheduler.intervalCron || '*/30 * * * *';
  const timezone = config.timezone;

  const definitions = [
    {
      name: '30-min news fetch',
      expr: intervalCron,
      handler: runIntervalFetch,
    },
    { name: 'Morning Briefing', expr: morning, handler: () => runBriefing('Morning Briefing') },
    { name: 'Afternoon Updates', expr: afternoon, handler: () => runBriefing('Afternoon Updates') },
    { name: 'Evening Briefing', expr: evening, handler: () => runBriefing('Evening Briefing') },
  ];

  for (const def of definitions) {
    if (!cron.validate(def.expr)) {
      logger.warn('Invalid cron expression', { name: def.name, expr: def.expr });
      continue;
    }
    const job = cron.schedule(def.expr, () => def.handler(), { timezone });
    jobs.push(job);
    logger.info('Scheduled job', { name: def.name, expr: def.expr, timezone });
  }
}

function stopScheduler() {
  jobs.forEach((j) => j.stop());
  jobs = [];
}

module.exports = {
  startScheduler,
  stopScheduler,
  runBriefing,
  runIntervalFetch,
};
