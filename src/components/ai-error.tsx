import { Text } from "react-native";
import { router } from "expo-router";

/**
 * Error line for a failed AI call. Auto-adds a tappable "Go to Settings"
 * link whenever the message mentions "Settings" — covers both the
 * personal-key-not-set message and the AI proxy Worker's 429 rate-limit
 * message ("...or add your own API key in Settings for unlimited use."),
 * giving a rate-limited user a one-tap path to the fix in both cases with
 * no special-casing needed here.
 */
export function AiError({ message }: { message: string }) {
  const hasSettingsHint = message.includes("Settings");
  return (
    <Text className="mt-1 text-sm text-red-400">
      {message}{" "}
      {hasSettingsHint && (
        <Text className="underline" onPress={() => router.push("/settings")}>
          Go to Settings
        </Text>
      )}
    </Text>
  );
}
