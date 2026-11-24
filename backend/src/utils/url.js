/**
 * URL helpers: validation and canonicalization for duplicate detection.
 */

function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Canonicalize article URLs for duplicate matching.
 * Removes tracking params and trailing slashes.
 */
function canonicalizeUrl(value) {
  if (!isValidHttpUrl(value)) return null;
  try {
    const url = new URL(value.trim());
    url.hash = '';

    const dropParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'mc_cid',
      'mc_eid',
    ];
    dropParams.forEach((p) => url.searchParams.delete(p));

    let pathname = url.pathname.replace(/\/+$/, '') || '/';
    url.pathname = pathname;

    return url.toString().toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHeadline(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  isValidHttpUrl,
  canonicalizeUrl,
  normalizeHeadline,
};
