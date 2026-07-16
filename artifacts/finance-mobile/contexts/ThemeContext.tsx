/**
 * ThemeContext — light-first theme with persistent dark-mode toggle.
 *
 * • Default: light mode
 * • Persists the user's choice in AsyncStorage under the key "wazen_theme"
 * • Exposes `isDark` and `toggleTheme()` alongside the current `colors`
 *
 * Wrap the app root with <ThemeProvider> and consume via useTheme() or
 * the convenience hook useColors() (which just returns theme.colors).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkColors, LightColors, type ColorTokens } from "@/constants/colors";

const STORAGE_KEY = "wazen_theme";

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorTokens;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: LightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Restore persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "dark") setIsDark(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors: isDark ? DarkColors : LightColors,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
