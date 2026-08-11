import { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton, SecondaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import { Colors } from "@/constants/colors";
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
  const [savedToast, setSavedToast] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      const timeout = setTimeout(() => {
        setForm(BLANK_FORM);
        navigation.setOptions({ title: "New Map" });
      }, 0);
      return () => clearTimeout(timeout);
    }
    const map = getMap(Number(id));
    if (!map) {
      Alert.alert("Not found", "This map no longer exists.");
      router.back();
      return;
    }
    const timeout = setTimeout(() => {
      setForm(map);
      setExistingFilePath(map.file_path);
      navigation.setOptions({ title: map.name });
    }, 0);
    return () => clearTimeout(timeout);
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
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteMap(Number(id));
    router.back();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection title="Map details" description="Name and tag this location so it is quick to find during play." icon="maps">
          <FormField label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="The Sunken Temple" />
          <FormField label="Tags" value={form.tags} onChangeText={(tags) => setForm({ ...form, tags })} placeholder="dungeon, act-2" />
        </FormSection>

        <FormSection title="Map source" description={isNew ? "Add an image from this device or save a link to an online map." : "Preview or open the saved map source."} icon={form.type === "image" ? "image" : "link"}>
          {!isNew && form.type === "image" && existingFilePath ? (
            <Image source={{ uri: existingFilePath }} className="h-60 w-full rounded-2xl border border-panel-border bg-background" resizeMode="contain" />
          ) : null}
          {!isNew && form.type === "link" && form.url ? (
            <SecondaryButton label="Open saved map" icon="link" onPress={() => void Linking.openURL(form.url!)} />
          ) : null}

          {isNew ? (
            <>
              <View className="flex-row gap-3">
                {(["image", "link"] as MapType[]).map((type) => {
                  const selected = form.type === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setForm({ ...form, type })}
                      className={`flex-1 items-center gap-2 rounded-2xl border p-4 ${selected ? "border-accent bg-accent-soft" : "border-panel-border bg-panel-raised"}`}
                    >
                      <AppIcon name={type === "image" ? "image" : "link"} size={24} color={selected ? Colors.accentBright : Colors.muted} />
                      <Text className={`text-sm font-semibold ${selected ? "text-accent-bright" : "text-foreground"}`}>
                        {type === "image" ? "Device image" : "External link"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {form.type === "image" ? (
                <View className="gap-3">
                  <SecondaryButton label={pickedUri ? "Choose a different image" : "Choose image"} icon="image" onPress={handlePickImage} />
                  {pickedUri ? <Image source={{ uri: pickedUri }} className="h-52 w-full rounded-2xl border border-panel-border bg-background" resizeMode="contain" /> : null}
                </View>
              ) : (
                <FormField label="Map URL" value={form.url ?? ""} onChangeText={(url) => setForm({ ...form, url })} placeholder="https://..." autoCapitalize="none" keyboardType="url" />
              )}
              {pickError ? <Text className="text-sm text-red-400">{pickError}</Text> : null}
            </>
          ) : null}
        </FormSection>

        <FormSection title="DM notes" description="Keep location context, encounter hooks, or reveal instructions close by." icon="notes">
          <FormField label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Hidden doors, keyed areas, encounter notes..." multiline className="min-h-40" />
        </FormSection>

        <View className="gap-3 pt-1">
          <PrimaryButton label={saving ? "Saving..." : isNew ? "Add map" : "Save changes"} icon="check" onPress={handleSave} disabled={saving || !form.name.trim()} />
          {!isNew && !confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && <DeleteConfirmBar label="Delete this map?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />}
      </ScrollView>
      <SaveToast visible={savedToast} message="Map saved" onHide={() => setSavedToast(false)} />
    </KeyboardAvoidingView>
  );
}
