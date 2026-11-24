/**
 * Telegram Bot API integration using official HTTP API.
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const News = require('../models/News');
const NotificationHistory = require('../models/NotificationHistory');
const UserPreferences = require('../models/UserPreferences');

const TELEGRAM_API = () => `https://api.telegram.org/bot${config.telegram.botToken}`;

const client = axios.create({ timeout: config.requestTimeoutMs });

let botPaused = false;
let offset = 0;
let polling = false;

function formatNewsMessage(article) {
  const isBreaking = article.category === 'breaking-news';
  const lines = [
    isBreaking ? '*BREAKING NEWS*' : null,
    `*${escapeMarkdown(article.title)}*`,
    '',
    escapeMarkdown(article.summary || article.description || 'No summary available.'),
    '',
    `📍 ${escapeMarkdown(article.location || 'n/a')}  |  🏷 ${escapeMarkdown(article.category || 'n/a')}`,
    `📰 ${escapeMarkdown(article.sourceName || article.source)}`,
    `🕒 ${article.publishedAt ? new Date(article.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'n/a'}`,
    '',
    `[Read original](${article.url})`,
  ].filter(Boolean);
  return lines.join('\n');
}

function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function sendMessage(chatId, text, extra = {}) {
  if (!config.telegram.enabled) {
    return { ok: false, error: 'Telegram disabled' };
  }

  try {
    const { data } = await client.post(`${TELEGRAM_API()}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
      ...extra,
    });
    return { ok: true, data };
  } catch (err) {
    // Fallback without markdown if parse fails
    try {
      const plain = text.replace(/\\/g, '').replace(/\*/g, '');
      const { data } = await client.post(`${TELEGRAM_API()}/sendMessage`, {
        chat_id: chatId,
        text: plain,
        disable_web_page_preview: false,
        ...extra,
      });
      return { ok: true, data, fallback: true };
    } catch (err2) {
      const message = err2.response?.data?.description || err2.message;
      logger.error('Telegram sendMessage failed', { message });
      return { ok: false, error: message };
    }
  }
}

async function alreadySent(newsId, chatId) {
  return NotificationHistory.findOne({
    newsId,
    telegramChatId: String(chatId),
    status: 'sent',
  }).lean();
}

async function sendNewsArticle(article, chatId = config.telegram.chatId) {
  if (!config.telegram.enabled) return { ok: false, error: 'Telegram disabled' };
  if (botPaused) return { ok: false, error: 'Bot paused', skipped: true };

  const prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
  if (prefs?.telegramPaused || prefs?.notificationEnabled === false) {
    return { ok: false, error: 'Notifications paused in preferences', skipped: true };
  }

  const existing = await alreadySent(article._id, chatId);
  if (existing) return { ok: false, skipped: true, error: 'Already sent' };

  const result = await sendMessage(chatId, formatNewsMessage(article));

  await NotificationHistory.create({
    newsId: article._id,
    telegramChatId: String(chatId),
    status: result.ok ? 'sent' : 'failed',
    messagePreview: article.title?.slice(0, 120),
    error: result.ok ? null : result.error,
  }).catch(async (err) => {
    // Unique index race: treat as already sent
    if (err.code === 11000) return null;
    throw err;
  });

  if (result.ok) {
    await News.findByIdAndUpdate(article._id, { isSent: true });
  }

  return result;
}

async function sendBriefing(articles, title = 'News Briefing') {
  const chatId = config.telegram.chatId;
  if (!articles?.length) {
    return sendMessage(chatId, escapeMarkdown(`${title}\n\nNo new relevant articles right now.`));
  }

  await sendMessage(
    chatId,
    `*${escapeMarkdown(title)}*\n\n${escapeMarkdown(`Sending ${articles.length} stories.`)}`
  );

  const results = [];
  for (const article of articles) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await sendNewsArticle(article, chatId));
  }
  return results;
}

const HELP_TEXT = `Personal AI News Assistant

Commands:
/start – Welcome
/help – This help
/india – India news
/hyderabad – Hyderabad news
/delhi – Delhi news
/noida – Greater Noida news
/telangana – Telangana news
/world – World news
/technology – Tech & AI
/business – Business
/sports – Sports
/latest – Latest headlines
/briefing – Important briefing
/settings – Your notification settings
/pause – Pause notifications
/resume – Resume notifications`;

