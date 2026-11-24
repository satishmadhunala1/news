'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SEARCH_LOCATIONS } from '@/lib/locations';

export function SearchBar({ initial = '', initialLocation = '', compact = false }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [location, setLocation] = useState(initialLocation);

  function onSubmit(e) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    const params = new URLSearchParams({ q: value });
    if (location) params.set('location', location);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full items-center gap-2 ${compact ? '' : 'max-w-2xl'}`}
    >
      <div className="relative min-w-0 flex-1">
        <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any story…"
          className="w-full rounded-xl border border-[var(--border)] bg-white/85 py-2.5 pr-3 pl-10 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          aria-label="Search news"
        />
      </div>
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="max-w-[9rem] shrink-0 rounded-xl border border-[var(--border)] bg-white/85 px-2.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] sm:max-w-[11rem]"
        aria-label="Filter by location"
      >
        {SEARCH_LOCATIONS.map((loc) => (
          <option key={loc.id || 'all'} value={loc.id}>
            {loc.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-[var(--brand-ink)] px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent)]"
      >
        Search
      </button>
    </form>
  );
}
