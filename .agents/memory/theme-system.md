---
name: Theme system — warm earthy palette, Lora + Outfit
description: How the mobile app's theme/colour/type system works; where to change palette, how dark-mode toggle is wired.
---

# Mobile app theme system

## Architecture (unchanged wiring)
- `artifacts/finance-mobile/constants/colors.ts` — exports `LightColors`, `DarkColors`, `ColorTokens` type.
- `artifacts/finance-mobile/contexts/ThemeContext.tsx` — `isDark`, `colors`, `toggleTheme()`; persisted in AsyncStorage key `"wazen_theme"`. Default = light.
- `artifacts/finance-mobile/hooks/useColors.ts` — `useTheme().colors`. All screens use this hook; never hardcode hex in screens.
- Dark-mode Switch lives in profile.tsx.

## Visual language (July 2026 redesign)
- Palette: warm earthy — eggshell backgrounds, deep pine primary, clay/terracotta accents; dark mode = deep charcoal + muted copper. Replaced the earlier slate+teal corporate palette.
- Typography: Lora (serif — headings, big numbers) + Outfit (sans — body, labels) via @expo-google-fonts/lora and @expo-google-fonts/outfit, loaded in app/_layout.tsx. Inter removed. Use fontFamily tokens, not fontWeight-only styling.
- Shapes: organic radii (24/32 cards, stadium buttons/pills), soft layered shadows instead of hard borders; generous 24/32 spacing rhythm.

**Why:** Team wanted the UI to feel hand-crafted, not AI-generated template.
**How to apply:** New screens must use useColors() + Lora/Outfit font families and match the organic radii/spacing rhythm; add new palette tokens to BOTH LightColors and DarkColors.
