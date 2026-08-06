import { Pressable, Text, View } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";

export function EntityListItem({
  title,
  subtitle,
  icon,
  badge,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel px-3.5 py-3.5 active:bg-panel-raised"
    >
      {icon && (
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
          <AppIcon name={icon} size={21} color={Colors.accentBright} />
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-shrink font-semibold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {!!badge && (
            <View className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent-bright">
                {badge}
              </Text>
            </View>
          )}
        </View>
        {!!subtitle && <Text className="mt-1 text-xs leading-4 text-muted">{subtitle}</Text>}
      </View>
      <AppIcon name="chevronRight" size={18} color={Colors.subtle} />
    </Pressable>
  );
}

export function EntityListEmpty({
  label,
  detail,
  icon = "folder",
}: {
  label: string;
  detail?: string;
  icon?: AppIconName;
}) {
  return (
    <View className="mx-4 items-center rounded-3xl border border-dashed border-panel-border bg-panel/60 px-6 py-10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-panel-raised">
        <AppIcon name={icon} size={23} color={Colors.subtle} />
      </View>
      <Text className="text-center text-sm font-semibold text-foreground">{label}</Text>
      {!!detail && <Text className="mt-1.5 text-center text-xs leading-5 text-muted">{detail}</Text>}
    </View>
  );
}
