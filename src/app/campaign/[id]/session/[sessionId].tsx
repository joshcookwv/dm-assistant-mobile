import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { AiError } from "@/components/ai-error";
import { AiReportAction } from "@/components/ai-report-action";
import { AppIcon } from "@/components/app-icon";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { ProAiButton } from "@/components/pro-ai-button";
import { Colors } from "@/constants/colors";
import { suggestLinks, type LinkSuggestion } from "@/lib/ai-premium";
import { generateSessionSummary } from "@/lib/campaign-ai";
import { AI_MODEL } from "@/lib/ai";
import {
  createNpcAppearance,
  deleteCampaignSession,
  getCampaign,
  getCampaignSession,
  listCampaignLocations,
  updateCampaignSession,
} from "@/lib/campaigns";
import { createNpcRelation } from "@/lib/npc-relations";
import { listNpcs } from "@/lib/npcs";
import { useProAccess } from "@/providers/pro-access";

function suggestionKey(suggestion: LinkSuggestion): string {
  return `${suggestion.kind}-${suggestion.npcName}-${suggestion.relatedNpcName ?? suggestion.locationName ?? ""}`;
}

export default function CampaignSessionScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const campaignId = Number(id);
  const navigation = useNavigation();
  const { appUserId } = useProAccess();

  const [number, setNumber] = useState(0);
  const [name, setName] = useState("");
  const [playedOn, setPlayedOn] = useState("");
  const [recap, setRecap] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [linkSuggestLoading, setLinkSuggestLoading] = useState(false);
  const [linkSuggestError, setLinkSuggestError] = useState<string | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[] | null>(null);
  const dirty = useRef(false);
  const latestDraft = useRef({ name: "", playedOn: "", recap: "" });

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
    latestDraft.current = { name, playedOn, recap };
  }, [name, playedOn, recap]);

  useEffect(
    () => () => {
      if (!dirty.current) return;
      const draft = latestDraft.current;
      updateCampaignSession(Number(sessionId), {
        name: draft.name,
        playedOn: draft.playedOn || null,
        recap: draft.recap,
      });
      dirty.current = false;
    },
    [sessionId]
  );

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
    if (!recap.trim()) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const campaign = getCampaign(Number(id));
      const generated = await generateSessionSummary({
        campaignName: campaign?.name ?? "Untitled Campaign",
        sessionName: name.trim() || `Session ${number}`,
        playedOn: playedOn.trim() || undefined,
        notes: recap.trim(),
      });
      dirty.current = true;
      setGeneratedSummary(generated);
      setRecap(generated);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Couldn't generate a session summary.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSuggestLinks() {
    if (!appUserId || !recap.trim()) return;
    setLinkSuggestLoading(true);
    setLinkSuggestError(null);
    setLinkSuggestions(null);
    try {
      const suggestions = await suggestLinks(appUserId, {
        sourceText: recap,
        knownNpcNames: listNpcs().map((npc) => npc.name),
        knownLocationNames: listCampaignLocations(campaignId).map((location) => location.name),
      });
      setLinkSuggestions(suggestions);
    } catch (error) {
      setLinkSuggestError(error instanceof Error ? error.message : "Couldn't scan for links.");
    } finally {
      setLinkSuggestLoading(false);
    }
  }

  function dismissSuggestion(target: LinkSuggestion) {
    setLinkSuggestions((previous) =>
      previous?.filter((suggestion) => suggestionKey(suggestion) !== suggestionKey(target)) ?? null,
    );
  }

  function handleApproveSuggestion(suggestion: LinkSuggestion) {
    const npc = listNpcs(suggestion.npcName).find(
      (candidate) => candidate.name.toLowerCase() === suggestion.npcName.toLowerCase(),
    );
    if (!npc) {
      Alert.alert("NPC not found", `"${suggestion.npcName}" isn't in your NPC roster yet — create it first.`);
      return;
    }

    if (suggestion.kind === "appearance") {
      const location = listCampaignLocations(campaignId).find(
        (candidate) => candidate.name.toLowerCase() === (suggestion.locationName ?? "").toLowerCase(),
      );
      if (!location) {
        Alert.alert("Location not found", `"${suggestion.locationName}" isn't a location in this campaign.`);
        return;
      }
      createNpcAppearance({
        npcId: npc.id,
        locationId: location.id,
        sessionId: Number(sessionId),
        notes: suggestion.reason,
      });
    } else {
      const related = listNpcs(suggestion.relatedNpcName).find(
        (candidate) => candidate.name.toLowerCase() === (suggestion.relatedNpcName ?? "").toLowerCase(),
      );
      if (!related) {
        Alert.alert("NPC not found", `"${suggestion.relatedNpcName}" isn't in your NPC roster yet — create it first.`);
        return;
      }
      createNpcRelation({
        npcId: npc.id,
        relatedNpcId: related.id,
        relationType: suggestion.relationType,
        notes: suggestion.reason,
      });
    }
    dismissSuggestion(suggestion);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-10">
      <FormSection title={`Session ${number}`} description="Game night details and a recap for later." icon="session">
        <FormField label="Name" value={name} onChangeText={markDirty(setName)} placeholder="Ambush at the ravine" />
        <FormField label="Date played" value={playedOn} onChangeText={markDirty(setPlayedOn)} placeholder="2026-08-09" />
        <FormField
          label="Recap"
          value={recap}
          onChangeText={markDirty(setRecap)}
          placeholder="What happened this session..."
          multiline
          className="min-h-40"
          labelRight={
            <ProAiButton
              label="Summarize"
              loadingLabel="Summarizing..."
              loading={summaryLoading}
              disabled={!recap.trim()}
              onPress={handleGenerateSummary}
            />
          }
        />
        {summaryError && <AiError message={summaryError} />}
        {generatedSummary && (
          <AiReportAction
            output={generatedSummary}
            feature="session_summary"
            model={AI_MODEL}
          />
        )}
      </FormSection>

      <Text className="text-center text-xs text-muted">Saves automatically as you type.</Text>

      <View className="rounded-2xl border border-panel-border bg-panel px-4 py-3.5">
        <View className="flex-row items-center gap-3">
          <AppIcon name="link" size={20} color={Colors.accentBright} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">Suggest Links</Text>
            <Text className="mt-0.5 text-xs text-muted">Find NPCs and relationships mentioned in this recap</Text>
          </View>
          <ProAiButton
            label="Scan"
            loadingLabel="Scanning..."
            loading={linkSuggestLoading}
            disabled={!recap.trim()}
            onPress={handleSuggestLinks}
          />
        </View>
        {linkSuggestError && <AiError message={linkSuggestError} />}
        {linkSuggestions && (
          <View className="mt-3 gap-2 border-t border-panel-border pt-3">
            <AiReportAction
              output={JSON.stringify(linkSuggestions, null, 2)}
              feature="session_summary"
              model={AI_MODEL}
            />
            {linkSuggestions.length === 0 ? (
              <Text className="text-sm text-muted">No new links found.</Text>
            ) : (
              linkSuggestions.map((suggestion) => (
                <View
                  key={suggestionKey(suggestion)}
                  className="rounded-2xl border border-panel-border bg-panel-raised p-3"
                >
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
