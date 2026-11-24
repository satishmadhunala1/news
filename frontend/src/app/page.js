'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate } from '@/lib/api';
import { NewsCard } from '@/components/NewsCard';
import { NewsSkeleton } from '@/components/NewsSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

const REGION_LINKS = [
  ['Hyderabad', '/hyderabad'],
  ['Delhi', '/delhi'],
  ['Greater Noida', '/greater-noida'],
  ['Telangana', '/telangana'],
  ['Andhra Pradesh', '/andhra-pradesh'],
  ['India', '/india'],
  ['World', '/world'],
  ['Entertainment', '/entertainment'],
  ['Technology', '/technology'],
  ['Business', '/business'],
  ['Sports', '/sports'],
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.dashboard({ language: 'en' });
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBookmark(article) {
    const res = await api.bookmark(article._id);
    setData((prev) => ({
      ...prev,
      latest: prev.latest.map((a) =>
        a._id === article._id ? { ...a, bookmarked: res.data.bookmarked } : a
      ),
      important: prev.important.map((a) =>
        a._id === article._id ? { ...a, bookmarked: res.data.bookmarked } : a
      ),
    }));
  }

  return (
    <div className="animate-fade space-y-6">
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {/* Brand left + 3 stats right, same row on large screens */}
      <section className="animate-rise grid items-end gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] lg:gap-8">
        <header className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            Today&apos;s briefing
          </p>
          <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight text-[var(--brand-ink)] sm:text-5xl">
            <Link href="/" className="transition hover:text-[var(--accent)]">
              Meridian
            </Link>
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
            A calm desk for the stories that matter across your cities.
          </p>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Updated {data?.lastUpdated ? formatDate(data.lastUpdated) : '—'}
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="New today" value={data?.todayCount ?? '—'} />
          <Stat label="In library" value={data?.total ?? '—'} />
          <Stat label="Top stories" value={data?.important?.length ?? '—'} />
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {REGION_LINKS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-[var(--border)] bg-white/70 px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--brand-ink)]"
          >
            {label}
          </Link>
        ))}
      </section>

      {loading ? <NewsSkeleton count={6} /> : null}

      {!loading && data ? (
        <>
          <section className="animate-rise" style={{ animationDelay: '0.05s' }}>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-ink)] sm:text-3xl">
              Top stories
            </h2>
            {data.important?.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.important.map((article, index) => (
                  <NewsCard
                    key={article._id}
                    article={article}
                    onBookmark={handleBookmark}
                    featured={index === 0}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No important stories yet"
                description="Run a news fetch from Settings."
              />
            )}
          </section>

          <section className="animate-rise" style={{ animationDelay: '0.1s' }}>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-ink)] sm:text-3xl">
              Latest headlines
            </h2>
            {data.latest?.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.latest.map((article) => (
                  <NewsCard
                    key={`latest-${article._id}`}
                    article={article}
                    onBookmark={handleBookmark}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No headlines yet" description="Fetch news to fill the desk." />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-3 sm:px-4 sm:py-3.5"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <p className="text-[10px] tracking-wide text-[var(--muted)] uppercase sm:text-xs">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-ink)] sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
