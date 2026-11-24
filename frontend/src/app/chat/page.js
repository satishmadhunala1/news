'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Send } from 'lucide-react';
import { api, labelize } from '@/lib/api';
import { NewsCard } from '@/components/NewsCard';
import { ErrorState } from '@/components/ErrorState';
import { NewsSkeleton } from '@/components/NewsSkeleton';
import { SEARCH_LOCATIONS } from '@/lib/locations';

function ChatInner() {
  const params = useSearchParams();
  const seed = params.get('q') || '';
  const [input, setInput] = useState(seed);
  const [location, setLocation] = useState('');
  const [messages, setMessages] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const askedSeed = useRef('');

  const ask = useCallback(async (question, loc = location) => {
    const text = String(question || '').trim();
    if (!text || loading) return;

    setError('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');

    try {
      const res = await api.chat(text, loc || undefined);
      const data = res.data || {};
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'No answer returned.',
          meta: {
            searchQuery: data.searchQuery,
            location: data.location,
            liveFetched: data.liveFetched,
            total: data.total,
          },
        },
      ]);
      setArticles(data.articles || []);
    } catch (err) {
      setError(err.message || 'Chat failed');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry — I could not fetch that right now. Try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, location]);

  useEffect(() => {
    if (!seed || askedSeed.current === seed) return;
    askedSeed.current = seed;
    ask(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleBookmark(article) {
    try {
      const res = await api.bookmark(article._id);
      setArticles((prev) =>
        prev.map((item) => (item._id === article._id ? { ...item, bookmarked: res.data.bookmarked } : item))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(input, location);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-5 animate-fade">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
          News chat
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--brand-ink)]">
          Ask Meridian
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Ask about any story. Meridian searches your library, fetches fresh coverage if needed, and answers.
        </p>
      </header>

      {error ? <ErrorState message={error} /> : null}

      <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white/80">
        <div className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-[var(--muted)]">
              <MessageCircle size={28} className="text-[var(--accent)]" />
              <p className="text-sm">Try: “CM Yogi Sharda University update” or “Delhi AQI today”</p>
            </div>
          ) : null}

          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap sm:max-w-[80%] ${
                  m.role === 'user'
                    ? 'bg-[var(--brand-ink)] text-white'
                    : 'border border-[var(--border)] bg-[var(--chip)] text-[var(--brand-ink)]'
                }`}
              >
                {m.text}
                {m.meta?.searchQuery ? (
                  <p className="mt-2 text-[11px] opacity-70">
                    Searched “{m.meta.searchQuery}”
                    {m.meta.location ? ` · ${labelize(m.meta.location)}` : ''}
                    {m.meta.liveFetched ? ` · fetched ${m.meta.liveFetched} new` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--chip)] px-3.5 py-2.5 text-sm text-[var(--muted)]">
                Looking up the latest…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 border-t border-[var(--border)] bg-white/90 p-3 sm:flex-row sm:items-center"
        >
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-2.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] sm:max-w-[11rem]"
            aria-label="Optional location"
          >
            {SEARCH_LOCATIONS.map((loc) => (
              <option key={loc.id || 'all'} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-0 flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a news question…"
              disabled={loading}
              className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pr-3 pl-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
          >
            <Send size={15} />
            Send
          </button>
        </form>
      </div>

      {loading && !articles.length ? <NewsSkeleton count={3} /> : null}

      {articles.length ? (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-ink)]">
            Related stories
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <NewsCard key={article._id || article.url} article={article} onBookmark={handleBookmark} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Opening chat…</p>}>
      <ChatInner />
    </Suspense>
  );
}
