const { withAndroidManifest } = require("@expo/config-plugins");

// react-native's debug-only AndroidManifest declares
// android.permission.SYSTEM_ALERT_WINDOW for the in-app dev menu overlay.
// It should never end up in a release build; this plugin removes it
// explicitly during manifest merge regardless of which dependency
// introduces it.
const REMOVED_PERMISSION = "android.permission.SYSTEM_ALERT_WINDOW";

function withRemoveOverlayPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    if (!Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = [];
    }

    manifest["uses-permission"] = manifest["uses-permission"].filter(
      (entry) => entry.$["android:name"] !== REMOVED_PERMISSION
    );
    manifest["uses-permission"].push({
      $: {
        "android:name": REMOVED_PERMISSION,
        "tools:node": "remove",
      },
    });

    return config;
  });
}

module.exports = withRemoveOverlayPermission;
