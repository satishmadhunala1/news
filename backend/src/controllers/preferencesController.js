const UserPreferences = require('../models/UserPreferences');
const { DEFAULT_LOCATIONS } = require('../config/locations');
const { DEFAULT_CATEGORIES } = require('../config/categories');
const { startScheduler } = require('../services/schedulerService');
const config = require('../config');

async function getPreferences(req, res, next) {
  try {
    let prefs = await UserPreferences.findOne({ userKey: 'default' }).lean();
    if (!prefs) {
      prefs = (
        await UserPreferences.create({ userKey: 'default' })
      ).toObject();
    }
    res.json({
      success: true,
      data: prefs,
      meta: {
        availableLocations: DEFAULT_LOCATIONS,
        availableCategories: DEFAULT_CATEGORIES,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const allowed = [
      'selectedLocations',
      'selectedCategories',
      'customLocations',
      'preferredLanguage',
      'notificationFrequency',
      'notificationEnabled',
      'breakingNewsAlerts',
      'morningBriefingTime',
      'afternoonBriefingTime',
      'eveningBriefingTime',
      'maxArticlesPerBriefing',
      'telegramPaused',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.preferredLanguage && !['en', 'te', 'both'].includes(updates.preferredLanguage)) {
      return res.status(400).json({ success: false, error: 'Invalid preferredLanguage' });
    }

    const timeFields = ['morningBriefingTime', 'afternoonBriefingTime', 'eveningBriefingTime'];
    for (const field of timeFields) {
      if (updates[field] && !/^\d{2}:\d{2}$/.test(updates[field])) {
        return res.status(400).json({ success: false, error: `Invalid ${field}, use HH:MM` });
      }
    }

    const prefs = await UserPreferences.findOneAndUpdate(
      { userKey: 'default' },
      { $set: updates },
      { upsert: true, new: true }
    ).lean();

    // Reschedule if times changed and this process owns the scheduler
    if (
      config.scheduler.enabled &&
      process.env.RUN_SCHEDULER === 'true' &&
      timeFields.some((f) => updates[f] !== undefined)
    ) {
      await startScheduler();
    }

    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPreferences,
  updatePreferences,
};
