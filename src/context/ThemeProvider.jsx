import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from './ThemeContext';

export const ThemeProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const isRtl = i18n.language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    if (isRtl) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [i18n.language]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const themeClasses = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900';

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, themeClasses }}>
      {children}
    </ThemeContext.Provider>
  );
};
