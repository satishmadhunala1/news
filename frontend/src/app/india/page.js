'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function IndiaPage() {
  const fetcher = useCallback(
    (page, language) => api.byLocation('india', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="India News"
      subtitle="National headlines from across India."
      fetcher={fetcher}
    />
  );
}
