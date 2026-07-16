import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useReducedMotion } from "./useReducedMotion";

export function useBoldHaptics() {
  const reducedMotion = useReducedMotion();

  const lightImpact = useCallback(() => {
    if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reducedMotion]);

  const mediumImpact = useCallback(() => {
    if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [reducedMotion]);

  const heavyImpact = useCallback(() => {
    if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [reducedMotion]);

  const selectionChanged = useCallback(() => {
    if (!reducedMotion) Haptics.selectionAsync();
  }, [reducedMotion]);

  const notificationSuccess = useCallback(() => {
    if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [reducedMotion]);

  const notificationWarning = useCallback(() => {
    if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [reducedMotion]);

  const notificationError = useCallback(() => {
    if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [reducedMotion]);

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    selectionChanged,
    notificationSuccess,
    notificationWarning,
    notificationError,
  };
}