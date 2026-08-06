const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Bundled SRD rules data ships as .srddata (renamed from .json) so Metro
// treats it as an opaque binary asset instead of parsing it into the JS
// bundle — these files are several MB each and are only ever read on-demand
// via expo-file-system, not imported as JS objects.
config.resolver.assetExts.push("srddata", "wasm");

// expo-sqlite's web worker uses SharedArrayBuffer. These headers are required
// by browsers for the local preview server to expose it.
config.server.enhanceMiddleware = (middleware) => {
  return (request, response, next) => {
    response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    return middleware(request, response, next);
  };
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
