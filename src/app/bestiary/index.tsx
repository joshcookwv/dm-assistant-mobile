import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { SearchBar } from "@/components/search-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listBestiary, type BestiaryMonster } from "@/lib/bestiary";

export default function BestiaryListScreen() {
  const [query, setQuery] = useState("");
  const [monsters, setMonsters] = useState<BestiaryMonster[]>([]);
  const debouncedQuery = useDebouncedValue(query);

  const refresh = useCallback(() => {
    setMonsters(listBestiary(debouncedQuery));
  }, [debouncedQuery]);

  useFocusEffect(refresh);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <Text className="text-xs text-muted">
          Homebrew and imported monsters — searchable here and when adding combatants in Encounters.
        </Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or tag…" />
        <Pressable
          onPress={() => router.push("/bestiary/new")}
          className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-medium text-accent-foreground">+ New Monster</Text>
        </Pressable>
      </View>

      <FlatList
        data={monsters}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EntityListEmpty label="No homebrew monsters yet." />}
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            subtitle={[item.type, item.challenge_rating && `CR ${item.challenge_rating}`]
              .filter(Boolean)
              .join(" · ")}
            onPress={() => router.push(`/bestiary/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
