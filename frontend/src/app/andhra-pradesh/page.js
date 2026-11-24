'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function AndhraPradeshPage() {
  const fetcher = useCallback(
    (page, language) => api.byLocation('andhra-pradesh', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Andhra Pradesh News"
      subtitle="State stories from Andhra Pradesh in English and Telugu."
      fetcher={fetcher}
    />
  );
}
