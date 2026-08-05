import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { createEncounter, listEncounters, type Encounter } from "@/lib/encounters";

export default function EncountersListScreen() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  const refresh = useCallback(() => {
    setEncounters(listEncounters());
  }, []);

  useFocusEffect(refresh);

  function handleCreate() {
    const created = createEncounter("New Encounter");
    router.push(`/encounters/${created.id}`);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="p-4">
        <Pressable
          onPress={handleCreate}
          className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-medium text-accent-foreground">+ New Encounter</Text>
        </Pressable>
      </View>

      <FlatList
        data={encounters}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EntityListEmpty label="No encounters yet." />}
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            subtitle={`Round ${item.round} · ${item.combatants.length} combatant${item.combatants.length === 1 ? "" : "s"}`}
            onPress={() => router.push(`/encounters/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
