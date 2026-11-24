'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function WorldPage() {
  const fetcher = useCallback(
    async (page, language) => {
      const locations = [
        'international',
        'united-states',
        'united-kingdom',
        'europe',
        'china',
        'russia',
      ];
      const results = await Promise.all(
        locations.map((loc) => api.byLocation(loc, { page: 1, limit: 8, language }))
      );
      const merged = results.flatMap((r) => r.data || []);
      merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      const start = (page - 1) * 15;
      return {
        data: merged.slice(start, start + 15),
        totalPages: Math.max(1, Math.ceil(merged.length / 15)),
      };
    },
    []
  );

  return (
    <NewsList
      title="International News"
      subtitle="World affairs and global headlines."
      fetcher={fetcher}
    />
  );
}
