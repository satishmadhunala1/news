require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const News = require('../src/models/News');

function tryExtractUrlFromGoogleId(articleUrl) {
  try {
    const id = decodeURIComponent(articleUrl.split('/articles/')[1].split('?')[0]);
    const padded = id + '='.repeat((4 - (id.length % 4)) % 4);
    const buf = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const text = buf.toString('utf8');
    const matches = text.match(/https?:\/\/[^\s\x00-\x1f"<>]+/g) || [];
    return matches.map((u) => u.replace(/[^\w:\/\.\-%?&=#@]+$/g, ''));
  } catch {
    return [];
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await News.findOne({ source: 'google-news-rss', url: /news\.google\.com/ }).lean();
  console.log('full url length', doc.url.length);
  console.log('full url', doc.url);

  console.log('decoded urls', tryExtractUrlFromGoogleId(doc.url));

  const variants = [
    doc.url,
    doc.url.replace('/rss/articles/', '/articles/'),
    `${doc.url}${doc.url.includes('?') ? '&' : '?'}hl=en-IN&gl=IN&ceid=IN:en`,
  ];

  for (const u of variants) {
    try {
      const r = await axios.get(u, {
        maxRedirects: 5,
        timeout: 12000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        validateStatus: () => true,
      });
      const html = String(r.data);
      console.log('\nvariant status', r.status, 'final', r.request?.res?.responseUrl?.slice(0, 120));
      const href = html.match(/data-n-au="(https?:\/\/[^"]+)"/);
      const canonical = html.match(/rel="canonical" href="([^"]+)"/);
      const og = html.match(/property="og:url" content="([^"]+)"/);
      console.log({ href: href?.[1]?.slice(0, 120), canonical: canonical?.[1], og: og?.[1] });
    } catch (e) {
      console.log('fail', e.message);
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
