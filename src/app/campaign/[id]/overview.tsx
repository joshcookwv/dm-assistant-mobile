import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { LockedAiButton } from "@/components/locked-ai-button";
import { PrimaryButton } from "@/components/primary-button";
import { SearchBar } from "@/components/search-bar";
import { Colors } from "@/constants/colors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { generateCampaignRecap } from "@/lib/ai-premium";
import {
  getCampaignOverviewStats,
  getCampaignTimeline,
  searchCampaign,
  type CampaignOverviewStats,
  type CampaignSearchResult,
} from "@/lib/campaign-intelligence";
import { getCampaign, listCampaignSessions, updateCampaign, type Campaign, type CampaignSession } from "@/lib/campaigns";
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
  const { isPremium, appUserId } = useEntitlement();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignOverviewStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<CampaignSession[]>([]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const [recapLoading, setRecapLoading] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [recapResult, setRecapResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setCampaign(getCampaign(campaignId) ?? null);
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

  async function handleGenerateRecap() {
    if (!appUserId) {
      setRecapError("Not ready yet — try again in a moment.");
      return;
    }
    setRecapLoading(true);
    setRecapError(null);
    setRecapResult(null);
    try {
      const timeline = getCampaignTimeline(campaignId);
      const text = await generateCampaignRecap(appUserId, {
        campaignName: campaign?.name ?? "",
        sessions: timeline.sessions,
        notes: timeline.notes.map((n) => ({ title: n.title, content: n.content })),
      });
      setRecapResult(text);
    } catch (error) {
      setRecapError(error instanceof Error ? error.message : "Recap generation failed.");
    } finally {
      setRecapLoading(false);
    }
  }

  function handleSaveRecap() {
    if (!campaign || !recapResult) return;
    const notes = campaign.notes ? `${campaign.notes}\n\n---\n\n${recapResult}` : recapResult;
    updateCampaign(campaignId, campaign.name, notes);
    setRecapResult(null);
    refresh();
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

              <View className="rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3.5">
                <View className="flex-row items-center gap-3">
                  <AppIcon name="sparkles" size={20} color={Colors.accentBright} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">Campaign Recap</Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      {isPremium ? "AI-written story-so-far from your sessions" : "Premium feature"}
                    </Text>
                  </View>
                  <LockedAiButton
                    isPremium={isPremium}
                    loading={recapLoading}
                    label="Generate"
                    onPress={handleGenerateRecap}
                  />
                </View>
                {recapError && <Text className="mt-2 text-xs text-red-400">{recapError}</Text>}
                {recapResult && (
                  <View className="mt-3 gap-3 border-t border-accent/20 pt-3">
                    <Text className="text-sm leading-5 text-foreground/90">{recapResult}</Text>
                    <View className="flex-row items-center gap-4">
                      <View className="flex-1">
                        <PrimaryButton label="Save to Campaign Notes" icon="check" onPress={handleSaveRecap} />
                      </View>
                      <Pressable onPress={() => setRecapResult(null)} hitSlop={8}>
                        <Text className="text-xs text-muted">Dismiss</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

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
