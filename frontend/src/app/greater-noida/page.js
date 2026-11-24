'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function GreaterNoidaPage() {
  const fetcher = useCallback(
    (page, language) => api.byLocation('greater-noida', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Greater Noida, Uttar Pradesh"
      subtitle="Local stories from Greater Noida and nearby Noida."
      fetcher={fetcher}
    />
  );
}
