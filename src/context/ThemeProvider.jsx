import React, { useState } from 'react';
import { ThemeContext } from './ThemeContext';

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

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
