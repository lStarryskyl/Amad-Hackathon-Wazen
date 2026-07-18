import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Root HTML shell for Expo Router's static web export (`expo export -p web`).
 * This file is NOT used at runtime for native — only for the exported web build.
 * It wires up PWA installability: manifest, theme color, iOS home-screen meta
 * tags, and the service worker registration.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="description" content="Wazen — AI-powered financial balance." />

        {/* PWA manifest + theming */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="shortcut icon" href="/icon-192.png" />

        {/* iOS "add to home screen" support — Safari ignores manifest.json */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Wazen" />
        <link rel="apple-touch-icon" href="/icon-180.png" />

        {/*
          Disabling body scroll on web makes ScrollView / FlatList work closer
          to how they work on native — the shared Expo Router default.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: swRegistrationScript }} />
      </body>
    </html>
  );
}

const responsiveBackground = `
  body { background-color: #F6F7FB; }
  @media (prefers-color-scheme: dark) { body { background-color: #0B0D14; } }
`;

// Registered as a plain inline script (not a module import) so it runs even
// if the app bundle throws during hydration — install prompts still show up.
const swRegistrationScript = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
`;
