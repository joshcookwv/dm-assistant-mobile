import { Pressable, Text, View } from "react-native";

export function EntityListItem({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border-b border-panel-border/50 px-4 py-3 active:bg-white/5"
    >
      <Text className="font-medium text-foreground">{title}</Text>
      {!!subtitle && <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text>}
    </Pressable>
  );
}

export function EntityListEmpty({ label }: { label: string }) {
  return (
    <View className="p-6">
      <Text className="text-center text-sm text-muted">{label}</Text>
    </View>
  );
}
