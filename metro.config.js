const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Bundled SRD rules data ships as .srddata (renamed from .json) so Metro
// treats it as an opaque binary asset instead of parsing it into the JS
// bundle — these files are several MB each and are only ever read on-demand
// via expo-file-system, not imported as JS objects.
config.resolver.assetExts.push("srddata");

module.exports = withNativeWind(config, { input: "./src/global.css" });
