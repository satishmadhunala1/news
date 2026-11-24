/**
 * Heuristic importance scoring (0–100).
 * Does NOT invent "breaking" status without evidence in title/description.
 */

const { DEFAULT_CATEGORIES } = require('../config/categories');
const { DEFAULT_LOCATIONS } = require('../config/locations');

const HIGH_SIGNAL = [
  'election',
  'budget',
  'crash',
  'attack',
  'earthquake',
  'cyclone',
  'flood',
  'supreme court',
  'reserve bank',
  'rbi',
  'isro',
  'war',
  'ceasefire',
  'inflation',
  'gdp',
];

function textBlob(article) {
  return `${article.title || ''} ${article.description || ''}`.toLowerCase();
}

/** Word-aware match so short needles like "ai" do not hit "trains" / "said". */
function blobHasKeyword(blob, keyword) {
  const kw = String(keyword).toLowerCase().trim();
  if (!kw) return false;
  if (kw.length <= 3) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu').test(blob);
  }
  return blob.includes(kw);
}

function detectCategory(article) {
  // Dedicated entertainment / topic feeds must keep their tag
  if (article.category === 'entertainment') return 'entertainment';

  const blob = textBlob(article);
  let best = null;
  let bestScore = 0;

  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.id === 'breaking-news') continue; // handled separately with evidence
    let score = 0;
    for (const kw of cat.keywords) {
      if (blobHasKeyword(blob, kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat.id;
    }
  }
  // Prefer keyword match; keep provider/feed category when no keyword hit
  if (bestScore > 0) return best;
  if (article.category) return article.category;
  return 'international-affairs';
}

function detectLocation(article) {
  const blob = textBlob(article);
  // Keyword detection first so Andhra stories are not stuck as Hyderabad/India
  const extra = [
    {
      id: 'andhra-pradesh',
      needles: [
        'andhra pradesh',
        'andhra',
        'amaravati',
        'vijayawada',
        'visakhapatnam',
        'vizag',
        'tirupati',
        'guntur',
        'nellore',
        'ఆంధ్రప్రదేశ్',
        'ఆంధ్ర',
        'అమరావతి',
        'విజయవాడ',
        'విశాఖపట్నం',
      ],
    },
    {
      id: 'hyderabad',
      needles: ['hyderabad', 'secunderabad', 'cyberabad', 'ghmc', 'హైదరాబాద్', 'సికింద్రాబాద్'],
    },
    {
      id: 'telangana',
      needles: ['telangana', 'warangal', 'khammam', 'karimnagar', 'తెలంగాణ', 'వరంగల్'],
    },
  ];
  for (const item of extra) {
    if (item.needles.some((n) => blobHasKeyword(blob, n) || blob.includes(String(n).toLowerCase()))) {
      return item.id;
    }
  }
  // Keep dedicated Andhra / regional feed tags when text has no place name
  if (article.location && article.location !== 'custom') return article.location;
  for (const loc of DEFAULT_LOCATIONS) {
    if (blob.includes(loc.label.toLowerCase()) || blob.includes(loc.query.toLowerCase())) {
      return loc.id;
    }
  }
  return 'international';
}

function hasBreakingEvidence(article) {
  const blob = textBlob(article);
  // Only mark breaking when the publisher itself signals it
  return /\bbreaking\b|\bjust in\b|\bdeveloping story\b/i.test(blob);
}

function calculateImportanceScore(article) {
  let score = 40;
  const blob = textBlob(article);

  for (const term of HIGH_SIGNAL) {
    if (blob.includes(term)) score += 6;
  }

  if (hasBreakingEvidence(article)) score += 15;

  // Prefer recent articles
  if (article.publishedAt) {
    const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / 3600000;
    if (ageHours <= 6) score += 12;
    else if (ageHours <= 24) score += 8;
    else if (ageHours <= 48) score += 4;
    else score -= 5;
  }

  // Has usable description
  if (article.description && article.description.length > 40) score += 4;

  // Known major publishers (light boost only)
  const source = (article.sourceName || '').toLowerCase();
  if (/(reuters|ap news|bbc|the hindu|indian express|ndtv|times of india)/i.test(source)) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function enrichArticle(article) {
  const category = detectCategory(article);
  const location = detectLocation(article);
  const breaking = hasBreakingEvidence(article);
  const importanceScore = calculateImportanceScore({ ...article, category, location });

  return {
    ...article,
    category: breaking ? 'breaking-news' : category,
    location,
    importanceScore,
  };
}

module.exports = {
  calculateImportanceScore,
  detectCategory,
  detectLocation,
  hasBreakingEvidence,
  enrichArticle,
};
