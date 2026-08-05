import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { AiNotConfiguredError } from "@/lib/ai";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { createNpc, deleteNpc, getNpc, updateNpc, type NpcInput } from "@/lib/npcs";
import { suggestNpcDescription, suggestNpcName } from "@/lib/npc-ai";

const BLANK_FORM: NpcInput = { name: "", race: "", role: "", location: "", tags: "", description: "" };

function AiSuggestButton({ loading, disabled, onPress }: { loading: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={loading || disabled} hitSlop={6}>
      <Text className={`text-xs font-medium text-accent ${loading || disabled ? "opacity-50" : ""}`}>
        {loading ? "Thinking…" : "✨ Suggest with AI"}
      </Text>
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
          Go to Settings →
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
      setForm((prev) => ({ ...prev, name }));
    } catch (err) {
      setNameAiError(
        err instanceof AiNotConfiguredError
          ? "Add a Claude API key in Settings to use this."
          : err instanceof Error
            ? err.message
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
      setForm((prev) => ({ ...prev, description }));
    } catch (err) {
      setDescAiError(
        err instanceof AiNotConfiguredError
          ? "Add a Claude API key in Settings to use this."
          : err instanceof Error
            ? err.message
            : "AI suggestion failed."
      );
    } finally {
      setDescAiLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-3 p-4">
        <View>
          <FormField
            label="Name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            placeholder="Grimsby Ironhand"
            labelRight={
              nameAiLoading ? (
                <ActivityIndicator size="small" color="#d99a3f" />
              ) : (
                <AiSuggestButton loading={nameAiLoading} onPress={handleSuggestName} />
              )
            }
          />
          {nameAiError && <AiError message={nameAiError} />}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="Race"
              value={form.race}
              onChangeText={(race) => setForm({ ...form, race })}
              placeholder="Dwarf"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Role"
              value={form.role}
              onChangeText={(role) => setForm({ ...form, role })}
              placeholder="Blacksmith"
            />
          </View>
        </View>
        <FormField
          label="Location"
          value={form.location}
          onChangeText={(location) => setForm({ ...form, location })}
          placeholder="Ironhold Forge, Dockside"
        />
        <FormField
          label="Tags"
          value={form.tags}
          onChangeText={(tags) => setForm({ ...form, tags })}
          placeholder="ally, quest-giver, merchant"
        />
        <View>
          <FormField
            label="Description / Notes"
            value={form.description}
            onChangeText={(description) => setForm({ ...form, description })}
            placeholder="Appearance, personality, motivations, secrets…"
            multiline
            labelRight={
              descAiLoading ? (
                <ActivityIndicator size="small" color="#d99a3f" />
              ) : (
                <AiSuggestButton loading={descAiLoading} disabled={!form.name.trim()} onPress={handleSuggestDescription} />
              )
            }
          />
          {descAiError && <AiError message={descAiError} />}
        </View>

        <View className="flex-row gap-2 pt-2">
          <Pressable
            onPress={handleSave}
            disabled={saving || !form.name.trim()}
            className="rounded-md bg-accent px-5 py-2.5 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-medium text-accent-foreground">{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
          {!isNew && !confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && (
          <DeleteConfirmBar
            label="Delete this NPC?"
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
