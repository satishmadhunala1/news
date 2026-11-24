'use client';

import { createContext, useContext, useMemo } from 'react';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
});

/** App is English-only; context kept so existing hooks keep working. */
export function LanguageProvider({ children }) {
  const value = useMemo(
    () => ({
      language: 'en',
      setLanguage: () => {},
    }),
    []
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
