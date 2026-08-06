import { Pressable, Text } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";

export function PrimaryButton({
  label,
  icon = "add",
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: AppIconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 active:bg-accent-bright disabled:opacity-40"
    >
      <AppIcon name={icon} size={19} color={Colors.accentForeground} />
      <Text className="text-sm font-bold text-accent-foreground">{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: AppIconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-panel-border bg-panel-raised px-4 py-3 active:bg-white/5 disabled:opacity-40"
    >
      <AppIcon name={icon} size={18} color={Colors.accentBright} />
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}
