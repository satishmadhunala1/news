'use client';

import { useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';
import { SearchBar } from '@/components/SearchBar';

function SearchInner() {
  const params = useSearchParams();
  const q = params.get('q') || '';

  const fetcher = useCallback(
    (page, language) => api.search(q, { page, limit: 15, language }),
    [q]
  );

  return (
    <div className="space-y-4">
      <SearchBar initial={q} />
      <NewsList
        title={q ? `Results for “${q}”` : 'Search'}
        subtitle="Search by headline, summary, or publisher."
        fetcher={fetcher}
      />
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
