import { Pressable, Text, View } from "react-native";

export function DeleteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-md border border-panel-border px-4 py-2.5 active:bg-red-500/10"
    >
      <Text className="text-sm text-red-400">Delete</Text>
    </Pressable>
  );
}

export function DeleteConfirmBar({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-sm text-muted">{label}</Text>
      <Pressable onPress={onConfirm} className="rounded-md bg-red-500/20 px-3 py-2 active:bg-red-500/30">
        <Text className="text-sm text-red-300">Confirm</Text>
      </Pressable>
      <Pressable onPress={onCancel} className="rounded-md border border-panel-border px-3 py-2 active:bg-white/5">
        <Text className="text-sm text-foreground/70">Cancel</Text>
      </Pressable>
    </View>
  );
}
