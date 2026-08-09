import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { SearchBar } from "@/components/search-bar";
import { Colors } from "@/constants/colors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  getCampaignOverviewStats,
  searchCampaign,
  type CampaignOverviewStats,
  type CampaignSearchResult,
} from "@/lib/campaign-intelligence";
import { listCampaignSessions, type CampaignSession } from "@/lib/campaigns";
import { useEntitlement } from "@/lib/entitlements";

const RESULT_BADGES: Record<CampaignSearchResult["type"], string> = {
  npc: "NPC",
  location: "Location",
  session: "Session",
  note: "Note",
};

const RESULT_ICONS: Record<CampaignSearchResult["type"], AppIconName> = {
  npc: "npcs",
  location: "maps",
  session: "session",
  note: "document",
};

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[30%] flex-1 items-center gap-1 rounded-2xl border border-panel-border bg-panel px-2 py-3">
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</Text>
    </View>
  );
}

export default function CampaignOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignId = Number(id);
  const { isPremium } = useEntitlement();

  const [stats, setStats] = useState<CampaignOverviewStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<CampaignSession[]>([]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const refresh = useCallback(() => {
    setStats(getCampaignOverviewStats(campaignId));
    setRecentSessions(listCampaignSessions(campaignId).slice(0, 5));
  }, [campaignId]);

  useFocusEffect(refresh);

  const results = useMemo<CampaignSearchResult[]>(
    () => (debouncedQuery.trim() ? searchCampaign(campaignId, debouncedQuery) : []),
    [campaignId, debouncedQuery]
  );

  function handleResultPress(result: CampaignSearchResult) {
    switch (result.type) {
      case "npc":
        router.push(`/npcs/${result.id}`);
        break;
      case "location":
        router.push(`/campaign/${campaignId}/location/${result.id}`);
        break;
      case "session":
        router.push(`/campaign/${campaignId}/session/${result.id}`);
        break;
      case "note":
        router.push(`/notes/${result.id}`);
        break;
    }
  }

  function handleGenerateRecap() {
    if (!isPremium) {
      router.push("/paywall");
      return;
    }
    Alert.alert("Coming soon", "AI campaign recap generation is on the way — check back in a future update.");
  }

  const showingResults = debouncedQuery.trim().length > 0;

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-10"
      data={showingResults ? results : []}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      renderItem={({ item }) => (
        <EntityListItem
          title={item.title}
          subtitle={item.subtitle}
          icon={RESULT_ICONS[item.type]}
          badge={RESULT_BADGES[item.type]}
          onPress={() => handleResultPress(item)}
        />
      )}
      ListEmptyComponent={
        showingResults ? <EntityListEmpty label="No matches" detail="Try a different search term." icon="search" /> : null
      }
      ListHeaderComponent={
        <View className="gap-4 pb-1">
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search this campaign…" />

          {!showingResults && (
            <>
              {stats && (
                <View className="flex-row flex-wrap gap-2">
                  <StatTile label="PCs" value={stats.pcCount} />
                  <StatTile label="Locations" value={stats.locationCount} />
                  <StatTile label="Sessions" value={stats.sessionCount} />
                  <StatTile label="NPCs" value={stats.npcCount} />
                  <StatTile label="Notes" value={stats.noteCount} />
                  <StatTile label="Encounters" value={stats.encounterCount} />
                </View>
              )}

              <Pressable
                onPress={handleGenerateRecap}
                className="flex-row items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3.5"
              >
                <AppIcon name="sparkles" size={20} color={Colors.accentBright} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">Generate Campaign Recap</Text>
                  <Text className="mt-0.5 text-xs text-muted">
                    {isPremium ? "AI-written story-so-far from your sessions" : "Premium feature — tap to upgrade"}
                  </Text>
                </View>
                {!isPremium && (
                  <View className="rounded-full border border-accent/30 bg-panel px-2 py-0.5">
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-accent-bright">
                      Premium
                    </Text>
                  </View>
                )}
              </Pressable>

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Recent Sessions
                </Text>
                {recentSessions.length === 0 ? (
                  <Text className="text-sm leading-5 text-muted">No sessions logged yet.</Text>
                ) : (
                  <View className="gap-2">
                    {recentSessions.map((session) => (
                      <Pressable
                        key={session.id}
                        onPress={() => router.push(`/campaign/${campaignId}/session/${session.id}`)}
                        className="flex-row items-center justify-between rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
                      >
                        <Text className="font-semibold text-foreground">
                          Session {session.number}
                          {session.name ? ` — ${session.name}` : ""}
                        </Text>
                        <AppIcon name="chevronRight" size={16} color={Colors.subtle} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      }
    />
  );
}
