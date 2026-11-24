'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function SavedPage() {
  const fetcher = useCallback(async (_page, language) => {
    const res = await api.saved({ language });
    return { data: res.data || [], totalPages: 1 };
  }, []);

  return (
    <NewsList
      title="Saved News"
      subtitle="Articles you bookmarked for later."
      fetcher={fetcher}
    />
  );
}
