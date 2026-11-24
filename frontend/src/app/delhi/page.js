'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function DelhiPage() {
  const fetcher = useCallback(
    (page, language) => api.byLocation('delhi', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Delhi News"
      subtitle="Capital-region stories from Delhi and New Delhi."
      fetcher={fetcher}
    />
  );
}
