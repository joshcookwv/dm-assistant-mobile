import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import { Colors } from "@/constants/colors";
import { AiNotConfiguredError } from "@/lib/ai";
import { generateNpcDescriptionPremium, generateNpcNamePremium } from "@/lib/ai-premium";
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
import { useEntitlement } from "@/lib/entitlements";
import { suggestNpcDescription, suggestNpcName } from "@/lib/npc-ai";
import {
  createNpcRelation,
  deleteNpcRelation,
  listRelationsForNpc,
  type NpcRelationDetail,
} from "@/lib/npc-relations";
import { createNpc, deleteNpc, getNpc, listNpcs, updateNpc, type Npc, type NpcInput } from "@/lib/npcs";

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

const RELATION_TYPE_PRESETS = ["Ally", "Rival", "Family", "Mentor", "Servant", "Enemy"];

function RelationshipLogger({ npcId, onLogged }: { npcId: number; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Npc[]>([]);
  const [otherNpcId, setOtherNpcId] = useState<number | null>(null);
  const [relationType, setRelationType] = useState("");
  const [notes, setNotes] = useState("");

  function handleOpen() {
    setCandidates(listNpcs().filter((n) => n.id !== npcId));
    setOpen(true);
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setCandidates(listNpcs(next).filter((n) => n.id !== npcId));
  }

  function handleSubmit() {
    if (!otherNpcId) return;
    createNpcRelation({ npcId, relatedNpcId: otherNpcId, relationType: relationType.trim(), notes: notes.trim() });
    setOpen(false);
    setQuery("");
    setOtherNpcId(null);
    setRelationType("");
    setNotes("");
    onLogged();
  }

  if (!open) {
    return (
      <Pressable onPress={handleOpen} hitSlop={8}>
        <Text className="text-xs font-semibold text-accent-bright">+ Add Relationship</Text>
      </Pressable>
    );
  }

  return (
    <View className="mt-3 gap-3 rounded-2xl border border-panel-border bg-panel p-3.5">
      {candidates.length === 0 && !query ? (
        <Text className="text-sm text-muted">No other NPCs yet — create one first.</Text>
      ) : (
        <>
          <FormField label="Find NPC" value={query} onChangeText={handleQueryChange} placeholder="Search by name..." />
          <View className="flex-row flex-wrap gap-2">
            {candidates.slice(0, 12).map((npc) => (
              <Chip key={npc.id} label={npc.name} selected={otherNpcId === npc.id} onPress={() => setOtherNpcId(npc.id)} />
            ))}
          </View>
          {otherNpcId && (
            <>
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Relationship</Text>
              <View className="flex-row flex-wrap gap-2">
                {RELATION_TYPE_PRESETS.map((preset) => (
                  <Chip
                    key={preset}
                    label={preset}
                    selected={relationType === preset}
                    onPress={() => setRelationType(preset)}
                  />
                ))}
              </View>
              <FormField
                label=""
                value={relationType}
                onChangeText={setRelationType}
                placeholder="Or type your own (e.g. reports to)"
              />
              <FormField
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="How they're connected..."
                multiline
                className="min-h-16"
              />
              <PrimaryButton label="Add Relationship" icon="check" onPress={handleSubmit} />
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

function AiSuggestButton({ loading, disabled, onPress }: { loading: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      hitSlop={6}
      className={`flex-row items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 ${loading || disabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator size={12} color={Colors.accentBright} />
      ) : (
        <AppIcon name="sparkles" size={13} color={Colors.accentBright} />
      )}
      <Text className="text-xs font-semibold text-accent-bright">{loading ? "Thinking..." : "Suggest"}</Text>
    </Pressable>
  );
}

function AiError({ message }: { message: string }) {
  const notConfigured = message.includes("Settings");
  return (
    <Text className="mt-1 text-sm text-red-400">
      {message}{" "}
      {notConfigured && (
        <Text className="underline" onPress={() => router.push("/settings")}>
          Go to Settings
        </Text>
      )}
    </Text>
  );
}

export default function NpcDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const navigation = useNavigation();
  const { isPremium, appUserId } = useEntitlement();

  const [form, setForm] = useState<NpcInput>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [nameAiLoading, setNameAiLoading] = useState(false);
  const [nameAiError, setNameAiError] = useState<string | null>(null);
  const [descAiLoading, setDescAiLoading] = useState(false);
  const [descAiError, setDescAiError] = useState<string | null>(null);
  const [appearances, setAppearances] = useState<NpcAppearanceDetail[]>([]);
  const [relations, setRelations] = useState<NpcRelationDetail[]>([]);

  const refreshAppearances = useCallback(() => {
    if (!isNew) setAppearances(listAppearancesByNpc(Number(id)));
  }, [id, isNew]);

  const refreshRelations = useCallback(() => {
    if (!isNew) setRelations(listRelationsForNpc(Number(id)));
  }, [id, isNew]);

  useFocusEffect(refreshAppearances);
  useFocusEffect(refreshRelations);

  useEffect(() => {
    if (isNew) {
      setForm(BLANK_FORM);
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
      // Premium routes through the bundled backend (no key needed); free
      // tier keeps using the BYO-key flow unchanged.
      const name =
        isPremium && appUserId
          ? await generateNpcNamePremium(appUserId, { race: form.race, role: form.role, location: form.location })
          : await suggestNpcName({ race: form.race, role: form.role, location: form.location });
      setForm((previous) => ({ ...previous, name }));
    } catch (error) {
      setNameAiError(
        error instanceof AiNotConfiguredError
          ? "Add a Claude API key in Settings to use this."
          : error instanceof Error
            ? error.message
            : "AI suggestion failed."
      );
    } finally {
      setNameAiLoading(false);
    }
  }

  async function handleSuggestDescription() {
    if (!form.name.trim()) return;
    setDescAiLoading(true);
    setDescAiError(null);
    try {
      const details = { name: form.name, race: form.race, role: form.role, location: form.location };
      const description =
        isPremium && appUserId ? await generateNpcDescriptionPremium(appUserId, details) : await suggestNpcDescription(details);
      setForm((previous) => ({ ...previous, description }));
    } catch (error) {
      setDescAiError(
        error instanceof AiNotConfiguredError
          ? "Add a Claude API key in Settings to use this."
          : error instanceof Error
            ? error.message
            : "AI suggestion failed."
      );
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
              labelRight={<AiSuggestButton loading={nameAiLoading} onPress={handleSuggestName} />}
            />
            {nameAiError && <AiError message={nameAiError} />}
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
              labelRight={<AiSuggestButton loading={descAiLoading} disabled={!form.name.trim()} onPress={handleSuggestDescription} />}
            />
            {descAiError && <AiError message={descAiError} />}
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

        {!isNew && (
          <FormSection title="Relationships" description="How this NPC connects to others in your world." icon="link">
            {relations.length === 0 ? (
              <Text className="text-sm leading-5 text-muted">No relationships logged yet.</Text>
            ) : (
              <View className="gap-2">
                {relations.map((relation) => (
                  <View
                    key={relation.id}
                    className="flex-row items-start gap-3 rounded-2xl border border-panel-border bg-panel-raised p-3"
                  >
                    <View className="flex-1">
                      <Pressable onPress={() => router.push(`/npcs/${relation.otherNpcId}`)}>
                        <Text className="text-sm font-bold text-accent-bright">{relation.otherNpcName}</Text>
                      </Pressable>
                      {!!relation.relationType && (
                        <Text className="mt-0.5 text-xs text-muted">{relation.relationType}</Text>
                      )}
                      {!!relation.notes && (
                        <Text className="mt-1 text-xs leading-4 text-foreground/80">{relation.notes}</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => {
                        deleteNpcRelation(relation.id);
                        refreshRelations();
                      }}
                      hitSlop={8}
                    >
                      <AppIcon name="trash" size={15} color={Colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <RelationshipLogger npcId={Number(id)} onLogged={refreshRelations} />
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
