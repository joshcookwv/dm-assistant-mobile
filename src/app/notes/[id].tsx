import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import {
  getCampaignLocation,
  listCampaignLocations,
  listCampaigns,
  type CampaignSummary,
  type LocationSummary,
} from "@/lib/campaigns";
import { createNote, deleteNote, getNote, updateNote, type NoteInput } from "@/lib/notes";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

const BLANK_FORM: NoteInput = { title: "", content: "", tags: "", campaignId: null, locationId: null };

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

export default function NoteDetailScreen() {
  const { id, location: locationParam, campaign: campaignParam } = useLocalSearchParams<{
    id: string;
    location?: string;
    campaign?: string;
  }>();
  const isNew = id === "new";
  const navigation = useNavigation();
  const [form, setForm] = useState<NoteInput>(BLANK_FORM);
  const [baseline, setBaseline] = useState<NoteInput>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [pickerCampaigns, setPickerCampaigns] = useState<CampaignSummary[]>([]);
  const [pickerCampaignId, setPickerCampaignId] = useState<number | null>(null);
  const [pickerLocations, setPickerLocations] = useState<LocationSummary[]>([]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const allowLeave = useUnsavedChangesGuard(
    isDirty,
    isNew
      ? "This note hasn't been saved. If you go back now, it will be lost."
      : "This note has unsaved changes. If you go back now, they will be lost."
  );

  useEffect(() => {
    if (isNew) {
      const campaignId = campaignParam ? Number(campaignParam) : null;
      const locationId = locationParam ? Number(locationParam) : null;
      const timeout = setTimeout(() => {
        const prefilled = { ...BLANK_FORM, campaignId, locationId };
        setForm(prefilled);
        setBaseline(prefilled);
        if (locationId) setLocationName(getCampaignLocation(locationId)?.name ?? null);
        navigation.setOptions({ title: "New Note" });
      }, 0);
      return () => clearTimeout(timeout);
    }
    const note = getNote(Number(id));
    if (!note) {
      Alert.alert("Not found", "This note no longer exists.");
      router.back();
      return;
    }
    const timeout = setTimeout(() => {
      const loaded = {
        title: note.title,
        content: note.content,
        tags: note.tags,
        campaignId: note.campaign_id,
        locationId: note.location_id,
      };
      setForm(loaded);
      setBaseline(loaded);
      if (note.location_id) setLocationName(getCampaignLocation(note.location_id)?.name ?? null);
      navigation.setOptions({ title: note.title });
    }, 0);
    return () => clearTimeout(timeout);
  }, [id, isNew, navigation, locationParam, campaignParam]);

  function openLocationPicker() {
    setPickerCampaigns(listCampaigns());
    setPickerCampaignId(form.campaignId ?? null);
    setPickerLocations(form.campaignId ? listCampaignLocations(form.campaignId) : []);
    setLocationPickerOpen(true);
  }

  function handlePickCampaign(campaignId: number) {
    setPickerCampaignId(campaignId);
    setPickerLocations(listCampaignLocations(campaignId));
  }

  function handlePickLocation(location: LocationSummary) {
    setForm((previous) => ({ ...previous, campaignId: location.campaignId, locationId: location.id }));
    setLocationName(location.name);
    setLocationPickerOpen(false);
  }

  function handleClearLocation() {
    setForm((previous) => ({ ...previous, campaignId: null, locationId: null }));
    setLocationName(null);
    setLocationPickerOpen(false);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = createNote(form);
        allowLeave();
        router.replace(`/notes/${created.id}`);
      } else {
        updateNote(Number(id), form);
        setBaseline(form);
        allowLeave();
        navigation.setOptions({ title: form.title });
      }
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    allowLeave();
    deleteNote(Number(id));
    router.back();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection title="Note details" description="Give this page a clear title and searchable campaign tags." icon="document">
          <FormField label="Title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Session 4 recap" />
          <FormField label="Tags" value={form.tags} onChangeText={(tags) => setForm({ ...form, tags })} placeholder="session-log, dockside, plot-hook" />
        </FormSection>

        <FormSection title="Content" description="Markdown formatting is supported for structured campaign notes." icon="notes">
          <FormField
            label="Markdown"
            value={form.content}
            onChangeText={(content) => setForm({ ...form, content })}
            placeholder="Write your notes here..."
            multiline
            className="min-h-72 font-mono"
          />
        </FormSection>

        <FormSection title="Location" description="Optionally tag this note to a place in one of your campaigns." icon="maps">
          <View className="flex-row items-center justify-between rounded-2xl border border-panel-border bg-panel-raised px-3.5 py-3">
            <Text className="text-sm text-foreground">{locationName ?? "Unfiled"}</Text>
            <Pressable onPress={openLocationPicker} hitSlop={8}>
              <Text className="text-xs font-semibold text-accent-bright">{locationName ? "Change" : "Set Location"}</Text>
            </Pressable>
          </View>
          {locationPickerOpen && (
            <View className="gap-3 rounded-2xl border border-panel-border bg-panel p-3.5">
              {pickerCampaigns.length === 0 ? (
                <Text className="text-sm text-muted">No campaigns yet.</Text>
              ) : (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Campaign</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {pickerCampaigns.map((campaign) => (
                      <Chip key={campaign.id} label={campaign.name} selected={pickerCampaignId === campaign.id} onPress={() => handlePickCampaign(campaign.id)} />
                    ))}
                  </View>
                  {pickerCampaignId && (
                    <>
                      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Location</Text>
                      {pickerLocations.length === 0 ? (
                        <Text className="text-sm text-muted">This campaign has no locations yet.</Text>
                      ) : (
                        <View className="flex-row flex-wrap gap-2">
                          {pickerLocations.map((location) => (
                            <Chip key={location.id} label={location.name} selected={form.locationId === location.id} onPress={() => handlePickLocation(location)} />
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
              <View className="flex-row justify-between">
                <Pressable onPress={handleClearLocation}>
                  <Text className="text-xs text-muted">Clear</Text>
                </Pressable>
                <Pressable onPress={() => setLocationPickerOpen(false)}>
                  <Text className="text-xs text-accent-bright">Done</Text>
                </Pressable>
              </View>
            </View>
          )}
        </FormSection>

        <View className="gap-3 pt-1">
          <PrimaryButton label={saving ? "Saving..." : isNew ? "Create note" : "Save changes"} icon="check" onPress={handleSave} disabled={saving || !form.title.trim()} />
          {!isNew && !confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && <DeleteConfirmBar label="Delete this note?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />}
      </ScrollView>
      <SaveToast visible={savedToast} message="Note saved" onHide={() => setSavedToast(false)} />
    </KeyboardAvoidingView>
  );
}
