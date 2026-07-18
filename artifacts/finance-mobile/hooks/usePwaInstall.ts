import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Captures the browser's `beforeinstallprompt` event so the app can trigger
 * the native "Install app" prompt from its own UI instead of relying on the
 * browser's address-bar icon. Web-only — native builds never fire this event.
 *
 * Chromium (Android/desktop) fires `beforeinstallprompt` and supports `prompt()`.
 * iOS Safari never fires it — there's no programmatic install API — so on iOS
 * `canInstall` stays false and callers should show manual "Add to Home Screen"
 * instructions instead.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    // Already running as an installed PWA (standalone display mode).
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome as "accepted" | "dismissed";
  }, [deferredPrompt]);

  const isIOS =
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  return {
    // True only when the browser has actually offered an installable prompt.
    canInstall: Platform.OS === "web" && !!deferredPrompt && !installed,
    // iOS Safari has no install API — show manual instructions instead.
    needsManualIOSInstall: Platform.OS === "web" && isIOS && !installed,
    installed,
    promptInstall,
  };
}
