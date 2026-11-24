require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const News = require('../src/models/News');
const axios = require('axios');

function extractStrings(buf) {
  const out = [];
  let cur = '';
  for (let i = 0; i < buf.length; i += 1) {
    const c = buf[i];
    if (c >= 32 && c <= 126) cur += String.fromCharCode(c);
    else {
      if (cur.length >= 8) out.push(cur);
      cur = '';
    }
  }
  if (cur.length >= 8) out.push(cur);
  return out;
}

async function resolveViaFetch(googleUrl) {
  // Try Google's internal decode endpoint used by some clients
  const articlePath = googleUrl.replace('https://news.google.com/rss/articles/', '').replace('https://news.google.com/articles/', '');
  const id = articlePath.split('?')[0];
  try {
    const r = await axios.post(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je',
      `f.req=${encodeURIComponent(JSON.stringify([[['Fbv4je', JSON.stringify([null, null, [null, null, null, null, null, [id]]), null, null, null, 1]]]]))}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 12000,
        validateStatus: () => true,
      }
    );
    const text = String(r.data);
    const urls = text.match(/https?:\/\/[^"\\]+/g) || [];
    return { status: r.status, urls: urls.filter((u) => !/google\.com|gstatic|schema\.org/i.test(u)).slice(0, 10) };
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await News.findOne({ source: 'google-news-rss' }).lean();
  const id = doc.url.split('/articles/')[1].split('?')[0];
  const padded = id + '='.repeat((4 - (id.length % 4)) % 4);
  const buf = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const strings = extractStrings(buf);
  console.log('protobuf strings:', strings.filter((s) => s.includes('http') || s.length > 20).slice(0, 20));
  console.log('batchexecute:', await resolveViaFetch(doc.url));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
