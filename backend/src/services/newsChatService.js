/**
 * News chat: turn a natural question into a search, fetch stories, answer briefly.
 */

const config = require('../config');
const logger = require('../utils/logger');
const { searchTopic, inferLocationFromQuery } = require('./topicSearchService');

let genAI = null;

async function getClient() {
  if (!config.gemini.enabled) return null;
  if (genAI) return genAI;
  try {
    const { GoogleGenAI } = require('@google/genai');
    genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    return genAI;
  } catch (err) {
    logger.error('News chat Gemini init failed', { message: err.message });
    return null;
  }
}

function safeJsonParse(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function heuristicPlan(question) {
  const q = String(question || '').trim();
  const cleaned = q
    .replace(/^(what|what's|whats|who|when|where|why|how|is|are|did|does|tell me|any news|news about)\b[\s,]*/gi, '')
    .replace(/[?!.]+$/g, '')
    .trim();
  return {
    searchQuery: cleaned || q,
    location: inferLocationFromQuery(q),
  };
}

async function planSearch(question) {
  const fallback = heuristicPlan(question);
  const client = await getClient();
  if (!client) return fallback;

  const prompt = `You help a personal India news desk.
User question: ${JSON.stringify(question)}

Return ONLY JSON:
{
  "searchQuery": "short news search query (keywords, no filler)",
  "location": "one of: hyderabad, delhi, greater-noida, uttar-pradesh, telangana, andhra-pradesh, india, international, or null"
}`;

  try {
    const response = await client.models.generateContent({
      model: config.gemini.model,
      contents: prompt,
    });
    const text = response.text || '';
    const parsed = safeJsonParse(text);
    if (!parsed?.searchQuery) return fallback;
    return {
      searchQuery: String(parsed.searchQuery).trim() || fallback.searchQuery,
      location: parsed.location || fallback.location || null,
    };
  } catch (err) {
    logger.warn('News chat plan failed', { message: err.message });
    return fallback;
  }
}

function fallbackReply(question, articles) {
  if (!articles.length) {
    return `I could not find recent stories for “${question}”. Try different words or a place filter.`;
  }
  const lines = articles.slice(0, 3).map((a, i) => `${i + 1}. ${a.title}`);
  return `Here is what I found related to your question:\n\n${lines.join('\n')}\n\nOpen a card below to read the full story.`;
}

async function answerFromArticles(question, articles) {
  const client = await getClient();
  if (!client || !articles.length) return fallbackReply(question, articles);

  const compact = articles.slice(0, 6).map((a, i) => ({
    i: i + 1,
    title: a.title,
    summary: a.oneLiner || a.summary || a.description || '',
    location: a.location,
    source: a.sourceName,
    publishedAt: a.publishedAt,
  }));

  const prompt = `You are Meridian, a calm personal news assistant for India.
Answer the user's question using ONLY the articles below.
Keep the reply short (4-7 sentences). Mention place if clear. Do not invent facts.
If articles are weak, say what is available.

Question: ${JSON.stringify(question)}
Articles: ${JSON.stringify(compact)}`;

  try {
    const response = await client.models.generateContent({
      model: config.gemini.model,
      contents: prompt,
    });
    const text = (response.text || '').trim();
    return text || fallbackReply(question, articles);
  } catch (err) {
    logger.warn('News chat answer failed', { message: err.message });
    return fallbackReply(question, articles);
  }
}

/**
 * @param {{ message: string, location?: string }} input
 */
async function chatAboutNews({ message, location } = {}) {
  const question = String(message || '').trim();
  if (!question) {
    return {
      reply: 'Ask a news question — for example: “What is the latest on Delhi air quality?”',
      articles: [],
      searchQuery: '',
      location: null,
      liveFetched: 0,
    };
  }

  // Prefer fast heuristic; Gemini planning is best-effort and can be slow/unavailable
  let plan = heuristicPlan(question);
  try {
    const aiPlan = await Promise.race([
      planSearch(question),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (aiPlan?.searchQuery) plan = aiPlan;
  } catch {
    /* keep heuristic */
  }

  const loc = location || plan.location || undefined;

  const result = await searchTopic({
    q: plan.searchQuery,
    location: loc,
    language: 'en',
    page: 1,
    limit: 8,
    live: true,
  });

  const articles = result.items || [];
  let reply = fallbackReply(question, articles);
  try {
    const aiReply = await Promise.race([
      answerFromArticles(question, articles),
      new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
    ]);
    if (aiReply) reply = aiReply;
  } catch {
    /* keep fallback */
  }

  return {
    reply,
    articles,
    searchQuery: plan.searchQuery,
    location: loc || result.inferredLocation || null,
    liveFetched: result.liveFetched || 0,
    total: result.total || articles.length,
  };
}

module.exports = {
  chatAboutNews,
  planSearch,
};
