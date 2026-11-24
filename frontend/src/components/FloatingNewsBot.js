'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { api, labelize } from '@/lib/api';
import { SEARCH_LOCATIONS } from '@/lib/locations';

export function FloatingNewsBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [location, setLocation] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi — ask me any news question. I’ll find stories and summarize what’s happening.',
    },
  ]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  async function ask(question) {
    const text = String(question || '').trim();
    if (!text || loading) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');

    try {
      const res = await api.chat(text, location || undefined);
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
          },
        },
      ]);
      setArticles((data.articles || []).slice(0, 4));
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err.message || 'Sorry — I could not fetch that right now.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div
          className="pointer-events-auto flex h-[min(34rem,78vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white/95 shadow-[0_12px_40px_rgba(16,42,46,0.18)] backdrop-blur-md animate-rise"
          role="dialog"
          aria-label="Meridian news chat"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[rgba(13,115,119,0.08)] px-4 py-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-xl leading-none text-[var(--brand-ink)]">
                Meridian
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">Ask about any news story</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-white hover:text-[var(--brand-ink)]"
                aria-label="Minimize chat"
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-white hover:text-[var(--brand-ink)]"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="scrollbar-none flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[var(--brand-ink)] text-white'
                      : 'border border-[var(--border)] bg-[var(--chip)] text-[var(--brand-ink)]'
                  }`}
                >
                  {m.text}
                  {m.meta?.searchQuery ? (
                    <p className="mt-1.5 text-[10px] opacity-70">
                      Searched “{m.meta.searchQuery}”
                      {m.meta.location ? ` · ${labelize(m.meta.location)}` : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-[13px] text-[var(--muted)]">
                  Looking up the latest…
                </div>
              </div>
            ) : null}

            {articles.length ? (
              <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white p-2">
                <p className="px-1 text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
                  Related stories
                </p>
                {articles.map((a) => (
                  <a
                    key={a._id || a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg px-2 py-1.5 transition hover:bg-[var(--chip)]"
                  >
                    <p className="line-clamp-2 text-xs font-medium text-[var(--brand-ink)]">{a.title}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {a.sourceName || 'Source'}
                      {a.location ? ` · ${labelize(a.location)}` : ''}
                    </p>
                  </a>
                ))}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-[var(--border)] bg-white p-2.5">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mb-2 w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              aria-label="Optional location"
            >
              {SEARCH_LOCATIONS.map((loc) => (
                <option key={loc.id || 'all'} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a news question…"
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_rgba(13,115,119,0.35)] transition hover:scale-105 hover:bg-[var(--brand-ink)]"
        aria-label={open ? 'Close Meridian chat' : 'Open Meridian chat'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
