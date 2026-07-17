/**
 * No-op shim for @clerk/shared/loadClerkJsScript on native platforms.
 *
 * @clerk/react@5.x calls loadClerkUiScript() then immediately checks
 * global.__unstable_ClerkUiCtor. In React Native (headless mode) neither
 * the UI script nor the global exist, so Clerk throws:
 *   "Failed to download latest Clerk UI. Contact support@clerk.com."
 * …and isLoaded never becomes true, permanently disabling auth buttons.
 *
 * Fix: resolve loadClerkUiScript immediately AND seed the global so the
 * check passes. The headless Clerk instance handles all actual auth — we
 * never need Clerk's hosted UI components.
 */
module.exports = {
  loadClerkJsScript: async () => {},

  loadClerkUiScript: async () => {
    // Clerk checks global.__unstable_ClerkUiCtor immediately after this
    // promise resolves. Provide a no-op constructor so it doesn't throw.
    if (typeof global !== "undefined" && !global.__unstable_ClerkUiCtor) {
      global.__unstable_ClerkUiCtor = function NoopClerkUI() {};
    }
  },

  setClerkJsLoadingErrorPackageName: () => {},
};
