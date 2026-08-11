import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { SearchBar } from "@/components/search-bar";
import { Colors } from "@/constants/colors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listNpcs, type Npc } from "@/lib/npcs";

export function NpcPickerModal({
  visible,
  onClose,
  onSelect,
  title = "Log an NPC",
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (npc: Npc) => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [results, setResults] = useState<Npc[]>([]);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const requestId = useRef(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!visible) {
        setQuery("");
        setResults([]);
        setLastAdded(null);
      } else {
        setResults(listNpcs());
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [visible]);

  useEffect(() => {
    const thisRequest = ++requestId.current;
    const timeout = setTimeout(() => {
      const found = listNpcs(debouncedQuery);
      if (requestId.current !== thisRequest) return;
      setResults(found);
    }, 0);
    return () => clearTimeout(timeout);
  }, [debouncedQuery]);

  function handleSelect(npc: Npc) {
    onSelect(npc);
    setLastAdded(npc.name);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="border-b border-panel-border bg-panel px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
              <AppIcon name="npcs" size={23} color={Colors.accentBright} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-foreground">{title}</Text>
              <Text className="mt-0.5 text-xs text-muted">Tap an NPC to log them at this location.</Text>
            </View>
            <Pressable onPress={onClose} className="min-h-10 items-center justify-center rounded-xl bg-accent px-4 active:bg-accent-bright">
              <Text className="text-sm font-black text-accent-foreground">Done</Text>
            </Pressable>
          </View>
          <View className="mt-4">
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search NPCs by name..." />
          </View>
          {lastAdded ? (
            <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5">
              <AppIcon name="check" size={15} color={Colors.success} />
              <Text className="flex-1 text-xs font-semibold text-foreground">Logged {lastAdded}</Text>
              <Text className="text-[10px] text-muted">Picker remains open</Text>
            </View>
          ) : null}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-2 p-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-panel-raised">
                <AppIcon name="search" size={26} color={Colors.muted} />
              </View>
              <Text className="mt-4 text-base font-bold text-foreground">
                {debouncedQuery.trim() ? "No NPCs found" : "No NPCs yet"}
              </Text>
              <Text className="mt-1 text-center text-sm leading-5 text-muted">
                {debouncedQuery.trim() ? "Try a different name." : "Create NPCs first, then log them here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelect(item)} className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel p-3.5 active:bg-white/5">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
                <AppIcon name="npcs" size={21} color={Colors.accentBright} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{item.name}</Text>
                <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
                  {[item.race, item.role].filter(Boolean).join(" · ") || "No details yet"}
                </Text>
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent">
                <AppIcon name="add" size={18} color={Colors.accentForeground} />
              </View>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
