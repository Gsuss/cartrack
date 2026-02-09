import React from 'react';
import { useApp } from '../context/AppContext';

function ThemeToggle() {
  const { theme, toggleTheme, t } = useApp();

  return (
    <button className="theme-toggle" onClick={toggleTheme} title={t(theme === 'dark' ? 'lightMode' : 'darkMode')}>
      {theme === 'dark' ? '☀️' : '🌙'}
      <span>{t(theme === 'dark' ? 'lightMode' : 'darkMode')}</span>
    </button>
  );
}

export default ThemeToggle;
