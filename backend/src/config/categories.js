/**
 * Supported news categories used across providers, AI, and the dashboard.
 */

const DEFAULT_CATEGORIES = [
  { id: 'national-politics', label: 'National Politics', keywords: ['politics', 'election', 'parliament', 'modi', 'congress', 'bjp'] },
  { id: 'state-politics', label: 'State Politics', keywords: ['assembly', 'cm', 'state government', 'telangana politics'] },
  { id: 'government-announcements', label: 'Government Announcements', keywords: ['scheme', 'policy', 'ministry', 'notification', 'government'] },
  { id: 'hyderabad-local', label: 'Hyderabad Local News', keywords: ['hyderabad', 'ghmc', 'cyberabad', 'secunderabad'] },
  { id: 'business-economy', label: 'Business and Economy', keywords: ['business', 'economy', 'market', 'stock', 'startup', 'finance'] },
  {
    id: 'technology-ai',
    label: 'Technology and AI',
    keywords: ['technology', 'artificial intelligence', 'software', 'chatgpt', 'openai', 'machine learning'],
  },
  { id: 'sports', label: 'Sports', keywords: ['sports', 'football', 'tennis', 'olympics', 'athlete'] },
  { id: 'cricket', label: 'Cricket', keywords: ['cricket', 'ipl', 'bcci', 'test match', 't20'] },
  {
    id: 'entertainment',
    label: 'Entertainment',
    keywords: [
      'entertainment',
      'movie',
      'movies',
      'film',
      'cinema',
      'bollywood',
      'tollywood',
      'kollywood',
      'actor',
      'actress',
      'celebrity',
      'box office',
      'ott',
      'trailer',
      'web series',
      'netflix',
      'disney',
      'leading lady',
      'box-office',
      'సినిమా',
      'సినిమాలు',
      'బాలీవుడ్',
      'టాలీవుడ్',
    ],
  },
  { id: 'crime-safety', label: 'Crime and Public Safety', keywords: ['crime', 'police', 'arrest', 'accident', 'safety'] },
  { id: 'science-space', label: 'Science and Space', keywords: ['science', 'space', 'isro', 'nasa', 'research'] },
  { id: 'international-affairs', label: 'International Affairs', keywords: ['international', 'diplomacy', 'foreign', 'war', 'geopolitics'] },
  { id: 'breaking-news', label: 'Breaking News', keywords: ['breaking', 'just in', 'developing'] },
];

function getCategoryById(id) {
  return DEFAULT_CATEGORIES.find((cat) => cat.id === id) || null;
}

module.exports = {
  DEFAULT_CATEGORIES,
  getCategoryById,
};
