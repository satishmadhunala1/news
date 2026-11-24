'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function EntertainmentPage() {
  const fetcher = useCallback(
    (page, language) => api.byCategory('entertainment', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Entertainment"
      subtitle="Movies, celebrities, and culture."
      fetcher={fetcher}
    />
  );
}
