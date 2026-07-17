const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Preserve any existing resolveRequest (e.g. set by expo/metro-config)
const originalResolveRequest = config.resolver?.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On NATIVE: @clerk/react@5.54.0 tries to inject a CDN <script> tag via
  // loadClerkJsScript (browser-only), and checks global.__unstable_ClerkUiCtor
  // after loadClerkUiScript resolves. Neither works in React Native.
  // Use a no-op shim instead — the headless Clerk instance (passed via the Clerk
  // prop by @clerk/expo) handles actual auth without needing these web loaders.
  //
  // On WEB: use the real @clerk/shared module so Clerk.js loads from CDN normally.
  // The @clerk/shared@3.47.8 node_modules patch adds loadClerkUiScript as a no-op
  // so the post-load global check passes without needing the CDN UI bundle.
  if (
    platform !== "web" &&
    (moduleName === "@clerk/shared/loadClerkJsScript" ||
      moduleName.endsWith("/loadClerkJsScript"))
  ) {
    return {
      filePath: path.resolve(__dirname, "metro-clerk-shim.js"),
      type: "sourceFile",
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
