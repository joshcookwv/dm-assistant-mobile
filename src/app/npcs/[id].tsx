import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import { Colors } from "@/constants/colors";
import { AiNotConfiguredError } from "@/lib/ai";
import { suggestNpcDescription, suggestNpcName } from "@/lib/npc-ai";
import { createNpc, deleteNpc, getNpc, updateNpc, type NpcInput } from "@/lib/npcs";

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

  const [form, setForm] = useState<NpcInput>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [nameAiLoading, setNameAiLoading] = useState(false);
  const [nameAiError, setNameAiError] = useState<string | null>(null);
  const [descAiLoading, setDescAiLoading] = useState(false);
  const [descAiError, setDescAiError] = useState<string | null>(null);

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
      const name = await suggestNpcName({ race: form.race, role: form.role, location: form.location });
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
      const description = await suggestNpcDescription({
        name: form.name,
        race: form.race,
        role: form.role,
        location: form.location,
      });
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
