const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Preserve any existing resolveRequest (e.g. set by expo/metro-config)
const originalResolveRequest = config.resolver?.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @clerk/react@5.x imports loadClerkUiScript from @clerk/shared/loadClerkJsScript
  // to inject the Clerk frontend UI bundle via a <script> tag.  On native platforms
  // this function doesn't exist (the headless RN build omits it), causing a crash.
  // Redirect the import to a no-op shim so Clerk works in Expo Go / dev builds.
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
