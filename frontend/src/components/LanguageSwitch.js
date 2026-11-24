'use client';

import { useLanguage } from '@/context/LanguageContext';

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="inline-flex rounded-full border border-[#e5e5e5] bg-white p-1"
      role="tablist"
      aria-label="Language"
    >
      <button
        type="button"
        role="tab"
        aria-selected={language === 'en'}
        onClick={() => setLanguage('en')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
          language === 'en' ? 'bg-[#1a1a1a] text-white' : 'text-[#666] hover:text-[#111]'
        }`}
      >
        English
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={language === 'te'}
        onClick={() => setLanguage('te')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
          language === 'te' ? 'bg-[#1a1a1a] text-white' : 'text-[#666] hover:text-[#111]'
        }`}
      >
        తెలుగు
      </button>
    </div>
  );
}
