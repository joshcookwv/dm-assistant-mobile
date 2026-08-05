import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { SearchBar } from "@/components/search-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listNpcs, type Npc } from "@/lib/npcs";

export default function NpcsListScreen() {
  const [query, setQuery] = useState("");
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const debouncedQuery = useDebouncedValue(query);

  const refresh = useCallback(() => {
    setNpcs(listNpcs(debouncedQuery));
  }, [debouncedQuery]);

  useFocusEffect(refresh);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, location, or tag…" />
        </View>
        <Pressable
          onPress={() => router.push("/npcs/new")}
          className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-medium text-accent-foreground">+ New NPC</Text>
        </Pressable>
      </View>

      <FlatList
        data={npcs}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EntityListEmpty label="No NPCs yet." />}
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            subtitle={[item.race, item.role].filter(Boolean).join(" · ")}
            onPress={() => router.push(`/npcs/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
