import { ActivityIndicator, Pressable, Text } from "react-native";
import { router, usePathname } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { useProAccess } from "@/providers/pro-access";

export function ProAiButton({
  label = "Generate",
  loadingLabel = "Thinking...",
  loading,
  disabled,
  onPress,
}: {
  label?: string;
  loadingLabel?: string;
  loading: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { isPro, loading: accessLoading } = useProAccess();
  const pathname = usePathname();
  const isDisabled = loading || accessLoading || disabled;

  return (
    <Pressable
      onPress={() =>
        isPro ? onPress() : router.push({ pathname: "/pro", params: { returnTo: pathname } })
      }
      disabled={isDisabled}
      hitSlop={6}
      className={`flex-row items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator size={12} color={Colors.accentBright} />
      ) : (
        <AppIcon name="sparkles" size={13} color={Colors.accentBright} />
      )}
      <Text className="text-xs font-semibold text-accent-bright">
        {loading ? loadingLabel : isPro ? label : `${label} · Pro`}
      </Text>
    </Pressable>
  );
}
