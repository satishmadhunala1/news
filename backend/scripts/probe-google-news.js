const axios = require('axios');

async function main() {
  const url =
    'https://news.google.com/rss/articles/CBMi0gFBVV95cUxQcEQxMVRFMkpOeXRiUzRaUFhhdzBFbmtpX0NnMHh3MWpvaUh5UE1CWktURjlJeXlKZGVTLWxER0dPR1dwOXVBYVV';

  const r = await axios.get(url, {
    maxRedirects: 10,
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    validateStatus: () => true,
  });

  const html = String(r.data);
  console.log('status', r.status);
  console.log('final', r.request?.res?.responseUrl || r.config.url);
  console.log('len', html.length);

  const patterns = [
    /og:image["']\s+content=["']([^"']+)/i,
    /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /data-n-au=["']([^"']+)/i,
    /<a[^>]+href=["'](https?:\/\/(?!news\.google\.com|www\.google\.com)[^"']+)["']/i,
    /"canonicalUrl":"(https?:\\\/\\\/[^"]+)"/i,
    /jslog[^>]+data-n-au="([^"]+)"/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) console.log('hit', re.toString().slice(0, 40), m[1].slice(0, 160));
  }

  // Try decoding article id payload
  try {
    const id = url.split('/articles/')[1].split('?')[0];
    const buf = Buffer.from(id, 'base64');
    console.log('decoded ascii snippet:', buf.toString('utf8').replace(/[^\x20-\x7E]/g, ' ').slice(0, 300));
  } catch (e) {
    console.log('decode failed', e.message);
  }
}

main().catch((e) => console.error(e.message));
