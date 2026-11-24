'use client';

import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ChatAskBar({ initial = '', compact = false }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function onSubmit(e) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    router.push(`/chat?q=${encodeURIComponent(value)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full items-center gap-2 ${compact ? '' : 'max-w-2xl'}`}
    >
      <div className="relative min-w-0 flex-1">
        <MessageCircle
          size={16}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--accent)]"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Ask about news… e.g. "What is happening in Delhi air quality?"'
          className="w-full rounded-xl border border-[var(--border)] bg-white/85 py-2.5 pr-3 pl-10 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          aria-label="Ask about news"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)]"
      >
        Ask
      </button>
    </form>
  );
}
