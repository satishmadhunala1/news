require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { fetchOgImage } = require('../src/services/imageEnricher');

async function main() {
  const samples = [
    {
      title: '30 Students Fall Ill After Consuming Food at Hyderabad Central University - Times of India',
      url: 'https://news.google.com/rss/articles/CBMiAAAAAAAAAAA',
    },
    {
      title: 'ED Conducts Raids at Former MLA Rekha Naik Residence',
      url: 'https://www.deccanchronicle.com/southern-states/telangana/ed-conducts-raids-at-former-mla-rekha-naiks-residence-2006131',
    },
  ];

  for (const s of samples) {
    const img = await fetchOgImage(s.url, s.title);
    console.log({ title: s.title.slice(0, 60), img });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
