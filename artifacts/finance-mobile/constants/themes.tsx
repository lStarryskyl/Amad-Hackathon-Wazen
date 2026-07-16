import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ColorMode, BoldColors } from "./bold-tokens";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "wazen:theme";

type ColorPalette = typeof BoldColors[ColorMode];

interface BoldThemeContextType {
  mode: ColorMode;
  toggleTheme: () => void;
  setTheme: (mode: ColorMode) => void;
  colors: ColorPalette;
  isDark: boolean;
}

const BoldThemeContext = createContext<BoldThemeContextType | undefined>(undefined);

export function BoldProvider({ children }: { children: ReactNode }) {
  const systemMode = useColorScheme();
  const [mode, setMode] = useState<ColorMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored) {
          setMode(stored as ColorMode);
        } else if (systemMode) {
          setMode(systemMode);
        }
      } catch {
        if (systemMode) setMode(systemMode);
      } finally {
        setHydrated(true);
      }
    };
    loadTheme();
  }, [systemMode]);

  useEffect(() => {
    if (hydrated) {
      AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
    }
  }, [mode, hydrated]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((newMode: ColorMode) => {
    setMode(newMode);
  }, []);

  const colors = BoldColors[mode];

  if (!hydrated) {
    return null;
  }

  return (
    <BoldThemeContext.Provider value={{ mode, toggleTheme, setTheme, colors, isDark: mode === "dark" }}>
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

export function useBoldColors() {
  const { colors } = useBoldTheme();
  return colors;
}

export function useColorMode() {
  const { mode, toggleTheme, setTheme } = useBoldTheme();
  return { mode, toggleTheme, setTheme };
}