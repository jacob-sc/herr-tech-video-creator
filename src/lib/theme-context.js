import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { applyTheme, resolveInitialTheme, writeThemeCookie } from './theme';

const ThemeContext = createContext({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = resolveInitialTheme();
    setThemeState(t);
    applyTheme(t);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    applyTheme(t);
    writeThemeCookie(t);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
