---
name: Clerk Expo v2 auth API + loadClerkUiScript crash fix
description: Correct @clerk/expo@2.x / @clerk/react@5.x API and Metro shim needed for React Native
---

## loadClerkUiScript crash (Metro shim required)

`@clerk/expo@2.19.0` depends on `@clerk/react@^5.54.0`. On native platforms Metro resolves
`@clerk/shared/loadClerkJsScript` to the headless RN build which does NOT export `loadClerkUiScript`.
`@clerk/react@5.x` still calls it unconditionally, causing a runtime crash:

```
TypeError: import_loadClerkJsScript.loadClerkUiScript is not a function (it is undefined)
```

**Fix:** add a Metro `resolveRequest` hook in `metro.config.js` that redirects the import to a
no-op shim file (`metro-clerk-shim.js`) for any platform other than "web".

```js
// metro.config.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName.endsWith("/loadClerkJsScript")) {
    return { filePath: path.resolve(__dirname, "metro-clerk-shim.js"), type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

The shim exports `{ loadClerkJsScript: async()=>{}, loadClerkUiScript: async()=>{}, setClerkJsLoadingErrorPackageName: ()=>{} }`.

## Correct @clerk/react@5.x / @clerk/expo@2.x API

`useSignUp()` returns `{ isLoaded, signUp, setActive }` — NO `errors`, NO `fetchStatus`.
`useSignIn()` returns `{ isLoaded, signIn, setActive }` — same.

**Sign Up:**
```js
await signUp.create({ emailAddress, password });
await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
// later:
const result = await signUp.attemptEmailAddressVerification({ code });
if (result.status === "complete") {
  await setActive({ session: result.createdSessionId });
  router.replace("/onboarding");
}
```

**Sign In:**
```js
const result = await signIn.create({ identifier: emailAddress, password });
if (result.status === "complete") {
  await setActive({ session: result.createdSessionId });
  router.replace("/(home)/(tabs)");
} else if (result.status === "needs_second_factor") {
  await signIn.prepareSecondFactor({ strategy: "email_code" });
  // then:
  const r2 = await signIn.attemptSecondFactor({ strategy: "email_code", code });
  if (r2.status === "complete") await setActive({ session: r2.createdSessionId });
}
```

**Error extraction pattern (errors come from thrown exceptions only):**
```js
const errs = err?.errors;
const msg = Array.isArray(errs) ? (errs[0]?.longMessage || errs[0]?.message) : err?.message;
```

**Why:** The legacy API (`.password()`, `.verifications.sendEmailCode()`, `.mfa.sendEmailCode()`,
`.finalize()`, `.reset()`) was never valid in @clerk/react@5.x. These method calls throw at runtime.
The correct API is `create()` → `prepareEmailAddressVerification()` → `attemptEmailAddressVerification()`.
