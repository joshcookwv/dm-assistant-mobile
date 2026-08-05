import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { createNote, deleteNote, getNote, updateNote, type NoteInput } from "@/lib/notes";

const BLANK_FORM: NoteInput = { title: "", content: "", tags: "" };

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const navigation = useNavigation();

  const [form, setForm] = useState<NoteInput>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm(BLANK_FORM);
      navigation.setOptions({ title: "New Note" });
      return;
    }
    const note = getNote(Number(id));
    if (!note) {
      Alert.alert("Not found", "This note no longer exists.");
      router.back();
      return;
    }
    setForm(note);
    navigation.setOptions({ title: note.title });
  }, [id, isNew, navigation]);

  function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = createNote(form);
        router.replace(`/notes/${created.id}`);
      } else {
        updateNote(Number(id), form);
        navigation.setOptions({ title: form.title });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteNote(Number(id));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-3 p-4">
        <FormField
          label="Title"
          value={form.title}
          onChangeText={(title) => setForm({ ...form, title })}
          placeholder="Session 4 recap"
        />
        <FormField
          label="Tags"
          value={form.tags}
          onChangeText={(tags) => setForm({ ...form, tags })}
          placeholder="session-log, dockside, plot-hook"
        />
        <FormField
          label="Content (Markdown)"
          value={form.content}
          onChangeText={(content) => setForm({ ...form, content })}
          placeholder="Write your notes here…"
          multiline
          className="mt-1 min-h-64 rounded-md border border-panel-border bg-background px-3 py-2 font-mono text-sm text-foreground"
        />

        <View className="flex-row gap-2 pt-1">
          <Pressable
            onPress={handleSave}
            disabled={saving || !form.title.trim()}
            className="rounded-md bg-accent px-5 py-2.5 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-medium text-accent-foreground">{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
          {!isNew && !confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && (
          <DeleteConfirmBar
            label="Delete this note?"
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
