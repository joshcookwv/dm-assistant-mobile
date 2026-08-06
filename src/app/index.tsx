import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { listBestiary } from "@/lib/bestiary";
import { listEncounters } from "@/lib/encounters";
import { listNotes, type Note } from "@/lib/notes";
import { listNpcs } from "@/lib/npcs";
import { listSessions } from "@/lib/session";

function formatDate(iso: string): string {
  return new Date(iso + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const QUICK_LINKS = [
  { href: "/rules/quick-reference", label: "Quick Reference", detail: "Combat at a glance", icon: "quick" },
  { href: "/rules", label: "Rules Library", detail: "Search the SRD", icon: "rules" },
  { href: "/monsters", label: "Monsters", detail: "SRD + homebrew", icon: "monsters" },
  { href: "/npcs", label: "NPC Roster", detail: "People & places", icon: "npcs" },
  { href: "/notes", label: "Campaign Notes", detail: "Ideas & lore", icon: "notes" },
  { href: "/session", label: "Session Prep", detail: "Stage game night", icon: "session" },
  { href: "/encounters", label: "Encounters", detail: "Run initiative", icon: "encounters" },
  { href: "/maps", label: "Maps", detail: "Scenes & locations", icon: "maps" },
] as const satisfies readonly {
  href: string;
  label: string;
  detail: string;
  icon: AppIconName;
}[];

export default function DashboardScreen() {
  const [counts, setCounts] = useState({ npcs: 0, encounters: 0, homebrew: 0, sessions: 0 });
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);

  const refresh = useCallback(() => {
    setCounts({
      npcs: listNpcs().length,
      encounters: listEncounters().length,
      homebrew: listBestiary().length,
      sessions: listSessions().length,
    });
    setRecentNotes(listNotes().slice(0, 5));
  }, []);

  useFocusEffect(refresh);

  const statTiles = [
    { label: "NPCs", value: counts.npcs, href: "/npcs", icon: "npcs" },
    { label: "Encounters", value: counts.encounters, href: "/encounters", icon: "encounters" },
    { label: "Sessions", value: counts.sessions, href: "/session", icon: "session" },
    { label: "Bestiary", value: counts.homebrew, href: "/monsters", icon: "monsters" },
  ] as const;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4 pb-8">
      <View className="relative min-h-44 overflow-hidden rounded-3xl border border-accent/30 bg-panel-raised p-5">
        <View className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-accent/10" />
        <Image
          source={require("../../assets/images/logo.png")}
          style={{ position: "absolute", width: 152, height: 152, right: -18, bottom: -26, opacity: 0.2 }}
          resizeMode="contain"
        />
        <View className="mb-5 flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-accent/15">
            <AppIcon name="quick" size={17} color={Colors.accentBright} />
          </View>
          <Text className="text-xs font-bold uppercase tracking-[2px] text-accent-bright">
            Campaign command center
          </Text>
        </View>
        <Text className="max-w-[72%] text-2xl font-bold leading-8 text-foreground">
          Ready for the next adventure?
        </Text>
        <Text className="mt-2 max-w-[70%] text-sm leading-5 text-muted">
          Prep faster, stay organized, and keep the story moving.
        </Text>
      </View>

      <View>
        <Text className="mb-3 text-base font-bold text-foreground">At a glance</Text>
        <View className="flex-row flex-wrap gap-3">
          {statTiles.map((tile) => (
            <Pressable
              key={tile.label}
              onPress={() => router.push(tile.href)}
              className="min-w-[46%] flex-1 flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel p-4 active:bg-panel-raised"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                <AppIcon name={tile.icon} size={21} color={Colors.accentBright} />
              </View>
              <View>
                <Text className="text-xl font-bold text-foreground">{tile.value}</Text>
                <Text className="text-xs text-muted">{tile.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-foreground">Recent notes</Text>
          <Pressable onPress={() => router.push("/notes")} hitSlop={8}>
            <Text className="text-xs font-semibold text-accent-bright">View all</Text>
          </Pressable>
        </View>
        <View className="overflow-hidden rounded-2xl border border-panel-border bg-panel">
          {recentNotes.length === 0 && (
            <View className="items-center px-4 py-7">
              <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl bg-panel-raised">
                <AppIcon name="notes" size={22} color={Colors.subtle} />
              </View>
              <Text className="text-sm font-semibold text-foreground">No notes yet</Text>
              <Text className="mt-1 text-xs text-muted">Capture your first campaign idea.</Text>
            </View>
          )}
          {recentNotes.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => router.push(`/notes/${note.id}`)}
              className="flex-row items-center gap-3 border-b border-panel-border/60 px-4 py-3.5 last:border-b-0 active:bg-panel-raised"
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-panel-raised">
                <AppIcon name="document" size={18} color={Colors.accentBright} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground" numberOfLines={1}>{note.title}</Text>
                <Text className="mt-0.5 text-xs text-muted">{formatDate(note.updated_at)}</Text>
              </View>
              <AppIcon name="chevronRight" size={17} color={Colors.subtle} />
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-3 text-base font-bold text-foreground">Tools</Text>
        <View className="flex-row flex-wrap gap-3">
          {QUICK_LINKS.map((link) => (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href)}
              className="min-w-[46%] flex-1 rounded-2xl border border-panel-border bg-panel p-4 active:bg-panel-raised"
            >
              <View className="mb-4 h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                <AppIcon name={link.icon} size={21} color={Colors.accentBright} />
              </View>
              <Text className="text-sm font-bold text-foreground">{link.label}</Text>
              <Text className="mt-1 text-xs text-muted">{link.detail}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
