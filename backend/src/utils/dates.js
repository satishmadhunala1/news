/**
 * Date parsing helpers for mixed provider formats.
 */

function parseArticleDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Reject clearly invalid future dates (> 1 day ahead)
  const maxFuture = Date.now() + 24 * 60 * 60 * 1000;
  if (date.getTime() > maxFuture) return null;
  return date;
}

function isRecent(date, maxAgeHours = 72) {
  const parsed = parseArticleDate(date);
  if (!parsed) return false;
  const ageMs = Date.now() - parsed.getTime();
  return ageMs >= 0 && ageMs <= maxAgeHours * 60 * 60 * 1000;
}

module.exports = {
  parseArticleDate,
  isRecent,
};
