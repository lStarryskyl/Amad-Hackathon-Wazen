/**
 * Convenience hook — returns the active theme's colour tokens.
 * Reads from ThemeContext so it always reflects the user's light/dark choice.
 */
import { useTheme } from "@/contexts/ThemeContext";

export function useColors() {
  return useTheme().colors;
}
