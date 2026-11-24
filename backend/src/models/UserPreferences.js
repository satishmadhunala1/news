const mongoose = require('mongoose');
const { DEFAULT_LOCATIONS } = require('../config/locations');
const { DEFAULT_CATEGORIES } = require('../config/categories');

const userPreferencesSchema = new mongoose.Schema(
  {
    userKey: { type: String, default: 'default', unique: true },
    selectedLocations: {
      type: [String],
      default: () => DEFAULT_LOCATIONS.map((l) => l.id),
    },
    selectedCategories: {
      type: [String],
      default: () => DEFAULT_CATEGORIES.map((c) => c.id),
    },
    customLocations: {
      type: [
        {
          id: String,
          label: String,
          query: String,
          country: String,
        },
      ],
      default: [],
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'te', 'both'],
      default: 'en',
    },
    notificationFrequency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    notificationEnabled: { type: Boolean, default: true },
    breakingNewsAlerts: { type: Boolean, default: true },
    morningBriefingTime: { type: String, default: '09:00' },
    afternoonBriefingTime: { type: String, default: '13:00' },
    eveningBriefingTime: { type: String, default: '19:00' },
    maxArticlesPerBriefing: { type: Number, default: 10, min: 1, max: 30 },
    telegramPaused: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.UserPreferences || mongoose.model('UserPreferences', userPreferencesSchema);
