require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const News = require('../src/models/News');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ent = await News.countDocuments({ category: 'entertainment' });
  const ap = await News.countDocuments({ location: 'andhra-pradesh' });
  const locCounts = await News.aggregate([
    { $group: { _id: '$location', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  const catCounts = await News.aggregate([
    { $group: { _id: '$category', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  console.log(JSON.stringify({ ent, ap, locCounts, catCounts }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
