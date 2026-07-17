/**
 * No-op shim for @clerk/shared/loadClerkJsScript on native platforms.
 *
 * @clerk/react@5.x calls loadClerkUiScript() to inject the Clerk frontend JS
 * bundle via a <script> tag.  That's a browser-only operation; the React Native
 * (headless) build of @clerk/shared does not export it.  Metro would resolve the
 * module but leave the export undefined, causing a runtime crash.
 *
 * This shim is injected by metro.config.js for non-web platforms so the import
 * resolves to safe no-ops instead of crashing.
 */
module.exports = {
  loadClerkJsScript: async () => {},
  loadClerkUiScript: async () => {},
  setClerkJsLoadingErrorPackageName: () => {},
};
