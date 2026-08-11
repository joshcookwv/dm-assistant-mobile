import { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { AiError } from "@/components/ai-error";
import { AiReportAction } from "@/components/ai-report-action";
import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { ProAiButton } from "@/components/pro-ai-button";
import { SaveToast } from "@/components/save-toast";
import { Colors } from "@/constants/colors";
import {
  createNpcAppearance,
  deleteNpcAppearance,
  listAppearancesByNpc,
  listCampaignLocations,
  listCampaigns,
  type CampaignSummary,
  type LocationSummary,
  type NpcAppearanceDetail,
} from "@/lib/campaigns";
import { suggestNpcDescription, suggestNpcName } from "@/lib/npc-ai";
import { AI_MODEL } from "@/lib/ai";
import { createNpc, deleteNpc, getNpc, updateNpc, type NpcInput } from "@/lib/npcs";

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${selected ? "border-accent bg-accent" : "border-panel-border bg-panel-raised"}`}
    >
      <Text className={`text-xs font-semibold ${selected ? "text-accent-foreground" : "text-foreground"}`}>{label}</Text>
    </Pressable>
  );
}

function AppearanceLogger({ npcId, onLogged }: { npcId: number; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  function handleOpen() {
    setCampaigns(listCampaigns());
    setOpen(true);
  }

  function handlePickCampaign(id: number) {
    setCampaignId(id);
    setLocationId(null);
    setLocations(listCampaignLocations(id));
  }

  function handleSubmit() {
    if (!locationId) return;
    createNpcAppearance({ npcId, locationId, notes: notes.trim() });
    setOpen(false);
    setCampaignId(null);
    setLocationId(null);
    setNotes("");
    onLogged();
  }

  if (!open) {
    return (
      <Pressable onPress={handleOpen} hitSlop={8}>
        <Text className="text-xs font-semibold text-accent-bright">+ Log Appearance</Text>
      </Pressable>
    );
  }

  return (
    <View className="mt-3 gap-3 rounded-2xl border border-panel-border bg-panel p-3.5">
      {campaigns.length === 0 ? (
        <Text className="text-sm text-muted">Create a campaign first, then log this NPC at one of its locations.</Text>
      ) : (
        <>
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Campaign</Text>
          <View className="flex-row flex-wrap gap-2">
            {campaigns.map((campaign) => (
              <Chip key={campaign.id} label={campaign.name} selected={campaignId === campaign.id} onPress={() => handlePickCampaign(campaign.id)} />
            ))}
          </View>
          {campaignId && (
            <>
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Location</Text>
              {locations.length === 0 ? (
                <Text className="text-sm text-muted">This campaign has no locations yet.</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {locations.map((location) => (
                    <Chip key={location.id} label={location.name} selected={locationId === location.id} onPress={() => setLocationId(location.id)} />
                  ))}
                </View>
              )}
            </>
          )}
          {locationId && (
            <>
              <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="What happened here..." multiline className="min-h-20" />
              <PrimaryButton label="Log Appearance" icon="check" onPress={handleSubmit} />
            </>
          )}
        </>
      )}
      <Pressable onPress={() => setOpen(false)}>
        <Text className="text-center text-xs text-muted">Cancel</Text>
      </Pressable>
    </View>
  );
}

const BLANK_FORM: NpcInput = { name: "", race: "", role: "", location: "", tags: "", description: "" };

export default function NpcDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const navigation = useNavigation();

  const [form, setForm] = useState<NpcInput>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [nameAiLoading, setNameAiLoading] = useState(false);
  const [nameAiError, setNameAiError] = useState<string | null>(null);
  const [descAiLoading, setDescAiLoading] = useState(false);
  const [descAiError, setDescAiError] = useState<string | null>(null);
  const [generatedName, setGeneratedName] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [appearances, setAppearances] = useState<NpcAppearanceDetail[]>([]);

  const refreshAppearances = useCallback(() => {
    if (!isNew) setAppearances(listAppearancesByNpc(Number(id)));
  }, [id, isNew]);

  useFocusEffect(refreshAppearances);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isNew) {
        navigation.setOptions({ title: "New NPC" });
        return;
      }
      const npc = getNpc(Number(id));
      if (!npc) {
        Alert.alert("Not found", "This NPC no longer exists.");
        router.back();
        return;
      }
      setForm(npc);
      navigation.setOptions({ title: npc.name });
    }, 0);
    return () => clearTimeout(timeout);
  }, [id, isNew, navigation]);

  function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = createNpc(form);
        router.replace(`/npcs/${created.id}`);
      } else {
        updateNpc(Number(id), form);
        navigation.setOptions({ title: form.name });
      }
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteNpc(Number(id));
    router.back();
  }

  async function handleSuggestName() {
    setNameAiLoading(true);
    setNameAiError(null);
    try {
      const name = await suggestNpcName({ race: form.race, role: form.role, location: form.location });
      setGeneratedName(name);
      setForm((previous) => ({ ...previous, name }));
    } catch (error) {
      // AiNotConfiguredError extends Error and now carries its own correct,
      // context-appropriate user-facing message (see ai.ts's callMessages) —
      // no need to special-case it separately from a generic call failure.
      setNameAiError(error instanceof Error ? error.message : "AI suggestion failed.");
    } finally {
      setNameAiLoading(false);
    }
  }

  async function handleSuggestDescription() {
    if (!form.name.trim()) return;
    setDescAiLoading(true);
    setDescAiError(null);
    try {
      const description = await suggestNpcDescription({
        name: form.name,
        race: form.race,
        role: form.role,
        location: form.location,
      });
      setGeneratedDescription(description);
      setForm((previous) => ({ ...previous, description }));
    } catch (error) {
      setDescAiError(error instanceof Error ? error.message : "AI suggestion failed.");
    } finally {
      setDescAiLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection title="Identity" description="The essentials you need to recognize this character at a glance." icon="person">
          <View>
            <FormField
              label="Name"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              placeholder="Grimsby Ironhand"
              labelRight={<ProAiButton label="Suggest" loading={nameAiLoading} onPress={handleSuggestName} />}
            />
            {nameAiError && <AiError message={nameAiError} />}
            {generatedName && (
              <View className="mt-2">
                <AiReportAction output={generatedName} feature="npc" model={AI_MODEL} />
              </View>
            )}
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Race" value={form.race} onChangeText={(race) => setForm({ ...form, race })} placeholder="Dwarf" />
            </View>
            <View className="flex-1">
              <FormField label="Role" value={form.role} onChangeText={(role) => setForm({ ...form, role })} placeholder="Blacksmith" />
            </View>
          </View>
        </FormSection>

        <FormSection title="Campaign details" description="Where they belong and how you want to find them later." icon="tag">
          <FormField label="Location" value={form.location} onChangeText={(location) => setForm({ ...form, location })} placeholder="Ironhold Forge, Dockside" />
          <FormField label="Tags" value={form.tags} onChangeText={(tags) => setForm({ ...form, tags })} placeholder="ally, quest-giver, merchant" />
        </FormSection>

        <FormSection title="Description & secrets" description="Appearance, personality, motivations, and private DM notes." icon="notes">
          <View>
            <FormField
              label="Description / Notes"
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              placeholder="Appearance, personality, motivations, secrets..."
              multiline
              className="min-h-44"
              labelRight={<ProAiButton label="Suggest" loading={descAiLoading} disabled={!form.name.trim()} onPress={handleSuggestDescription} />}
            />
            {descAiError && <AiError message={descAiError} />}
            {generatedDescription && (
              <View className="mt-2">
                <AiReportAction output={generatedDescription} feature="npc" model={AI_MODEL} />
              </View>
            )}
          </View>
        </FormSection>

        {!isNew && (
          <FormSection title="Appearances" description="Every place and session this NPC has shown up." icon="maps">
            {appearances.length === 0 ? (
              <Text className="text-sm leading-5 text-muted">Not logged anywhere yet.</Text>
            ) : (
              <View className="gap-2">
                {appearances.map((appearance) => (
                  <View key={appearance.id} className="flex-row items-start gap-3 rounded-2xl border border-panel-border bg-panel-raised p-3">
                    <View className="flex-1">
                      <Pressable onPress={() => router.push(`/campaign/${appearance.campaignId}/location/${appearance.locationId}`)}>
                        <Text className="text-sm font-bold text-accent-bright">{appearance.locationName}</Text>
                      </Pressable>
                      <Text className="mt-0.5 text-xs text-muted">
                        {appearance.campaignName}
                        {appearance.sessionNumber ? ` · Session ${appearance.sessionNumber}` : ""}
                      </Text>
                      {!!appearance.notes && <Text className="mt-1 text-xs leading-4 text-foreground/80">{appearance.notes}</Text>}
                    </View>
                    <Pressable
                      onPress={() => {
                        deleteNpcAppearance(appearance.id);
                        refreshAppearances();
                      }}
                      hitSlop={8}
                    >
                      <AppIcon name="trash" size={15} color={Colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <AppearanceLogger npcId={Number(id)} onLogged={refreshAppearances} />
          </FormSection>
        )}

        <View className="gap-3 pt-1">
          <PrimaryButton label={saving ? "Saving..." : isNew ? "Create NPC" : "Save changes"} icon="check" onPress={handleSave} disabled={saving || !form.name.trim()} />
          {!isNew && !confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && <DeleteConfirmBar label="Delete this NPC?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />}
      </ScrollView>
      <SaveToast visible={savedToast} message="NPC saved" onHide={() => setSavedToast(false)} />
    </KeyboardAvoidingView>
  );
}
