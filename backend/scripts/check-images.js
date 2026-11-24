require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const News = require('../src/models/News');
const { fetchOgImage } = require('../src/services/imageEnricher');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const total = await News.countDocuments();
  const withImg = await News.countDocuments({ imageUrl: { $nin: [null, ''] } });
  const sample = await News.find({ $or: [{ imageUrl: null }, { imageUrl: '' }] })
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean();
  const withSample = await News.find({ imageUrl: { $nin: [null, ''] } })
    .limit(2)
    .lean();

  console.log({ total, withImg, without: total - withImg });
  console.log(
    'no-image samples:',
    sample.map((s) => ({ title: s.title.slice(0, 60), url: s.url.slice(0, 140), source: s.source }))
  );
  console.log(
    'with-image samples:',
    withSample.map((s) => ({ title: s.title.slice(0, 50), image: (s.imageUrl || '').slice(0, 100) }))
  );

  if (sample[0]?.url) {
    const img = await fetchOgImage(sample[0].url);
    console.log('og test for first missing:', { url: sample[0].url.slice(0, 100), img });
  }

  // Direct publisher URL test
  const dc =
    'https://www.deccanchronicle.com/southern-states/telangana/ed-conducts-raids-at-former-mla-rekha-naiks-residence-2006131';
  console.log('dc og:', await fetchOgImage(dc));

  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
