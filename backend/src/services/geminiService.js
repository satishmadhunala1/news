/**
 * Google Gemini AI — summaries and classification.
 * Optional: if disabled or unavailable, callers fall back to description.
 */

const config = require('../config');
const logger = require('../utils/logger');

let genAI = null;
let initError = null;

async function getClient() {
  if (!config.gemini.enabled) {
    return null;
  }
  if (genAI) return genAI;
  if (initError) return null;

  try {
    const { GoogleGenAI } = require('@google/genai');
    genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    return genAI;
  } catch (err) {
    initError = err.message;
    logger.error('Failed to init Gemini client', { message: err.message });
    return null;
  }
}

function safeJsonParse(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackOneLiner(article) {
  const text = (article.description || article.title || '').replace(/\s+/g, ' ').trim();
  if (!text) return article.title;
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

function fallbackSummary(article) {
  return article.description || article.title || '';
}

/**
 * Process a batch of articles with Gemini.
 * Uses headline + description only — never invents facts.
 */
async function processArticleBatch(articles, { includeTelugu = true } = {}) {
  const client = await getClient();
  if (!client || !articles?.length) {
    return articles.map((a) => ({
      ...a,
      oneLiner: a.oneLiner || fallbackOneLiner(a),
      summary: a.summary || fallbackSummary(a),
      aiUsed: false,
    }));
  }

  const payload = articles.map((a, idx) => ({
    index: idx,
    title: a.title,
    description: a.description || '',
    sourceName: a.sourceName,
    language: a.language || 'en',
  }));

  const prompt = `You are a news assistant. Using ONLY the provided headline and description metadata, return JSON.
Do NOT invent facts. Do NOT claim the original article was verified.
If evidence is weak, keep importance moderate and avoid "breaking-news".

For each article produce:
- oneLiner: one short English sentence (max ~20 words)
- summary: one English paragraph (4-6 sentences) that explains the story clearly for a reader who will not open the original article
- teluguOneLiner: one short Telugu sentence
- teluguSummary: one Telugu paragraph (4-6 sentences) with the same meaning as the English summary

Return ONLY valid JSON in this shape:
{
  "items": [
    {
      "index": 0,
      "oneLiner": "short English sentence",
      "summary": "one English paragraph",
      "teluguOneLiner": ${includeTelugu ? '"short Telugu sentence"' : 'null'},
      "teluguSummary": ${includeTelugu ? '"one Telugu paragraph"' : 'null'},
      "category": "one of: national-politics, state-politics, government-announcements, hyderabad-local, business-economy, technology-ai, sports, cricket, entertainment, crime-safety, science-space, international-affairs, breaking-news",
      "location": "one of: hyderabad, delhi, greater-noida, telangana, andhra-pradesh, india, united-states, united-kingdom, china, russia, europe, international",
      "importanceScore": 0-100
    }
  ]
}

Articles:
${JSON.stringify(payload)}`;

  try {
    const response = await client.models.generateContent({
      model: config.gemini.model,
      contents: prompt,
    });

    const text = response.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = safeJsonParse(text);
    const items = parsed?.items || [];

    return articles.map((article, idx) => {
      const ai = items.find((i) => i.index === idx) || items[idx];
      if (!ai) {
        return {
          ...article,
          oneLiner: fallbackOneLiner(article),
          summary: fallbackSummary(article),
          aiUsed: false,
        };
      }
      return {
        ...article,
        oneLiner: ai.oneLiner || fallbackOneLiner(article),
        summary: ai.summary || fallbackSummary(article),
        teluguOneLiner: includeTelugu ? ai.teluguOneLiner || null : article.teluguOneLiner || null,
        teluguSummary: includeTelugu ? ai.teluguSummary || null : article.teluguSummary || null,
        // Keep dedicated feed tags (entertainment / Andhra) over AI guesses
        category:
          article.category === 'entertainment'
            ? 'entertainment'
            : ai.category || article.category,
        location: ['andhra-pradesh', 'hyderabad', 'telangana', 'delhi', 'greater-noida'].includes(
          article.location
        )
          ? article.location
          : ai.location || article.location,
        importanceScore:
          typeof ai.importanceScore === 'number'
            ? Math.max(0, Math.min(100, Math.round(ai.importanceScore)))
            : article.importanceScore,
        aiUsed: true,
      };
    });
  } catch (err) {
    logger.error('Gemini batch processing failed', { message: err.message });
    return articles.map((a) => ({
      ...a,
      oneLiner: a.oneLiner || fallbackOneLiner(a),
      summary: a.summary || fallbackSummary(a),
      aiUsed: false,
    }));
  }
}

async function verifyModel() {
  const client = await getClient();
  if (!client) {
    return { ok: false, reason: initError || 'Gemini disabled or missing API key' };
  }
  try {
    const response = await client.models.generateContent({
      model: config.gemini.model,
      contents: 'Reply with exactly: OK',
    });
    const text = response.text || '';
    return { ok: true, model: config.gemini.model, sample: text.slice(0, 40) };
  } catch (err) {
    return { ok: false, reason: err.message, model: config.gemini.model };
  }
}

module.exports = {
  processArticleBatch,
  verifyModel,
};
