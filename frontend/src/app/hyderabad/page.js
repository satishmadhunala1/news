'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function HyderabadPage() {
  const fetcher = useCallback(
    (page, language) => api.byLocation('hyderabad', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Hyderabad News"
      subtitle="Local Hyderabad stories with image showcase cards."
      fetcher={fetcher}
    />
  );
}
