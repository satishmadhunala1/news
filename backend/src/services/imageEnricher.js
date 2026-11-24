/**
 * Fetch preview images for articles that providers did not include.
 * 1) Resolve Google News wrapper URLs when possible
 * 2) Read og:image / twitter:image from the publisher page
 * Never downloads or stores full article body text.
 */

const axios = require('axios');
const { isValidHttpUrl } = require('../utils/url');
const logger = require('../utils/logger');
const config = require('../config');

const client = axios.create({
  timeout: Math.min(config.requestTimeoutMs, 10000),
  maxRedirects: 5,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
  },
  responseType: 'text',
  validateStatus: (s) => s >= 200 && s < 400,
});

function extractMetaContent(html, property) {
  if (!html) return null;
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      'i'
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function absolutize(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

function extractHttpStringsFromBuffer(buf) {
  const out = [];
  let cur = '';
  for (let i = 0; i < buf.length; i += 1) {
    const c = buf[i];
    if (c >= 32 && c <= 126) cur += String.fromCharCode(c);
    else {
      if (cur.startsWith('http')) out.push(cur);
      cur = '';
    }
  }
  if (cur.startsWith('http')) out.push(cur);
  return out;
}

/**
 * Google News RSS links wrap the publisher URL in a base64 protobuf id.
 */
function decodeGoogleNewsPublisherUrl(googleUrl) {
  try {
    if (!/news\.google\.com\/.*articles\//i.test(googleUrl)) return null;
    const id = decodeURIComponent(googleUrl.split('/articles/')[1].split('?')[0]);
    const padded = id + '='.repeat((4 - (id.length % 4)) % 4);
    const buf = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const urls = extractHttpStringsFromBuffer(buf)
      .map((u) => u.replace(/[^\w:\/\.\-%?&=#@]+$/g, ''))
      .filter((u) => isValidHttpUrl(u) && !/google\.(com|co\.)|gstatic|schema\.org/i.test(u));
    return urls[0] || null;
  } catch {
    return null;
  }
}

async function resolveArticlePageUrl(articleUrl) {
  if (!isValidHttpUrl(articleUrl)) return null;
  if (!/news\.google\.com/i.test(articleUrl)) return articleUrl;

  const decoded = decodeGoogleNewsPublisherUrl(articleUrl);
  if (decoded) return decoded;

  // Fallback: open non-rss article path and look for publisher anchors
  try {
    const pageUrl = articleUrl.replace('/rss/articles/', '/articles/');
    const { data } = await client.get(pageUrl);
    const html = String(data).slice(0, 200000);
    const patterns = [
      /data-n-au=["'](https?:\/\/[^"']+)["']/i,
      /<a[^>]+href=["'](https?:\/\/(?!([a-z]+\.)?google\.|news\.google)[^"']+)["'][^>]*>\s*<span/i,
      /"canonicalUrl":"(https?:\\\/\\\/[^"]+)"/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) {
        const cleaned = m[1].replace(/\\\//g, '/');
        if (isValidHttpUrl(cleaned) && !/news\.google\.com/i.test(cleaned)) return cleaned;
      }
    }
  } catch (err) {
    logger.warn('Google News resolve failed', { message: err.message });
  }
  return null;
}

async function fetchOgImageFromHtml(pageUrl) {
  const { data, request } = await client.get(pageUrl);
  const finalUrl = request?.res?.responseUrl || pageUrl;
  const head = String(data).slice(0, 150000);

  const candidates = [
    extractMetaContent(head, 'og:image'),
    extractMetaContent(head, 'og:image:secure_url'),
    extractMetaContent(head, 'twitter:image'),
    extractMetaContent(head, 'twitter:image:src'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const absolute = absolutize(candidate, finalUrl);
    if (absolute && isValidHttpUrl(absolute) && !/news\.google\.com/i.test(absolute)) {
      return absolute;
    }
  }
  return null;
}

/**
 * Lookup image via GNews search using the article headline (provider already returns images).
 */
async function fetchImageViaGNews(title) {
  if (!config.gnews.enabled || !title) return null;
  try {
    // Strip publisher suffix from Google News titles: "Headline - The Hindu"
    const cleaned = title
      .replace(/\s+-\s+[^-]+$/, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 10)
      .join(' ');
    if (cleaned.length < 8) return null;

    // Use a short unquoted query — long quoted queries often 400 on free GNews
    const shortQuery = cleaned.split(' ').slice(0, 6).join(' ');
    const { data } = await axios.get(`${config.gnews.baseUrl}/search`, {
      params: {
        token: config.gnews.apiKey,
        q: shortQuery,
        max: 5,
        lang: 'en',
        country: 'in',
      },
      timeout: config.requestTimeoutMs,
    });
    const articles = data.articles || [];
    const tokens = cleaned.toLowerCase().split(' ').filter((t) => t.length > 3).slice(0, 4);
    const scored = articles
      .filter((a) => a.image)
      .map((a) => {
        const t = `${a.title || ''}`.toLowerCase();
        const score = tokens.reduce((n, tok) => n + (t.includes(tok) ? 1 : 0), 0);
        return { image: a.image, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored[0]?.score > 0 ? scored[0].image : scored[0]?.image || null;
  } catch (err) {
    logger.warn('GNews image lookup failed', { message: err.message });
    return null;
  }
}

async function fetchOgImage(articleUrl, title = '') {
  try {
    const pageUrl = await resolveArticlePageUrl(articleUrl);
    if (pageUrl) {
      const og = await fetchOgImageFromHtml(pageUrl);
      if (og) return og;
    }
    // Last resort for Google News wrappers: match headline in GNews (has images)
    if (/news\.google\.com/i.test(articleUrl) && title) {
      return fetchImageViaGNews(title);
    }
    return null;
  } catch (err) {
    logger.warn('Image enrich failed', { message: err.message });
    return null;
  }
}

async function enrichMissingImages(articles, { max = 25, concurrency = 3 } = {}) {
  const targets = articles.filter((a) => a && !a.imageUrl && a.url).slice(0, max);
  const results = articles.map((a) => ({ ...a }));

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    // eslint-disable-next-line no-await-in-loop
    const images = await Promise.all(chunk.map((a) => fetchOgImage(a.url, a.title)));
    chunk.forEach((article, idx) => {
      const imageUrl = images[idx];
      if (!imageUrl) return;
      const pos = results.findIndex(
        (r) => r.canonicalUrl === article.canonicalUrl || r.url === article.url
      );
      if (pos >= 0) results[pos].imageUrl = imageUrl;
    });
    // Be polite to GNews rate limits when falling back
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

module.exports = {
  fetchOgImage,
  enrichMissingImages,
  resolveArticlePageUrl,
  decodeGoogleNewsPublisherUrl,
};
