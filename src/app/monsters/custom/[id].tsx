import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import {
  createBestiaryMonster,
  deleteBestiaryMonster,
  getBestiaryMonster,
  updateBestiaryMonster,
  type BestiaryInput,
} from "@/lib/bestiary";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

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

function monsterToForm(monster: BestiaryInput): FormState {
  return {
    ...monster,
    armor_class: monster.armor_class == null ? "" : String(monster.armor_class),
    hit_points: monster.hit_points == null ? "" : String(monster.hit_points),
  } as FormState;
}

function formToPayload(form: FormState): BestiaryInput {
  return {
    ...form,
    armor_class: form.armor_class ? Number(form.armor_class) : null,
    hit_points: form.hit_points ? Number(form.hit_points) : null,
  };
}

export default function CustomMonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const navigation = useNavigation();
  const [form, setForm] = useState<FormState>(monsterToForm(BLANK_FORM));
  const [baseline, setBaseline] = useState<FormState>(monsterToForm(BLANK_FORM));
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sizeRef = useRef<TextInput>(null);
  const typeRef = useRef<TextInput>(null);
  const alignmentRef = useRef<TextInput>(null);
  const armorClassRef = useRef<TextInput>(null);
  const hitPointsRef = useRef<TextInput>(null);
  const hitDiceRef = useRef<TextInput>(null);
  const challengeRatingRef = useRef<TextInput>(null);
  const speedRef = useRef<TextInput>(null);
  const tagsRef = useRef<TextInput>(null);
  const sourceRef = useRef<TextInput>(null);

  // Screens reached via router.push can be reused by the navigator rather
  // than remounted, so a "New Monster" form could otherwise keep showing
  // whatever an earlier, unsaved draft last typed into it. Resetting on
  // every focus (not just mount) guarantees "New Monster" always starts blank.
  useFocusEffect(
    useCallback(() => {
      if (isNew) {
        setForm(monsterToForm(BLANK_FORM));
        setBaseline(monsterToForm(BLANK_FORM));
      }
    }, [isNew])
  );

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const allowLeave = useUnsavedChangesGuard(
    isDirty,
    isNew
      ? "This monster hasn't been saved. If you go back now, it will be lost."
      : "This monster has unsaved changes. If you go back now, they will be lost."
  );

  useEffect(() => {
    if (isNew) {
      const timeout = setTimeout(() => {
        setForm(monsterToForm(BLANK_FORM));
        setBaseline(monsterToForm(BLANK_FORM));
        navigation.setOptions({ title: "New Monster" });
      }, 0);
      return () => clearTimeout(timeout);
    }
    const monster = getBestiaryMonster(Number(id));
    if (!monster) {
      Alert.alert("Not found", "This monster no longer exists.");
      router.back();
      return;
    }
    const timeout = setTimeout(() => {
      setForm(monsterToForm(monster));
      setBaseline(monsterToForm(monster));
      navigation.setOptions({ title: monster.name });
    }, 0);
    return () => clearTimeout(timeout);
  }, [id, isNew, navigation]);

  function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (isNew) {
        const created = createBestiaryMonster(payload);
        allowLeave();
        router.replace(`/monsters/custom/${created.id}`);
      } else {
        updateBestiaryMonster(Number(id), payload);
        setBaseline(form);
        allowLeave();
        navigation.setOptions({ title: form.name });
      }
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    allowLeave();
    deleteBestiaryMonster(Number(id));
    router.back();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection title="Identity" description="Define the creature and how it appears in the bestiary." icon="monsters">
          <FormField
            label="Name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            placeholder="Bog Wretch"
            returnKeyType="next"
            onSubmitEditing={() => sizeRef.current?.focus()}
            blurOnSubmit={false}
          />
          <View className="flex-row gap-4">
            <View className="flex-1">
              <FormField
                ref={sizeRef}
                label="Size"
                value={form.size}
                onChangeText={(size) => setForm({ ...form, size })}
                placeholder="Medium"
                returnKeyType="next"
                onSubmitEditing={() => typeRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View className="flex-1">
              <FormField
                ref={typeRef}
                label="Type"
                value={form.type}
                onChangeText={(type) => setForm({ ...form, type })}
                placeholder="Undead"
                returnKeyType="next"
                onSubmitEditing={() => alignmentRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>
          <FormField
            ref={alignmentRef}
            label="Alignment"
            value={form.alignment}
            onChangeText={(alignment) => setForm({ ...form, alignment })}
            placeholder="Chaotic evil"
            returnKeyType="next"
            onSubmitEditing={() => armorClassRef.current?.focus()}
            blurOnSubmit={false}
          />
        </FormSection>

        <FormSection title="Combat profile" description="The numbers you will reference most often at the table." icon="encounters">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <FormField
                ref={armorClassRef}
                label="Armor class"
                value={form.armor_class}
                onChangeText={(armor_class) => setForm({ ...form, armor_class })}
                keyboardType="number-pad"
                placeholder="12"
                returnKeyType="next"
                onSubmitEditing={() => hitPointsRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View className="flex-1">
              <FormField
                ref={hitPointsRef}
                label="Hit points"
                value={form.hit_points}
                onChangeText={(hit_points) => setForm({ ...form, hit_points })}
                keyboardType="number-pad"
                placeholder="22"
                returnKeyType="next"
                onSubmitEditing={() => hitDiceRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <FormField
                ref={hitDiceRef}
                label="Hit dice"
                value={form.hit_dice}
                onChangeText={(hit_dice) => setForm({ ...form, hit_dice })}
                placeholder="4d8+4"
                returnKeyType="next"
                onSubmitEditing={() => challengeRatingRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View className="flex-1">
              <FormField
                ref={challengeRatingRef}
                label="Challenge rating"
                value={form.challenge_rating}
                onChangeText={(challenge_rating) => setForm({ ...form, challenge_rating })}
                placeholder="1/2"
                returnKeyType="next"
                onSubmitEditing={() => speedRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>
          <FormField
            ref={speedRef}
            label="Speed"
            value={form.speed}
            onChangeText={(speed) => setForm({ ...form, speed })}
            placeholder="30 ft., swim 30 ft."
            returnKeyType="done"
          />
        </FormSection>

        <FormSection title="Stat block" description="Add abilities, traits, attacks, reactions, and special rules in freeform text." icon="document">
          <FormField
            label="Abilities, traits & actions"
            value={form.stat_block}
            onChangeText={(stat_block) => setForm({ ...form, stat_block })}
            placeholder={"STR 14 (+2), DEX 12 (+1)...\n\nActions\nBite. Melee Weapon Attack..."}
            multiline
            className="min-h-56 font-mono"
          />
        </FormSection>

        <FormSection title="Organization" description="Add searchable tags and a source note for future reference." icon="tag">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <FormField
                ref={tagsRef}
                label="Tags"
                value={form.tags}
                onChangeText={(tags) => setForm({ ...form, tags })}
                placeholder="swamp, undead"
                returnKeyType="next"
                onSubmitEditing={() => sourceRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View className="flex-1">
              <FormField
                ref={sourceRef}
                label="Source"
                value={form.source_note}
                onChangeText={(source_note) => setForm({ ...form, source_note })}
                placeholder="Homebrew"
                returnKeyType="done"
              />
            </View>
          </View>
        </FormSection>

        <View className="gap-3 pt-1">
          <PrimaryButton label={saving ? "Saving..." : isNew ? "Create monster" : "Save changes"} icon="check" onPress={handleSave} disabled={saving || !form.name.trim()} />
          {!isNew && !confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && <DeleteConfirmBar label="Delete this monster?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />}
      </ScrollView>
      <SaveToast visible={savedToast} message="Monster saved" onHide={() => setSavedToast(false)} />
    </KeyboardAvoidingView>
  );
}
