'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function SportsPage() {
  const fetcher = useCallback(
    async (page, language) => {
      const [sports, cricket] = await Promise.all([
        api.byCategory('sports', { page, limit: 10, language }),
        api.byCategory('cricket', { page, limit: 10, language }),
      ]);
      const merged = [...(sports.data || []), ...(cricket.data || [])];
      merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      return { data: merged, totalPages: 1 };
    },
    []
  );

  return (
    <NewsList
      title="Sports"
      subtitle="Sports and cricket coverage."
      fetcher={fetcher}
    />
  );
}
