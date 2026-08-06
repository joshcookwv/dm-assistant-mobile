import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { PrimaryButton } from "@/components/primary-button";
import { SearchBar } from "@/components/search-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listNotes, type Note } from "@/lib/notes";

function formatDate(iso: string): string {
  return new Date(iso + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotesListScreen() {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const debouncedQuery = useDebouncedValue(query);

  const refresh = useCallback(() => {
    setNotes(listNotes(debouncedQuery));
  }, [debouncedQuery]);

  useFocusEffect(refresh);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search notes…" />
        <PrimaryButton label="New Note" onPress={() => router.push("/notes/new")} />
      </View>

      <FlatList
        data={notes}
        contentContainerClassName="pb-6"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EntityListEmpty
            label={query ? "No notes found" : "No campaign notes yet"}
            detail={query ? "Try a broader search." : "Capture lore, clues, plans, and ideas as they happen."}
            icon="notes"
          />
        }
        renderItem={({ item }) => (
          <EntityListItem
            title={item.title}
            icon="document"
            subtitle={[formatDate(item.updated_at), item.tags].filter(Boolean).join(" · ")}
            onPress={() => router.push(`/notes/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
