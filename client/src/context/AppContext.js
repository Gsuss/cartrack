import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations, getDefaultLanguage } from '../i18n/translations';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('cartrack_language');
    return saved || getDefaultLanguage();
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cartrack_theme');
    return saved || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('cartrack_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('cartrack_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = {
    language,
    setLanguage,
    theme,
    setTheme,
    toggleTheme,
    t
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
