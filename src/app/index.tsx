import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { listNpcs } from "@/lib/npcs";
import { listNotes, type Note } from "@/lib/notes";
import { listEncounters } from "@/lib/encounters";
import { listMaps } from "@/lib/maps";
import { listBestiary } from "@/lib/bestiary";

function formatDate(iso: string): string {
  return new Date(iso + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const QUICK_LINKS = [
  { href: "/rules", label: "Rules", icon: "📖" },
  { href: "/npcs", label: "NPCs", icon: "🎭" },
  { href: "/notes", label: "Notes", icon: "📝" },
  { href: "/encounters", label: "Encounters", icon: "⚔️" },
  { href: "/maps", label: "Maps", icon: "🗺️" },
  { href: "/bestiary", label: "Bestiary", icon: "📗" },
] as const;

export default function DashboardScreen() {
  const [counts, setCounts] = useState({ npcs: 0, encounters: 0, maps: 0, bestiary: 0 });
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);

  const refresh = useCallback(() => {
    setCounts({
      npcs: listNpcs().length,
      encounters: listEncounters().length,
      maps: listMaps().length,
      bestiary: listBestiary().length,
    });
    setRecentNotes(listNotes().slice(0, 5));
  }, []);

  useFocusEffect(refresh);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 p-4">
      <View className="flex-row flex-wrap gap-3">
        {[
          { label: "NPCs", value: counts.npcs },
          { label: "Encounters", value: counts.encounters },
          { label: "Maps", value: counts.maps },
          { label: "Bestiary", value: counts.bestiary },
        ].map((tile) => (
          <View
            key={tile.label}
            className="min-w-[45%] flex-1 rounded-md border border-panel-border bg-panel p-3"
          >
            <Text className="text-2xl font-semibold text-accent">{tile.value}</Text>
            <Text className="text-xs text-muted">{tile.label}</Text>
          </View>
        ))}
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-foreground">Recent Notes</Text>
        <View className="rounded-md border border-panel-border bg-panel">
          {recentNotes.length === 0 && (
            <Text className="p-4 text-sm text-muted">No notes yet.</Text>
          )}
          {recentNotes.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => router.push(`/notes/${note.id}`)}
              className="border-b border-panel-border/50 px-4 py-3 last:border-b-0 active:bg-white/5"
            >
              <Text className="font-medium text-foreground">{note.title}</Text>
              <Text className="mt-0.5 text-xs text-muted">{formatDate(note.updated_at)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-foreground">Quick Links</Text>
        <View className="flex-row flex-wrap gap-3">
          {QUICK_LINKS.map((link) => (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href)}
              className="min-w-[30%] flex-1 items-center gap-1 rounded-md border border-panel-border bg-panel py-4 active:bg-white/5"
            >
              <Text className="text-2xl">{link.icon}</Text>
              <Text className="text-xs text-foreground">{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
