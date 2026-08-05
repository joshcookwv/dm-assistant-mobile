import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty } from "@/components/entity-list-item";
import { SearchBar } from "@/components/search-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listMaps, type MapRecord } from "@/lib/maps";

export default function MapsListScreen() {
  const [query, setQuery] = useState("");
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const debouncedQuery = useDebouncedValue(query);

  const refresh = useCallback(() => {
    setMaps(listMaps(debouncedQuery));
  }, [debouncedQuery]);

  useFocusEffect(refresh);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or tag…" />
        <Pressable
          onPress={() => router.push("/maps/new")}
          className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-medium text-accent-foreground">+ New Map</Text>
        </Pressable>
      </View>

      <FlatList
        data={maps}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EntityListEmpty label="No maps yet." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/maps/${item.id}`)}
            className="flex-row items-center gap-2 border-b border-panel-border/50 px-4 py-3 active:bg-white/5"
          >
            <Text>{item.type === "image" ? "🖼️" : "🔗"}</Text>
            <View>
              <Text className="font-medium text-foreground">{item.name}</Text>
              {!!item.tags && <Text className="mt-0.5 text-xs text-muted">{item.tags}</Text>}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
