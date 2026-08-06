import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { PrimaryButton } from "@/components/primary-button";
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
        <PrimaryButton label="New NPC" onPress={() => router.push("/npcs/new")} />
      </View>

      <FlatList
        data={npcs}
        contentContainerClassName="pb-6"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EntityListEmpty
            label={query ? "No NPCs found" : "Your roster is empty"}
            detail={query ? "Try a different name, location, or tag." : "Add a recurring ally, rival, or quest giver."}
            icon="npcs"
          />
        }
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            icon="person"
            subtitle={[item.race, item.role].filter(Boolean).join(" · ")}
            onPress={() => router.push(`/npcs/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
