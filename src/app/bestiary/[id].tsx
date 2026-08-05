import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import {
  createBestiaryMonster,
  deleteBestiaryMonster,
  getBestiaryMonster,
  updateBestiaryMonster,
  type BestiaryInput,
} from "@/lib/bestiary";

const BLANK_FORM: BestiaryInput = {
  name: "",
  size: "",
  type: "",
  alignment: "",
  armor_class: null,
  hit_points: null,
  hit_dice: "",
  speed: "",
  challenge_rating: "",
  stat_block: "",
  source_note: "",
  tags: "",
};

type FormState = Omit<BestiaryInput, "armor_class" | "hit_points"> & {
  armor_class: string;
  hit_points: string;
};

function monsterToForm(m: BestiaryInput): FormState {
  return {
    ...m,
    armor_class: m.armor_class == null ? "" : String(m.armor_class),
    hit_points: m.hit_points == null ? "" : String(m.hit_points),
  } as FormState;
}

function formToPayload(form: FormState): BestiaryInput {
  return {
    ...form,
    armor_class: form.armor_class ? Number(form.armor_class) : null,
    hit_points: form.hit_points ? Number(form.hit_points) : null,
  };
}

export default function BestiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const navigation = useNavigation();

  const [form, setForm] = useState<FormState>(monsterToForm(BLANK_FORM));
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm(monsterToForm(BLANK_FORM));
      navigation.setOptions({ title: "New Monster" });
      return;
    }
    const monster = getBestiaryMonster(Number(id));
    if (!monster) {
      Alert.alert("Not found", "This monster no longer exists.");
      router.back();
      return;
    }
    setForm(monsterToForm(monster));
    navigation.setOptions({ title: monster.name });
  }, [id, isNew, navigation]);

  function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (isNew) {
        const created = createBestiaryMonster(payload);
        router.replace(`/bestiary/${created.id}`);
      } else {
        updateBestiaryMonster(Number(id), payload);
        navigation.setOptions({ title: form.name });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteBestiaryMonster(Number(id));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-3 p-4">
        <FormField
          label="Name"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
          placeholder="Bog Wretch"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="Size"
              value={form.size}
              onChangeText={(size) => setForm({ ...form, size })}
              placeholder="Medium"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Type"
              value={form.type}
              onChangeText={(type) => setForm({ ...form, type })}
              placeholder="Undead"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Alignment"
              value={form.alignment}
              onChangeText={(alignment) => setForm({ ...form, alignment })}
              placeholder="Chaotic evil"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="AC"
              value={form.armor_class}
              onChangeText={(armor_class) => setForm({ ...form, armor_class })}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="HP"
              value={form.hit_points}
              onChangeText={(hit_points) => setForm({ ...form, hit_points })}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Hit Dice"
              value={form.hit_dice}
              onChangeText={(hit_dice) => setForm({ ...form, hit_dice })}
              placeholder="4d8+4"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="CR"
              value={form.challenge_rating}
              onChangeText={(challenge_rating) => setForm({ ...form, challenge_rating })}
              placeholder="1/2"
            />
          </View>
        </View>
        <FormField
          label="Speed"
          value={form.speed}
          onChangeText={(speed) => setForm({ ...form, speed })}
          placeholder="30 ft., swim 30 ft."
        />
        <FormField
          label="Stat Block (abilities, traits, actions — freeform)"
          value={form.stat_block}
          onChangeText={(stat_block) => setForm({ ...form, stat_block })}
          placeholder={"STR 14 (+2), DEX 12 (+1)...\n\nActions\nBite. Melee Weapon Attack..."}
          multiline
          className="mt-1 min-h-40 rounded-md border border-panel-border bg-background px-3 py-2 font-mono text-sm text-foreground"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="Tags"
              value={form.tags}
              onChangeText={(tags) => setForm({ ...form, tags })}
              placeholder="swamp, undead"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Source"
              value={form.source_note}
              onChangeText={(source_note) => setForm({ ...form, source_note })}
              placeholder="Homebrew"
            />
          </View>
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
            label="Delete this monster?"
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
