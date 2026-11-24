/**
 * Phase 3 smoke test — call each provider independently.
 * Usage: node scripts/test-providers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const gnews = require('../src/services/providers/gnewsService');
const newsapi = require('../src/services/providers/newsApiService');
const googleRss = require('../src/services/providers/googleNewsRssService');

async function main() {
  console.log('--- Testing GNews ---');
  const g = await gnews.fetchTopHeadlines({ country: 'in', max: 3 });
  console.log({
    skipped: g.skipped,
    error: g.error || null,
    count: g.articles.length,
    sample: g.articles[0]?.title || null,
  });

  console.log('--- Testing NewsAPI ---');
  const n = await newsapi.fetchTopHeadlines({ country: 'in', pageSize: 3 });
  console.log({
    skipped: n.skipped,
    error: n.error || null,
    count: n.articles.length,
    sample: n.articles[0]?.title || null,
  });

  console.log('--- Testing Google News RSS ---');
  const r = await googleRss.searchByQuery('Hyderabad');
  console.log({
    skipped: r.skipped,
    error: r.error || null,
    count: r.articles?.length || 0,
    sample: r.articles?.[0]?.title || null,
  });
}

main().catch((err) => {
  console.error('Provider test failed:', err.message);
  process.exit(1);
});
