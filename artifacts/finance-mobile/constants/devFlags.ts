/**
 * Dev-only feature flags.
 * Flip DEV_BYPASS_AUTH to true to skip Clerk entirely and jump straight
 * into the app — useful when testing screens that have nothing to do with auth.
 *
 * Set back to false before any real testing of sign-in / sign-up.
 */
export const DEV_BYPASS_AUTH = true;
