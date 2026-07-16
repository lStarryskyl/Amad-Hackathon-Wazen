---
name: Theme system — Slate + Teal, light-first
description: How the mobile app's theme/colour system works; where to change palette, how dark-mode toggle is wired.
---

# Mobile app theme system

## Architecture
- `artifacts/finance-mobile/constants/colors.ts` — exports `LightColors`, `DarkColors`, `ColorTokens` type, and a default export with both.
- `artifacts/finance-mobile/contexts/ThemeContext.tsx` — React context with `isDark`, `colors`, `toggleTheme()`. Persists choice in AsyncStorage under key `"wazen_theme"`. Default = **light mode**.
- `artifacts/finance-mobile/hooks/useColors.ts` — thin wrapper: `return useTheme().colors`. All screens use this hook.
- `artifacts/finance-mobile/app/_layout.tsx` — `<ThemeProvider>` wraps the app inside `<GestureHandlerRootView>`.

## Palette (Slate + Teal, Robinhood-meets-Fidelity)
| Token | Light | Dark |
|---|---|---|
| background | #F8FAFC (slate-50) | #0F172A (slate-900) |
| card | #FFFFFF | #1E293B (slate-800) |
| primary | #0D9488 (teal-600) | #14B8A6 (teal-500) |
| primaryForeground | #FFFFFF | #FFFFFF |
| accent | #059669 (emerald-600) | #10B981 (emerald-500) |
| danger | #DC2626 (red-600) | #F87171 (red-400) |
| text | #0F172A (slate-900) | #F1F5F9 (slate-100) |
| border | #E2E8F0 (slate-200) | #334155 (slate-700) |

## Dark-mode toggle
Wired in `profile.tsx` as a Switch calling `toggleTheme()` from `useTheme()`.
Tab bar blur tint reads `isDark` and passes `"dark"` or `"light"` to `<BlurView>`.

**Why:** User wanted light-first corporate aesthetic (Robinhood/Fidelity feel) with optional dark mode. Amber/orange consumer palette removed entirely.
**How to apply:** Any new screen/component — import `useColors()`, never hardcode hex. For text on primary bg, use `colors.primaryForeground` (always white — teal-600/500 both pass WCAG AA with white).
