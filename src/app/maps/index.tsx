import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { FlatList, View } from "react-native";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { PrimaryButton } from "@/components/primary-button";
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
        <PrimaryButton label="New Map" onPress={() => router.push("/maps/new")} />
      </View>

      <FlatList
        data={maps}
        contentContainerClassName="pb-6"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EntityListEmpty
            label={query ? "No maps found" : "No maps saved yet"}
            detail={query ? "Try another name or tag." : "Keep battle maps, regional maps, and useful links close at hand."}
            icon="maps"
          />
        }
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            subtitle={item.tags || (item.type === "image" ? "Saved image" : "External map link")}
            icon={item.type === "image" ? "image" : "link"}
            badge={item.type === "image" ? "Image" : "Link"}
            onPress={() => router.push(`/maps/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
