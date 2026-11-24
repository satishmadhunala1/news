'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate } from '@/lib/api';
import { NewsCard } from '@/components/NewsCard';
import { NewsSkeleton } from '@/components/NewsSkeleton';
import { SearchBar } from '@/components/SearchBar';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage } from '@/context/LanguageContext';

const REGION_LINKS = [
  ['Hyderabad', '/hyderabad'],
  ['Telangana', '/telangana'],
  ['Andhra Pradesh', '/andhra-pradesh'],
  ['India', '/india'],
  ['International', '/world'],
  ['Entertainment', '/entertainment'],
  ['Technology', '/technology'],
  ['Business', '/business'],
  ['Sports', '/sports'],
];

export default function DashboardPage() {
  const { language } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.dashboard({ language });
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [language]);

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

  const isTe = language === 'te';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-[#666] uppercase">
            {isTe ? 'నేటి బ్రీఫింగ్' : "Today's briefing"}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[#111] sm:text-5xl">
            {isTe ? 'వార్తా డ్యాష్‌బోర్డ్' : 'Dashboard'}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            {isTe ? 'చివరి అప్‌డేట్' : 'Last updated'}:{' '}
            {data?.lastUpdated ? formatDate(data.lastUpdated) : '—'}
          </p>
        </div>
        <SearchBar />
      </header>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={isTe ? 'నేటి కొత్త వార్తలు' : 'New articles today'} value={data?.todayCount ?? '—'} />
        <Stat label={isTe ? 'మొత్తం లైబ్రరీ' : 'Total in library'} value={data?.total ?? '—'} />
        <Stat label={isTe ? 'ముఖ్యమైన కథనాలు' : 'Important stories'} value={data?.important?.length ?? '—'} />
      </section>

      <section className="flex flex-wrap gap-2">
        {REGION_LINKS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            {label}
          </Link>
        ))}
      </section>

      {loading ? <NewsSkeleton count={6} /> : null}

      {!loading && data ? (
        <>
          <section>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {isTe ? 'ముఖ్యమైన కథనాలు' : 'Top important stories'}
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
                title={isTe ? 'ముఖ్య వార్తలు లేవు' : 'No important stories yet'}
                description={isTe ? 'Settingsలో news fetch చేయండి.' : 'Run a news fetch from Settings.'}
              />
            )}
          </section>

          <section>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {isTe ? 'తాజా హెడ్‌లైన్స్' : 'Latest headlines'}
            </h2>
            {data.latest?.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.latest.map((article) => (
                  <NewsCard key={`latest-${article._id}`} article={article} onBookmark={handleBookmark} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={isTe ? 'హెడ్‌లైన్స్ లేవు' : 'No headlines yet'}
                description={isTe ? 'మొదట news fetch చేయండి.' : 'Fetch news to fill the showcase.'}
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5 shadow-sm">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[#111]">
        {value}
      </p>
    </div>
  );
}
