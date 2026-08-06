import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";

export function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: AppIconName;
  children: ReactNode;
}) {
  return (
    <View className="gap-4 rounded-3xl border border-panel-border bg-panel p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
          <AppIcon name={icon} size={20} color={Colors.accentBright} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{title}</Text>
          {description ? <Text className="mt-0.5 text-xs leading-4 text-muted">{description}</Text> : null}
        </View>
      </View>
      <View className="gap-4">{children}</View>
    </View>
  );
}
