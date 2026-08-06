import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { FlatList, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { PrimaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import { createSession, listSessions, type SessionSummary } from "@/lib/session";

function summaryLine(session: SessionSummary): string {
  if (session.memberCount === 0) return "Nothing staged yet";
  const monsters = session.combatantCount - session.pcCount;
  return [
    session.pcCount > 0 && `${session.pcCount} PC${session.pcCount === 1 ? "" : "s"}`,
    monsters > 0 && `${monsters} monster${monsters === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function SessionsListScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const refresh = useCallback(() => setSessions(listSessions()), []);
  useFocusEffect(refresh);

  function handleCreate() {
    const created = createSession("New Session");
    router.push(`/session/${created.id}`);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <View className="flex-row gap-3 rounded-2xl border border-panel-border bg-panel p-4">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
            <AppIcon name="session" size={20} color={Colors.accentBright} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">Prepare before game night</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">
              Stage the party and monsters, then send the full roster into an encounter in one tap.
            </Text>
          </View>
        </View>
        <PrimaryButton label="New Session" onPress={handleCreate} />
      </View>

      <FlatList
        data={sessions}
        contentContainerClassName="pb-6"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EntityListEmpty
            label="No sessions prepared"
            detail="Create a session to stage tonight's party and opposition."
            icon="session"
          />
        }
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            subtitle={summaryLine(item)}
            icon="session"
            badge={item.combatantCount > 0 ? `${item.combatantCount} ready` : undefined}
            onPress={() => router.push(`/session/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
