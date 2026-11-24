'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { SearchBar } from './SearchBar';
import { ChatAskBar } from './ChatAskBar';
import { FloatingNewsBot } from './FloatingNewsBot';
import { LanguageProvider } from '@/context/LanguageContext';
import { Menu } from 'lucide-react';

export function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('search'); // search | ask

  return (
    <LanguageProvider>
      <div className="min-h-screen text-[var(--foreground)]">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="lg:pl-[17.5rem]">
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(238,244,245,0.78)] backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="rounded-lg border border-[var(--border)] bg-white/80 p-2 lg:hidden"
                    aria-label="Open menu"
                  >
                    <Menu size={18} />
                  </button>
                  <Link
                    href="/"
                    className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-tight text-[var(--brand-ink)] transition hover:text-[var(--accent)] lg:hidden"
                  >
                    Meridian
                  </Link>
                </div>
                <div className="inline-flex rounded-xl border border-[var(--border)] bg-white/80 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMode('search')}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      mode === 'search'
                        ? 'bg-[var(--brand-ink)] text-white'
                        : 'text-[var(--muted)] hover:text-[var(--brand-ink)]'
                    }`}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('ask')}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      mode === 'ask'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--muted)] hover:text-[var(--brand-ink)]'
                    }`}
                  >
                    Ask
                  </button>
                </div>
              </div>
              <div className="min-w-0 w-full">
                {mode === 'search' ? <SearchBar compact /> : <ChatAskBar compact />}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</main>
        </div>
        <FloatingNewsBot />
      </div>
    </LanguageProvider>
  );
}
