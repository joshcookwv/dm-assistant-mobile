import { Pressable, Text } from "react-native";

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-9 items-center justify-center rounded-full border px-4 py-2 active:opacity-80 ${
        selected
          ? "border-accent/70 bg-accent-soft"
          : "border-panel-border bg-panel"
      }`}
    >
      <Text className={`text-xs font-bold ${selected ? "text-accent-bright" : "text-muted"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
