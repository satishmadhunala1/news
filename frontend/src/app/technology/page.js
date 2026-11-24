'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { NewsList } from '@/components/NewsList';

export default function TechnologyPage() {
  const fetcher = useCallback(
    (page, language) => api.byCategory('technology-ai', { page, limit: 15, language }),
    []
  );
  return (
    <NewsList
      title="Technology and AI"
      subtitle="Tech products, AI, and digital innovation."
      fetcher={fetcher}
    />
  );
}
