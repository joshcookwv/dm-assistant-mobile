import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { NpcPickerModal } from "@/components/npc-picker-modal";
import { PrimaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import {
  createCampaignLocation,
  createNpcAppearance,
  deleteCampaignLocation,
  getCampaignLocation,
  listAppearancesByLocation,
  updateCampaignLocation,
  type LocationAppearance,
} from "@/lib/campaigns";
import { createEncounter, listEncountersByLocation, type Encounter } from "@/lib/encounters";
import { listNotesByLocation, type Note } from "@/lib/notes";
import type { Npc } from "@/lib/npcs";

export default function CampaignLocationScreen() {
  const { id, locationId } = useLocalSearchParams<{ id: string; locationId: string }>();
  const campaignId = Number(id);
  const isNew = locationId === "new";
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [appearances, setAppearances] = useState<LocationAppearance[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const refresh = useCallback(() => {
    if (isNew) {
      navigation.setOptions({ title: "New Location" });
      return;
    }
    const location = getCampaignLocation(Number(locationId));
    if (!location) {
      Alert.alert("Not found", "This location no longer exists.");
      router.back();
      return;
    }
    setName(location.name);
    setDescription(location.description);
    navigation.setOptions({ title: location.name });
    setAppearances(listAppearancesByLocation(location.id));
    setEncounters(listEncountersByLocation(location.id));
    setNotes(listNotesByLocation(location.id));
  }, [locationId, isNew, navigation]);

  useFocusEffect(refresh);

  function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = createCampaignLocation({ campaignId, name: name.trim(), description });
        router.replace(`/campaign/${campaignId}/location/${created.id}`);
      } else {
        updateCampaignLocation(Number(locationId), { campaignId, name: name.trim(), description });
        navigation.setOptions({ title: name.trim() });
        refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function handleLogNpc(npc: Npc) {
    createNpcAppearance({ npcId: npc.id, locationId: Number(locationId) });
    setAppearances(listAppearancesByLocation(Number(locationId)));
  }

  function handleStartEncounter() {
    const encounter = createEncounter(name || "Encounter", { campaignId, locationId: Number(locationId) });
    router.push(`/encounters/${encounter.id}`);
  }

  function handleDelete() {
    deleteCampaignLocation(Number(locationId));
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-10">
      <FormSection title="Location" description="Where your party is, or has been." icon="maps">
        <FormField label="Name" value={name} onChangeText={setName} placeholder="The Sunken Temple" />
        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What's here, who runs it, why it matters..."
          multiline
          className="min-h-24"
        />
        <PrimaryButton label={saving ? "Saving..." : isNew ? "Create Location" : "Save changes"} icon="check" onPress={handleSave} disabled={saving || !name.trim()} />
      </FormSection>

      {!isNew && (
        <>
          <PrimaryButton label="Start Encounter Here" icon="encounters" onPress={handleStartEncounter} />

          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
                NPCs here ({appearances.length})
              </Text>
              <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
                <Text className="text-xs font-semibold text-accent-bright">+ Log NPC</Text>
              </Pressable>
            </View>
            {appearances.length === 0 ? (
              <Text className="text-sm leading-5 text-muted">No NPCs logged here yet.</Text>
            ) : (
              <View className="gap-2">
                {appearances.map((appearance) => (
                  <Pressable
                    key={appearance.id}
                    onPress={() => router.push(`/npcs/${appearance.npcId}`)}
                    className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
                      <AppIcon name="npcs" size={17} color={Colors.accentBright} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{appearance.npcName}</Text>
                      {!!appearance.notes && <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>{appearance.notes}</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View>
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/80">
              Encounters here ({encounters.length})
            </Text>
            {encounters.length === 0 ? (
              <Text className="text-sm leading-5 text-muted">Nothing&apos;s happened here yet.</Text>
            ) : (
              <View className="gap-2">
                {encounters.map((encounter) => (
                  <Pressable
                    key={encounter.id}
                    onPress={() => router.push(`/encounters/${encounter.id}`)}
                    className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
                      <AppIcon name="encounters" size={17} color={Colors.accentBright} />
                    </View>
                    <Text className="flex-1 font-semibold text-foreground">{encounter.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
                Notes here ({notes.length})
              </Text>
              <Pressable onPress={() => router.push(`/notes/new?location=${locationId}&campaign=${campaignId}`)} hitSlop={8}>
                <Text className="text-xs font-semibold text-accent-bright">+ Add Note</Text>
              </Pressable>
            </View>
            {notes.length === 0 ? (
              <Text className="text-sm leading-5 text-muted">No notes tagged to this location yet.</Text>
            ) : (
              <View className="gap-2">
                {notes.map((note) => (
                  <Pressable
                    key={note.id}
                    onPress={() => router.push(`/notes/${note.id}`)}
                    className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
                      <AppIcon name="notes" size={17} color={Colors.accentBright} />
                    </View>
                    <Text className="flex-1 font-semibold text-foreground" numberOfLines={1}>{note.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View className="mt-2 border-t border-panel-border pt-4">
            {!confirmingDelete && <DeleteButton label="Delete Location" onPress={() => setConfirmingDelete(true)} />}
            {confirmingDelete && (
              <DeleteConfirmBar label="Delete this location?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />
            )}
          </View>

          <NpcPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleLogNpc} />
        </>
      )}
    </ScrollView>
  );
}
