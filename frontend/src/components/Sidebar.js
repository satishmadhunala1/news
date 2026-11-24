'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Globe2,
  Cpu,
  BriefcaseBusiness,
  Trophy,
  Clapperboard,
  Bookmark,
  Bell,
  Settings,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hyderabad', label: 'Hyderabad', icon: MapPin },
  { href: '/delhi', label: 'Delhi', icon: MapPin },
  { href: '/greater-noida', label: 'Greater Noida', icon: MapPin },
  { href: '/telangana', label: 'Telangana', icon: MapPin },
  { href: '/andhra-pradesh', label: 'Andhra Pradesh', icon: MapPin },
  { href: '/india', label: 'India', icon: MapPin },
  { href: '/world', label: 'International', icon: Globe2 },
  { href: '/technology', label: 'Technology', icon: Cpu },
  { href: '/business', label: 'Business', icon: BriefcaseBusiness },
  { href: '/sports', label: 'Sports', icon: Trophy },
  { href: '/entertainment', label: 'Entertainment', icon: Clapperboard },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-[rgba(16,42,46,0.28)] transition lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-[var(--border)] bg-[rgba(255,255,255,0.72)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[var(--border)] px-5 py-6">
          <div className="flex items-start justify-between gap-2">
            <Link href="/" onClick={onClose} className="block">
              <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none tracking-tight text-[var(--brand-ink)] transition hover:text-[var(--accent)]">
                Meridian
              </p>
              <p className="mt-2 text-xs tracking-wide text-[var(--muted)]">Your daily news desk</p>
            </Link>
            <button type="button" className="lg:hidden" onClick={onClose} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
        </div>
        <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200 ${
                      active
                        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--brand-ink)]'
                        : 'text-[var(--muted)] hover:bg-white/70 hover:text-[var(--brand-ink)]'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={active ? 'text-[var(--accent)]' : 'text-[var(--muted)] group-hover:text-[var(--accent)]'}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-[var(--border)] px-5 py-4 text-xs text-[var(--muted)]">
          Fresh every 30 minutes
        </div>
      </aside>
    </>
  );
}
