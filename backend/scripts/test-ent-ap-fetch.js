require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const gnews = require('../src/services/providers/gnewsService');
const newsapi = require('../src/services/providers/newsApiService');
const googleRss = require('../src/services/providers/googleNewsRssService');
const { normalizeMany } = require('../src/services/newsNormalizer');
const { enrichArticle } = require('../src/services/importanceRanker');

async function main() {
  const ap = await gnews.searchArticles({
    q: 'Andhra Pradesh OR Vijayawada OR Visakhapatnam',
    max: 4,
    country: 'in',
  });
  console.log('GNews AP', {
    err: ap.error,
    count: ap.articles.length,
    sample: ap.articles[0]?.title,
  });

  await new Promise((r) => setTimeout(r, 1100));

  const ent = await gnews.searchArticles({
    q: 'Bollywood OR Tollywood OR movies OR cinema',
    max: 4,
    country: 'in',
  });
  console.log('GNews ENT', {
    err: ent.error,
    count: ent.articles.length,
    sample: ent.articles[0]?.title,
  });

  const nap = await newsapi.searchEverything({
    q: 'Andhra Pradesh OR Vijayawada',
    pageSize: 4,
  });
  console.log('NewsAPI AP', {
    err: nap.error,
    count: nap.articles.length,
    sample: nap.articles[0]?.title,
  });

  const nent = await newsapi.searchEverything({
    q: 'Bollywood OR Tollywood OR movies',
    pageSize: 4,
  });
  console.log('NewsAPI ENT', {
    err: nent.error,
    count: nent.articles.length,
    sample: nent.articles[0]?.title,
  });

  const rssAp = await googleRss.searchByQuery('Andhra Pradesh');
  const rssEnt = await googleRss.searchByQuery('Tollywood OR Bollywood OR cinema');
  console.log('RSS AP', { count: rssAp.articles?.length || 0, sample: rssAp.articles?.[0]?.title });
  console.log('RSS ENT', { count: rssEnt.articles?.length || 0, sample: rssEnt.articles?.[0]?.title });

  const normalized = [
    ...normalizeMany(ap.articles, 'gnews', { location: 'andhra-pradesh', language: 'en' }),
    ...normalizeMany(ent.articles, 'gnews', { category: 'entertainment', location: 'india', language: 'en' }),
    ...normalizeMany(nap.articles, 'newsapi', { location: 'andhra-pradesh', language: 'en' }),
    ...normalizeMany(nent.articles, 'newsapi', { category: 'entertainment', location: 'india', language: 'en' }),
  ].map(enrichArticle);

  console.log('After enrich:', {
    andhra: normalized.filter((a) => a.location === 'andhra-pradesh').length,
    entertainment: normalized.filter((a) => a.category === 'entertainment').length,
    samples: normalized.slice(0, 4).map((a) => ({
      title: a.title.slice(0, 60),
      location: a.location,
      category: a.category,
    })),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