async function handleCommand(message) {
  const chatId = message.chat?.id;
  const text = (message.text || '').trim();
  const cmd = text.split(/\s+/)[0].toLowerCase();

  const sendList = async (filter, label) => {
    const articles = await News.find(filter)
      .sort({ importanceScore: -1, publishedAt: -1 })
      .limit(5)
      .lean();
    if (!articles.length) {
      return sendMessage(chatId, escapeMarkdown(`No ${label} articles found yet.`));
    }
    await sendMessage(chatId, escapeMarkdown(`Top ${label} stories:`));
    for (const a of articles) {
      // eslint-disable-next-line no-await-in-loop
      await sendMessage(chatId, formatNewsMessage(a));
    }
  };

  switch (cmd) {
    case '/start':
      return sendMessage(
        chatId,
        escapeMarkdown('Welcome to your Personal AI News Assistant. Type /help for commands.')
      );
    case '/help':
      return sendMessage(chatId, escapeMarkdown(HELP_TEXT));
    case '/india':
      return sendList({ location: 'india' }, 'India');
    case '/hyderabad':
      return sendList({ location: 'hyderabad' }, 'Hyderabad');
    case '/delhi':
      return sendList({ location: 'delhi' }, 'Delhi');
    case '/noida':
      return sendList({ location: 'greater-noida' }, 'Greater Noida');
    case '/telangana':
      return sendList({ location: 'telangana' }, 'Telangana');
    case '/world':
      return sendList({ location: { $in: ['international', 'europe', 'united-states', 'united-kingdom', 'china', 'russia'] } }, 'World');
    case '/technology':
      return sendList({ category: 'technology-ai' }, 'Technology');
    case '/business':
      return sendList({ category: 'business-economy' }, 'Business');
    case '/sports':
      return sendList({ category: { $in: ['sports', 'cricket'] } }, 'Sports');
    case '/latest':
      return sendList({}, 'latest');
    case '/briefing': {
      const articles = await News.find({ importanceScore: { $gte: 55 } })
        .sort({ importanceScore: -1, publishedAt: -1 })
        .limit(8)
        .lean();
      return sendBriefing(articles, 'Important Briefing');
    }
    case '/settings': {
      const prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
      const summary = prefs
        ? `Notifications: ${prefs.notificationEnabled && !prefs.telegramPaused ? 'ON' : 'PAUSED'}\nLanguage: ${prefs.preferredLanguage}\nMorning: ${prefs.morningBriefingTime}\nAfternoon: ${prefs.afternoonBriefingTime}\nEvening: ${prefs.eveningBriefingTime}\nMax/briefing: ${prefs.maxArticlesPerBriefing}`
        : 'Default settings (not saved yet).';
      return sendMessage(chatId, escapeMarkdown(summary));
    }
    case '/pause':
      botPaused = true;
      await UserPreferences.findOneAndUpdate(
        { userKey: 'default' },
        { telegramPaused: true },
        { upsert: true }
      );
      return sendMessage(chatId, escapeMarkdown('Notifications paused.'));
    case '/resume':
      botPaused = false;
      await UserPreferences.findOneAndUpdate(
        { userKey: 'default' },
        { telegramPaused: false, notificationEnabled: true },
        { upsert: true }
      );
      return sendMessage(chatId, escapeMarkdown('Notifications resumed.'));
    default:
      return sendMessage(chatId, escapeMarkdown('Unknown command. Try /help'));
  }
}

async function pollUpdatesOnce() {
  if (!config.telegram.enabled) return;
  try {
    const { data } = await client.get(`${TELEGRAM_API()}/getUpdates`, {
      params: { offset, timeout: 0 },
    });
    const updates = data.result || [];
    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message?.text?.startsWith('/')) {
        // eslint-disable-next-line no-await-in-loop
        await handleCommand(update.message);
      }
    }
  } catch (err) {
    logger.error('Telegram poll failed', { message: err.message });
  }
}

function startPolling(intervalMs = 4000) {
  if (!config.telegram.enabled || polling) return;
  polling = true;
  logger.info('Telegram command polling started');
  setInterval(pollUpdatesOnce, intervalMs);
}

async function sendTestMessage() {
  return sendMessage(
    config.telegram.chatId,
    escapeMarkdown('Test message from Personal AI News Assistant. Setup looks good.')
  );
}

module.exports = {
  sendMessage,
  sendNewsArticle,
  sendBriefing,
  handleCommand,
  startPolling,
  sendTestMessage,
  formatNewsMessage,
};
