import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
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
        <Pressable
          onPress={() => router.push("/notes/new")}
          className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-medium text-accent-foreground">+ New Note</Text>
        </Pressable>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EntityListEmpty label="No notes yet." />}
        renderItem={({ item }) => (
          <EntityListItem
            title={item.title}
            subtitle={[formatDate(item.updated_at), item.tags].filter(Boolean).join(" · ")}
            onPress={() => router.push(`/notes/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
