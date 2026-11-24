require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const News = require('../src/models/News');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const total = await News.countDocuments();
  const withImg = await News.countDocuments({ imageUrl: { $nin: [null, ''] } });
  console.log({ total, withImg, without: total - withImg });
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
