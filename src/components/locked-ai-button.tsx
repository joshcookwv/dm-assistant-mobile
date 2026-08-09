import { ActivityIndicator, Pressable, Text } from "react-native";
import { router } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";

/**
 * For genuinely Premium-gated AI features (campaign recap, session summary,
 * link suggestions) — visually matches the free NPC generator's
 * AiSuggestButton, but routes to the paywall instead of firing when the
 * caller isn't entitled. Don't use this for the NPC generator itself: that
 * works on both tiers (BYO key on free, bundled on Premium), so it's never
 * actually locked — see npcs/[id].tsx.
 */
export function LockedAiButton({
  isPremium,
  loading,
  disabled,
  label = "Suggest",
  onPress,
}: {
  isPremium: boolean;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  onPress: () => void;
}) {
  if (!isPremium) {
    return (
      <Pressable
        onPress={() => router.push("/paywall")}
        hitSlop={6}
        className="flex-row items-center gap-1.5 rounded-full bg-panel-raised px-2.5 py-1"
      >
        <AppIcon name="lock" size={12} color={Colors.muted} />
        <Text className="text-xs font-semibold text-muted">Premium</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      hitSlop={6}
      className={`flex-row items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 ${loading || disabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator size={12} color={Colors.accentBright} />
      ) : (
        <AppIcon name="sparkles" size={13} color={Colors.accentBright} />
      )}
      <Text className="text-xs font-semibold text-accent-bright">{loading ? "Thinking..." : label}</Text>
    </Pressable>
  );
}
