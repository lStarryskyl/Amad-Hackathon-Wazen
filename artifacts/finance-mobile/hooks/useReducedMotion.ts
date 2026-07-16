import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const checkReducedMotion = async () => {
      const enabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReducedMotion(enabled);
    };

    checkReducedMotion();

    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => listener.remove();
  }, []);

  return reducedMotion;
}