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
import { LanguageSwitch } from './LanguageSwitch';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hyderabad', label: 'Hyderabad', icon: MapPin },
  { href: '/delhi', label: 'Delhi', icon: MapPin },
  { href: '/greater-noida', label: 'Greater Noida, Uttar Pradesh', icon: MapPin },
  { href: '/telangana', label: 'Telangana', icon: MapPin },
  { href: '/andhra-pradesh', label: 'Andhra Pradesh', icon: MapPin },
  { href: '/india', label: 'India', icon: MapPin },
  { href: '/world', label: 'International', icon: Globe2 },
  { href: '/technology', label: 'Technology and AI', icon: Cpu },
  { href: '/business', label: 'Business', icon: BriefcaseBusiness },
  { href: '/sports', label: 'Sports', icon: Trophy },
  { href: '/entertainment', label: 'Entertainment', icon: Clapperboard },
  { href: '/saved', label: 'Saved News', icon: Bookmark },
  { href: '/notifications', label: 'Notification History', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                News Assistant
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Colorful visual briefing</p>
            </div>
            <button type="button" className="lg:hidden" onClick={onClose} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 lg:hidden">
            <LanguageSwitch />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-[#f0f0f0] font-semibold text-[#111]'
                        : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
