'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, labelize } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';
import { NewsCard } from '@/components/NewsCard';
import { NewsSkeleton } from '@/components/NewsSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useLanguage } from '@/context/LanguageContext';

function SearchInner() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const location = params.get('location') || '';
  const { language } = useLanguage();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ total: 0, liveFetched: 0, inferredLocation: null });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(
    async (nextPage = 1) => {
      if (!q.trim()) {
        setItems([]);
        setMeta({ total: 0, liveFetched: 0, inferredLocation: null });
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await api.search(q, {
          page: nextPage,
          limit: 15,
          language,
          ...(location ? { location } : {}),
          live: nextPage === 1 ? 'true' : 'false',
        });
        const list = data.data || [];
        setItems((prev) => (nextPage === 1 ? list : [...prev, ...list]));
        setPage(nextPage);
        setTotalPages(data.totalPages || 1);
        setMeta({
          total: data.total || 0,
          liveFetched: data.liveFetched || 0,
          inferredLocation: data.inferredLocation || null,
        });
      } catch (err) {
        setError(err.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [q, location, language]
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

  const placeHint = location || meta.inferredLocation;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--brand-ink)] sm:text-5xl">
          {q ? `Results for “${q}”` : 'Search'}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Find any story. Missing items are fetched live. Use the place filter when you know the region.
        </p>
      </header>

      <SearchBar key={`${q}|${location}`} initial={q} initialLocation={location} />

      {q ? (
        <p className="text-sm text-[var(--muted)]">
          {meta.total} match{meta.total === 1 ? '' : 'es'}
          {placeHint ? ` · place: ${labelize(placeHint)}` : ''}
          {meta.liveFetched > 0 ? ` · fetched ${meta.liveFetched} new from the web` : ''}
        </p>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => load(1)} /> : null}
      {loading && page === 1 ? <NewsSkeleton count={6} /> : null}

      {!loading && q && !items.length && !error ? (
        <EmptyState
          title="No matching stories"
          description="Try different words, clear the location filter, or search again in a few minutes."
        />
      ) : null}

      {items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((article) => (
            <NewsCard key={article._id} article={article} onBookmark={handleBookmark} />
          ))}
        </div>
      ) : null}

      {!loading && page < totalPages ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => load(page + 1)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:border-[var(--brand)]"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading search…</p>}>
      <SearchInner />
    </Suspense>
  );
}
