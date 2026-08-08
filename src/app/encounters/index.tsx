import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { PrimaryButton } from "@/components/primary-button";
import { createEncounter, listOneShotEncounters, type Encounter } from "@/lib/encounters";

export default function EncountersListScreen() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  const refresh = useCallback(() => {
    setEncounters(listOneShotEncounters());
  }, []);

  useFocusEffect(refresh);

  function handleCreate() {
    const created = createEncounter("New Encounter");
    router.push(`/encounters/${created.id}`);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="p-4">
        <PrimaryButton label="New Encounter" onPress={handleCreate} />
      </View>

      <FlatList
        data={encounters}
        contentContainerClassName="pb-6"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EntityListEmpty
            label="No encounters yet"
            detail="Build a fight, roll initiative, and keep every combatant organized."
            icon="encounters"
          />
        }
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            icon="encounters"
            badge={item.combatants.length > 0 ? `Round ${item.round}` : undefined}
            subtitle={`Round ${item.round} · ${item.combatants.length} combatant${item.combatants.length === 1 ? "" : "s"}`}
            onPress={() => router.push(`/encounters/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
