import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { AiError } from "@/components/ai-error";
import { AiReportAction } from "@/components/ai-report-action";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { ProAiButton } from "@/components/pro-ai-button";
import { generateSessionSummary } from "@/lib/campaign-ai";
import { AI_MODEL } from "@/lib/ai";
import {
  deleteCampaignSession,
  getCampaign,
  getCampaignSession,
  updateCampaignSession,
} from "@/lib/campaigns";

export default function CampaignSessionScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const navigation = useNavigation();

  const [number, setNumber] = useState(0);
  const [name, setName] = useState("");
  const [playedOn, setPlayedOn] = useState("");
  const [recap, setRecap] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
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

      <View className="mt-2 border-t border-panel-border pt-4">
        {!confirmingDelete && <DeleteButton label="Delete Session" onPress={() => setConfirmingDelete(true)} />}
        {confirmingDelete && (
          <DeleteConfirmBar label="Delete this session?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />
        )}
      </View>
    </ScrollView>
  );
}
