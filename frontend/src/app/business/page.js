'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function BusinessPage() {
  const fetcher = useCallback(
    (page, language) => api.byCategory('business-economy', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Business"
      subtitle="Markets, economy, and company news."
      fetcher={fetcher}
    />
  );
}
