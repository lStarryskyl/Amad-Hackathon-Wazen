import { useBoldTheme } from "@/context/BoldThemeContext";

export function useBoldColors() {
  const { colors } = useBoldTheme();
  return colors;
}

export function useBoldColorMode() {
  const { colorMode, toggleTheme, setTheme } = useBoldTheme();
  return { colorMode, toggleTheme, setTheme };
}