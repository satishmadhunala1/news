const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    oneLiner: { type: String, default: null },
    teluguOneLiner: { type: String, default: null },
    summary: { type: String, default: null },
    teluguSummary: { type: String, default: null },
    source: { type: String, required: true, index: true },
    sourceName: { type: String, required: true },
    url: { type: String, required: true },
    canonicalUrl: { type: String, required: true },
    normalizedTitle: { type: String, default: '', index: true },
    imageUrl: { type: String, default: null },
    category: { type: String, default: null, index: true },
    location: { type: String, default: null, index: true },
    publishedAt: { type: Date, required: true, index: true },
    fetchedAt: { type: Date, default: Date.now, index: true },
    importanceScore: { type: Number, default: 0, min: 0, max: 100, index: true },
    isSent: { type: Boolean, default: false, index: true },
    language: { type: String, default: 'en', index: true },
    bookmarked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

newsSchema.index({ language: 1, publishedAt: -1 });

// Duplicate prevention
newsSchema.index({ canonicalUrl: 1 }, { unique: true });
newsSchema.index({ url: 1 }, { unique: true });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ location: 1, publishedAt: -1 });
newsSchema.index({ importanceScore: -1, publishedAt: -1 });
// language_override must NOT be our `language` field — Mongo treats that as
// stemmer locale and rejects values like "te" ("language override unsupported").
newsSchema.index(
  { title: 'text', description: 'text', summary: 'text' },
  { default_language: 'none', language_override: 'searchLanguage' }
);

module.exports = mongoose.models.News || mongoose.model('News', newsSchema);
