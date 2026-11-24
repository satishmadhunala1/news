/**
 * Smoke-test new providers independently.
 * Usage: node scripts/test-new-providers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { normalizeMany } = require('../src/services/newsNormalizer');
const newsdata = require('../src/services/newsProviders/newsdataService');
const gdelt = require('../src/services/newsProviders/gdeltService');
const oneindia = require('../src/services/newsProviders/oneindiaTeluguRssService');
const teluguRss = require('../src/services/newsProviders/teluguRssService');

function report(name, result, normalized) {
  const sample = normalized[0];
  console.log(`\n=== ${name} ===`);
  console.log({
    connection: result.skipped ? 'skipped' : result.error ? 'error' : 'ok',
    skipped: Boolean(result.skipped),
    error: result.error || (result.errors?.length ? result.errors[0].error : null),
    fetched: (result.articles || []).length,
    normalized: normalized.length,
    sampleHeadline: sample?.title || null,
    samplePublisher: sample?.sourceName || null,
    sampleLanguage: sample?.language || null,
    sampleLocation: sample?.location || null,
  });
}

async function main() {
  console.log('Testing new news providers...\n');

  const nd = await newsdata.fetchLatest({
    q: 'Telangana',
    language: 'en',
    country: 'in',
    size: 3,
  });
  report(
    'NewsData.io (India/EN Telangana)',
    nd,
    normalizeMany(nd.articles, 'newsdata', { location: 'telangana', language: 'en' })
  );

  const ndTe = await newsdata.fetchLatest({
    q: 'Hyderabad',
    language: 'te',
    country: 'in',
    size: 3,
  });
  report(
    'NewsData.io (Hyderabad/TE)',
    ndTe,
    normalizeMany(ndTe.articles, 'newsdata', { location: 'hyderabad', language: 'te' })
  );

  const gd = await gdelt.searchArticles({
    query: '(Telangana OR Hyderabad) sourcecountry:IN sourcelang:eng',
    maxrecords: 5,
    timespan: '2d',
  });
  report(
    'GDELT DOC 2.0 (Telangana/EN)',
    gd,
    normalizeMany(gd.articles, 'gdelt', { location: 'telangana', language: 'en' })
  );

  const oi = await oneindia.fetchConfiguredFeeds();
  report(
    'Oneindia Telugu RSS',
    oi,
    normalizeMany(oi.articles || [], 'oneindia-telugu-rss', { language: 'te' })
  );

  const te = await teluguRss.fetchConfiguredFeeds();
  report(
    'Additional Telugu RSS (BBC Telugu)',
    te,
    normalizeMany(te.articles || [], 'telugu-rss', { language: 'te' })
  );
}

main().catch((err) => {
  console.error('New provider test failed:', err.message);
  process.exit(1);
});
