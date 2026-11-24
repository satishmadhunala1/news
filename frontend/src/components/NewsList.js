'use client';

import { useCallback, useEffect, useState } from 'react';
import { NewsCard } from './NewsCard';
import { NewsSkeleton } from './NewsSkeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export function NewsList({ fetcher, title, subtitle }) {
  const { language } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError('');
      try {
        const data = await fetcher(nextPage, language);
        const list = data.data || data || [];
        setItems((prev) => (nextPage === 1 ? list : [...prev, ...list]));
        setPage(nextPage);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        setError(err.message || 'Failed to load news');
      } finally {
        setLoading(false);
      }
    },
    [fetcher, language]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  async function handleBookmark(article) {
    try {
      const res = await api.bookmark(article._id);
      setItems((prev) =>
        prev.map((item) => (item._id === article._id ? { ...item, bookmarked: res.data.bookmarked } : item))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="animate-fade">
      <header className="mb-7 max-w-2xl animate-rise">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--brand-ink)] sm:text-5xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-3 text-[var(--muted)]">{subtitle}</p> : null}
      </header>

      {error ? <ErrorState message={error} onRetry={() => load(page)} /> : null}
      {loading && items.length === 0 ? <NewsSkeleton count={6} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No articles yet" description="Fetch news from Settings to fill this section." />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((article, index) => (
          <NewsCard
            key={article._id}
            article={article}
            onBookmark={handleBookmark}
            featured={index === 0 && page === 1}
          />
        ))}
      </div>

      {page < totalPages ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => load(page + 1)}
            className="rounded-xl bg-[var(--brand-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent)] disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
