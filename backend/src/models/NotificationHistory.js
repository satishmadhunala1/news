const mongoose = require('mongoose');

const notificationHistorySchema = new mongoose.Schema(
  {
    newsId: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true, index: true },
    telegramChatId: { type: String, required: true, index: true },
    sentAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'sent',
      index: true,
    },
    messagePreview: { type: String, default: '' },
    error: { type: String, default: null },
    channel: { type: String, default: 'telegram' },
  },
  { timestamps: true }
);

// Prevent sending the same article twice to the same chat
notificationHistorySchema.index(
  { newsId: 1, telegramChatId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'sent' } }
);

module.exports =
  mongoose.models.NotificationHistory ||
  mongoose.model('NotificationHistory', notificationHistorySchema);
