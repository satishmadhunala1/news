/**
 * Pick headline / one-liner / story paragraph based on EN or TE UI mode.
 */

function firstSentence(text) {
  if (!text) return '';
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/^(.{20,160}?[.!?])(?:\s|$)/);
  if (match) return match[1];
  return cleaned.slice(0, 120) + (cleaned.length > 120 ? '…' : '');
}

export function getDisplayContent(article, language = 'en') {
  const isTe = language === 'te';

  const oneLiner = isTe
    ? article.teluguOneLiner || article.oneLiner || firstSentence(article.teluguSummary || article.description || article.summary)
    : article.oneLiner || firstSentence(article.description || article.summary);

  const story = isTe
    ? article.teluguSummary || article.summary || article.description || ''
    : article.summary || article.description || '';

  return {
    title: article.title,
    oneLiner: oneLiner || 'Story details are limited for this headline.',
    story:
      story ||
      (isTe
        ? 'ఈ వార్తకు పూర్తి సారాంశం ఇంకా అందుబాటులో లేదు. అసలు వ్యాసం చదవడానికి లింక్ ఉపయోగించండి.'
        : 'A full story paragraph is not available yet. Use the original article link to read more.'),
  };
}

