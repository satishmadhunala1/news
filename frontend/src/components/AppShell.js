'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { SearchBar } from './SearchBar';
import { LanguageProvider } from '@/context/LanguageContext';
import { Menu } from 'lucide-react';

export function AppShell({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <LanguageProvider>
      <div className="min-h-screen text-[var(--foreground)]">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="lg:pl-[17.5rem]">
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(238,244,245,0.78)] backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="rounded-lg border border-[var(--border)] bg-white/80 p-2"
                  aria-label="Open menu"
                >
                  <Menu size={18} />
                </button>
                <Link
                  href="/"
                  className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-tight text-[var(--brand-ink)] transition hover:text-[var(--accent)]"
                >
                  Meridian
                </Link>
              </div>
              <div className="min-w-0 flex-1">
                <SearchBar compact />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
}
