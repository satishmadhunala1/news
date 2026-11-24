/**
 * Simple logger that never prints secrets.
 */

const SECRET_KEYS = [
  'apiKey',
  'api_key',
  'token',
  'password',
  'secret',
  'authorization',
  'MONGODB_URI',
  'GEMINI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'GNEWS_API_KEY',
  'NEWSAPI_API_KEY',
];

function redact(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // Redact embedded credentials / connection strings, keep normal error text
    return value
      .replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, 'mongodb://[REDACTED]')
      .replace(/\bAIza[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_KEY]')
      .replace(/\bAQ\.[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_KEY]')
      .replace(/\b\d{8,}:[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_TOKEN]');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

function log(level, message, meta) {
  const time = new Date().toISOString();
  if (meta !== undefined) {
    console[level](`[${time}] [${level.toUpperCase()}] ${message}`, redact(meta));
  } else {
    console[level](`[${time}] [${level.toUpperCase()}] ${message}`);
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  redact,
};
