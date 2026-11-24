'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { LanguageSwitch } from './LanguageSwitch';
import { LanguageProvider } from '@/context/LanguageContext';
import { Menu } from 'lucide-react';

export function AppShell({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <LanguageProvider>
      <div className="min-h-screen text-[var(--foreground)]">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="rounded-md border border-[var(--border)] p-2 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={18} />
                </button>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-none">
                    News Assistant
                  </p>
                  <p className="mt-1 hidden text-xs text-[var(--muted)] sm:block">
                    Hyderabad · Delhi · Greater Noida · Telangana · Andhra · India · World
                  </p>
                </div>
              </div>
              <LanguageSwitch />
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
}
