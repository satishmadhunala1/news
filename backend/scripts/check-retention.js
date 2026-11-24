require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('news');
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldest = await col.find().sort({ publishedAt: 1 }).limit(1).project({ title: 1, publishedAt: 1, fetchedAt: 1 }).toArray();
  const newest = await col.find().sort({ publishedAt: -1 }).limit(1).project({ title: 1, publishedAt: 1 }).toArray();
  const olderPublished = await col.countDocuments({ publishedAt: { $lt: cutoff } });
  const olderFetched = await col.countDocuments({ fetchedAt: { $lt: cutoff } });
  console.log(JSON.stringify({ cutoff, oldest, newest, olderPublished, olderFetched }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
