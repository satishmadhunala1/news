const NotificationHistory = require('../models/NotificationHistory');
const telegramService = require('../services/telegramService');

async function getHistory(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      NotificationHistory.find()
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('newsId', 'title url category location sourceName')
        .lean(),
      NotificationHistory.countDocuments(),
    ]);

    res.json({ success: true, page, limit, total, data: items });
  } catch (err) {
    next(err);
  }
}

async function testNotification(req, res, next) {
  try {
    const result = await telegramService.sendTestMessage();
    if (!result.ok) {
      return res.status(502).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHistory,
  testNotification,
};
