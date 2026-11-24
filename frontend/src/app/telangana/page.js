'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function TelanganaPage() {
  const fetcher = useCallback(
    (page, language) => api.byLocation('telangana', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Telangana News"
      subtitle="Telangana state updates across English and Telugu sources."
      fetcher={fetcher}
    />
  );
}
