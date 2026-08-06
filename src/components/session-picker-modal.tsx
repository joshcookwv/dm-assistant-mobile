import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import type { SessionSummary } from "@/lib/session";

export function SessionPickerModal({
  visible,
  sessions,
  onClose,
  onSelect,
}: {
  visible: boolean;
  sessions: SessionSummary[];
  onClose: () => void;
  onSelect: (session: SessionSummary) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 border-b border-panel-border bg-panel px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
            <AppIcon name="session" size={23} color={Colors.accentBright} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-foreground">Add from Session</Text>
            <Text className="mt-0.5 text-xs text-muted">Import a roster prepared before the game.</Text>
          </View>
          <Pressable onPress={onClose} className="min-h-10 items-center justify-center rounded-xl border border-panel-border bg-panel-raised px-4 active:bg-white/5">
            <Text className="text-sm font-semibold text-foreground">Cancel</Text>
          </Pressable>
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-2 p-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-panel-raised">
                <AppIcon name="session" size={27} color={Colors.muted} />
              </View>
              <Text className="mt-4 text-base font-bold text-foreground">Nothing staged yet</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-muted">Add PCs or monsters to a session before importing its roster.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelect(item)} className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel p-4 active:bg-white/5">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
                <AppIcon name="session" size={21} color={Colors.accentBright} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{item.name}</Text>
                <Text className="mt-1 text-xs text-muted">{item.combatantCount} combatant{item.combatantCount === 1 ? "" : "s"} ready</Text>
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent">
                <AppIcon name="chevronRight" size={18} color={Colors.accentForeground} />
              </View>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
