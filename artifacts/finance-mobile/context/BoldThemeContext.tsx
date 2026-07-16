import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BoldColors, ColorMode } from "../constants/bold-tokens";

type ColorPalette = typeof BoldColors[ColorMode];

interface BoldThemeContextValue {
  colorMode: ColorMode;
  colors: ColorPalette;
  toggleTheme: () => void;
  setTheme: (mode: ColorMode) => void;
}

const THEME_STORAGE_KEY = "wazen_theme_mode";

const BoldThemeContext = createContext<BoldThemeContextValue | null>(null);

export function BoldProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>("light");
  const [hydrated, setHydrated] = useState(false);

  const colors = BoldColors[colorMode];

  const loadTheme = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setColorMode(stored);
      } else {
        const systemScheme = Appearance.getColorScheme();
        setColorMode(systemScheme === "dark" ? "dark" : "light");
      }
    } catch {
      const systemScheme = Appearance.getColorScheme();
      setColorMode(systemScheme === "dark" ? "dark" : "light");
    } finally {
      setHydrated(true);
    }
  }, []);

  const saveTheme = useCallback(async (mode: ColorMode) => {
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setColorMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback(
    (mode: ColorMode) => {
      setColorMode(mode);
      saveTheme(mode);
    },
    [saveTheme]
  );

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    if (hydrated) {
      saveTheme(colorMode);
    }
  }, [colorMode, hydrated, saveTheme]);

  if (!hydrated) {
    return null;
  }

  return (
    <BoldThemeContext.Provider value={{ colorMode, colors, toggleTheme, setTheme }}>
      {children}
    </BoldThemeContext.Provider>
  );
}

export function useBoldTheme() {
  const context = useContext(BoldThemeContext);
  if (!context) {
    throw new Error("useBoldTheme must be used within a BoldProvider");
  }
  return context;
}