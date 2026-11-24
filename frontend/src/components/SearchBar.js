'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({ initial = '' }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function onSubmit(e) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-md">
      <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search headlines…"
        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[var(--accent)]"
      />
    </form>
  );
}
