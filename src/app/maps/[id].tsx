import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { saveImageToMaps } from "@/lib/local-files";
import { createMap, deleteMap, getMap, updateMap, type MapInput, type MapType } from "@/lib/maps";

const BLANK_FORM: MapInput = { name: "", type: "image", url: "", notes: "", tags: "" };

export default function MapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const navigation = useNavigation();

  const [form, setForm] = useState<MapInput>(BLANK_FORM);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [existingFilePath, setExistingFilePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm(BLANK_FORM);
      navigation.setOptions({ title: "New Map" });
      return;
    }
    const map = getMap(Number(id));
    if (!map) {
      Alert.alert("Not found", "This map no longer exists.");
      router.back();
      return;
    }
    setForm(map);
    setExistingFilePath(map.file_path);
    navigation.setOptions({ title: map.name });
  }, [id, isNew, navigation]);

  async function handlePickImage() {
    setPickError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError("Photo library permission is required to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
    if (result.canceled) return;
    setPickedUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setPickError(null);
    setSaving(true);
    try {
      if (isNew) {
        let file_path: string | undefined;
        if (form.type === "image") {
          if (!pickedUri) {
            setPickError("Choose an image to save.");
            return;
          }
          const extension = pickedUri.split(".").pop()?.toLowerCase() || "jpg";
          file_path = await saveImageToMaps(pickedUri, extension);
        } else if (!form.url?.trim()) {
          setPickError("Paste a link.");
          return;
        }
        const created = createMap({ ...form, file_path });
        router.replace(`/maps/${created.id}`);
      } else {
        updateMap(Number(id), form);
        navigation.setOptions({ title: form.name });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteMap(Number(id));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-3 p-4">
        {!isNew && form.type === "image" && existingFilePath && (
          <Image
            source={{ uri: existingFilePath }}
            className="h-56 w-full rounded-md border border-panel-border"
            resizeMode="contain"
          />
        )}
        {!isNew && form.type === "link" && !!form.url && (
          <Pressable
            onPress={() => Linking.openURL(form.url!)}
            className="items-center self-start rounded-md bg-accent px-4 py-2.5 active:opacity-80"
          >
            <Text className="font-medium text-accent-foreground">Open Map ↗</Text>
          </Pressable>
        )}

        <FormField
          label="Name"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
          placeholder="The Sunken Temple"
        />

        {isNew && (
          <View>
            <Text className="text-xs font-medium text-muted">Type</Text>
            <View className="mt-1 flex-row gap-4">
              {(["image", "link"] as MapType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setForm({ ...form, type: t })}
                  className="flex-row items-center gap-1.5"
                >
                  <View
                    className={`h-4 w-4 rounded-full border ${form.type === t ? "border-accent bg-accent" : "border-panel-border"}`}
                  />
                  <Text className="text-sm text-foreground">
                    {t === "image" ? "Upload image" : "External link"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {form.type === "image" ? (
              <View className="mt-2 gap-2">
                <Pressable
                  onPress={handlePickImage}
                  className="items-center self-start rounded-md border border-panel-border px-4 py-2 active:bg-white/5"
                >
                  <Text className="text-sm text-foreground">Choose image…</Text>
                </Pressable>
                {pickedUri && (
                  <Image
                    source={{ uri: pickedUri }}
                    className="h-40 w-full rounded-md border border-panel-border"
                    resizeMode="contain"
                  />
                )}
              </View>
            ) : (
              <FormField
                label=""
                value={form.url ?? ""}
                onChangeText={(url) => setForm({ ...form, url })}
                placeholder="https://…"
                autoCapitalize="none"
                keyboardType="url"
              />
            )}
            {pickError && <Text className="mt-1 text-sm text-red-400">{pickError}</Text>}
          </View>
        )}

        <FormField
          label="Tags"
          value={form.tags}
          onChangeText={(tags) => setForm({ ...form, tags })}
          placeholder="dungeon, act-2"
        />
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(notes) => setForm({ ...form, notes })}
          multiline
        />

        <View className="flex-row gap-2 pt-1">
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
            label="Delete this map?"
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
