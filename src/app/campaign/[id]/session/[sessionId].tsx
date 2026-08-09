import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { LockedAiButton } from "@/components/locked-ai-button";
import { Colors } from "@/constants/colors";
import { generateSessionSummary, suggestLinks, type LinkSuggestion } from "@/lib/ai-premium";
import { getCampaignTimeline } from "@/lib/campaign-intelligence";
import {
  createNpcAppearance,
  deleteCampaignSession,
  getCampaign,
  getCampaignSession,
  listCampaignLocations,
  updateCampaignSession,
} from "@/lib/campaigns";
import { useEntitlement } from "@/lib/entitlements";
import { createNpcRelation } from "@/lib/npc-relations";
import { listNpcs } from "@/lib/npcs";

function suggestionKey(s: LinkSuggestion): string {
  return `${s.kind}-${s.npcName}-${s.relatedNpcName ?? s.locationName ?? ""}`;
}

export default function CampaignSessionScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const campaignId = Number(id);
  const navigation = useNavigation();
  const { isPremium, appUserId } = useEntitlement();

  const [number, setNumber] = useState(0);
  const [name, setName] = useState("");
  const [playedOn, setPlayedOn] = useState("");
  const [recap, setRecap] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dirty = useRef(false);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [linkSuggestLoading, setLinkSuggestLoading] = useState(false);
  const [linkSuggestError, setLinkSuggestError] = useState<string | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[] | null>(null);

  const refresh = useCallback(() => {
    const session = getCampaignSession(Number(sessionId));
    if (!session) {
      Alert.alert("Not found", "This session no longer exists.");
      router.back();
      return;
    }
    if (!dirty.current) {
      setNumber(session.number);
      setName(session.name);
      setPlayedOn(session.playedOn ?? "");
      setRecap(session.recap);
    }
    navigation.setOptions({ title: `Session ${session.number}` });
  }, [sessionId, navigation]);

  useFocusEffect(refresh);

  useEffect(() => {
    if (!dirty.current) return;
    const timeout = setTimeout(() => {
      updateCampaignSession(Number(sessionId), { name, playedOn: playedOn || null, recap });
      dirty.current = false;
    }, 500);
    return () => clearTimeout(timeout);
  }, [name, playedOn, recap, sessionId]);

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      dirty.current = true;
      setter(value);
    };
  }

  function handleDelete() {
    deleteCampaignSession(Number(sessionId));
    router.back();
  }

  async function handleGenerateSummary() {
    if (!appUserId) {
      setSummaryError("Not ready yet — try again in a moment.");
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const campaign = getCampaign(campaignId);
      const timeline = getCampaignTimeline(campaignId);
      const entry = timeline.sessions.find((e) => e.session.id === Number(sessionId));
      const text = await generateSessionSummary(appUserId, {
        campaignName: campaign?.name ?? "",
        session: { number, name, playedOn: playedOn || null },
        npcNames: entry?.npcNames ?? [],
        locationNames: entry?.locationNames ?? [],
        encounterNames: entry?.encounterNames ?? [],
        existingRecap: recap,
      });
      dirty.current = true;
      setRecap(text);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Summary generation failed.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSuggestLinks() {
    if (!appUserId) {
      setLinkSuggestError("Not ready yet — try again in a moment.");
      return;
    }
    setLinkSuggestLoading(true);
    setLinkSuggestError(null);
    setLinkSuggestions(null);
    try {
      const knownNpcNames = listNpcs().map((n) => n.name);
      const knownLocationNames = listCampaignLocations(campaignId).map((l) => l.name);
      const suggestions = await suggestLinks(appUserId, { sourceText: recap, knownNpcNames, knownLocationNames });
      setLinkSuggestions(suggestions);
    } catch (error) {
      setLinkSuggestError(error instanceof Error ? error.message : "Couldn't scan for links.");
    } finally {
      setLinkSuggestLoading(false);
    }
  }

  function dismissSuggestion(target: LinkSuggestion) {
    setLinkSuggestions((prev) => prev?.filter((s) => suggestionKey(s) !== suggestionKey(target)) ?? null);
  }

  function handleApproveSuggestion(suggestion: LinkSuggestion) {
    const npc = listNpcs(suggestion.npcName).find((n) => n.name.toLowerCase() === suggestion.npcName.toLowerCase());
    if (!npc) {
      Alert.alert("NPC not found", `"${suggestion.npcName}" isn't in your NPC roster yet — create it first.`);
      return;
    }
    if (suggestion.kind === "appearance") {
      const location = listCampaignLocations(campaignId).find(
        (l) => l.name.toLowerCase() === (suggestion.locationName ?? "").toLowerCase()
      );
      if (!location) {
        Alert.alert("Location not found", `"${suggestion.locationName}" isn't a location in this campaign.`);
        return;
      }
      createNpcAppearance({ npcId: npc.id, locationId: location.id, sessionId: Number(sessionId), notes: suggestion.reason });
    } else {
      const related = listNpcs(suggestion.relatedNpcName).find(
        (n) => n.name.toLowerCase() === (suggestion.relatedNpcName ?? "").toLowerCase()
      );
      if (!related) {
        Alert.alert("NPC not found", `"${suggestion.relatedNpcName}" isn't in your NPC roster yet — create it first.`);
        return;
      }
      createNpcRelation({ npcId: npc.id, relatedNpcId: related.id, relationType: suggestion.relationType, notes: suggestion.reason });
    }
    dismissSuggestion(suggestion);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-10">
      <FormSection title={`Session ${number}`} description="Game night details and a recap for later." icon="session">
        <FormField label="Name" value={name} onChangeText={markDirty(setName)} placeholder="Ambush at the ravine" />
        <FormField label="Date played" value={playedOn} onChangeText={markDirty(setPlayedOn)} placeholder="2026-08-09" />
        <View>
          <FormField
            label="Recap"
            value={recap}
            onChangeText={markDirty(setRecap)}
            placeholder="What happened this session..."
            multiline
            className="min-h-40"
            labelRight={
              <LockedAiButton
                isPremium={isPremium}
                loading={summaryLoading}
                label="Summarize"
                onPress={handleGenerateSummary}
              />
            }
          />
          {summaryError && <Text className="mt-1 text-sm text-red-400">{summaryError}</Text>}
        </View>
      </FormSection>

      <Text className="text-center text-xs text-muted">Saves automatically as you type.</Text>

      <View className="rounded-2xl border border-panel-border bg-panel px-4 py-3.5">
        <View className="flex-row items-center gap-3">
          <AppIcon name="link" size={20} color={Colors.accentBright} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">Suggest Links</Text>
            <Text className="mt-0.5 text-xs text-muted">
              {isPremium ? "Find NPCs and relationships mentioned in this recap" : "Premium feature"}
            </Text>
          </View>
          <LockedAiButton
            isPremium={isPremium}
            loading={linkSuggestLoading}
            disabled={!recap.trim()}
            label="Scan"
            onPress={handleSuggestLinks}
          />
        </View>
        {linkSuggestError && <Text className="mt-2 text-xs text-red-400">{linkSuggestError}</Text>}
        {linkSuggestions && (
          <View className="mt-3 gap-2 border-t border-panel-border pt-3">
            {linkSuggestions.length === 0 ? (
              <Text className="text-sm text-muted">No new links found.</Text>
            ) : (
              linkSuggestions.map((suggestion) => (
                <View key={suggestionKey(suggestion)} className="rounded-2xl border border-panel-border bg-panel-raised p-3">
                  <Text className="text-sm font-semibold text-foreground">
                    {suggestion.kind === "appearance"
                      ? `${suggestion.npcName} appeared at ${suggestion.locationName ?? "?"}`
                      : `${suggestion.npcName} ↔ ${suggestion.relatedNpcName ?? "?"} (${suggestion.relationType || "relationship"})`}
                  </Text>
                  <Text className="mt-1 text-xs leading-4 text-muted">{suggestion.reason}</Text>
                  <View className="mt-2 flex-row gap-4">
                    <Pressable onPress={() => handleApproveSuggestion(suggestion)} hitSlop={8}>
                      <Text className="text-xs font-semibold text-accent-bright">Add</Text>
                    </Pressable>
                    <Pressable onPress={() => dismissSuggestion(suggestion)} hitSlop={8}>
                      <Text className="text-xs text-muted">Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <View className="mt-2 border-t border-panel-border pt-4">
        {!confirmingDelete && <DeleteButton label="Delete Session" onPress={() => setConfirmingDelete(true)} />}
        {confirmingDelete && (
          <DeleteConfirmBar label="Delete this session?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />
        )}
      </View>
    </ScrollView>
  );
}
