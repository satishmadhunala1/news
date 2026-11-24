require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const News = require('../src/models/News');
const { fetchOgImage, decodeGoogleNewsPublisherUrl } = require('../src/services/imageEnricher');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await News.find({
    $or: [{ imageUrl: null }, { imageUrl: '' }],
  })
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();

  for (const doc of docs) {
    const decoded = decodeGoogleNewsPublisherUrl(doc.url);
    const img = await fetchOgImage(doc.url, doc.title);
    console.log({
      title: doc.title.slice(0, 70),
      decoded,
      img: img ? img.slice(0, 120) : null,
    });
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
