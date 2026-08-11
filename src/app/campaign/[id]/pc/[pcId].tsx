import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import {
  createCampaignPc,
  deleteCampaignPc,
  getCampaignPc,
  updateCampaignPc,
} from "@/lib/campaigns";

interface FormState {
  name: string;
  classLevel: string;
  maxHp: string;
  ac: string;
  notes: string;
}

const BLANK_FORM: FormState = { name: "", classLevel: "", maxHp: "", ac: "", notes: "" };

export default function CampaignPcScreen() {
  const { id, pcId } = useLocalSearchParams<{ id: string; pcId: string }>();
  const campaignId = Number(id);
  const isNew = pcId === "new";
  const navigation = useNavigation();
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isNew) {
        navigation.setOptions({ title: "Add PC" });
        return;
      }
      const pc = getCampaignPc(Number(pcId));
      if (!pc) {
        Alert.alert("Not found", "This PC no longer exists.");
        router.back();
        return;
      }
      setForm({
        name: pc.name,
        classLevel: pc.classLevel,
        maxHp: String(pc.maxHp),
        ac: pc.ac === null ? "" : String(pc.ac),
        notes: pc.notes,
      });
      navigation.setOptions({ title: pc.name });
    }, 0);
    return () => clearTimeout(timeout);
  }, [pcId, isNew, navigation]);

  function handleSave() {
    const maxHp = Number(form.maxHp);
    const ac = Number(form.ac);
    if (!form.name.trim() || !form.maxHp.trim() || !form.ac.trim()) {
      Alert.alert("Required fields", "Name, Max HP, and Armor Class are required.");
      return;
    }
    if (!Number.isInteger(maxHp) || maxHp < 1) {
      Alert.alert("Invalid Max HP", "Max HP must be a whole number greater than zero.");
      return;
    }
    if (!Number.isInteger(ac) || ac < 0) {
      Alert.alert("Invalid Armor Class", "Armor Class must be a whole number of zero or greater.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        campaignId,
        name: form.name.trim(),
        classLevel: form.classLevel.trim(),
        maxHp,
        ac,
        notes: form.notes,
      };
      if (isNew) {
        const created = createCampaignPc(payload);
        router.replace(`/campaign/${campaignId}/pc/${created.id}`);
      } else {
        updateCampaignPc(Number(pcId), payload);
        navigation.setOptions({ title: payload.name });
      }
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteCampaignPc(Number(pcId));
    router.back();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection title="Character" description="Who's playing, and what are they running." icon="person">
          <FormField label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Alfonzo" />
          <FormField
            label="Class & Level"
            value={form.classLevel}
            onChangeText={(classLevel) => setForm({ ...form, classLevel })}
            placeholder="Fighter 5"
          />
        </FormSection>

        <FormSection title="Combat profile" description="Seeds the encounter tracker when this PC joins a fight." icon="encounters">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Max HP *" value={form.maxHp} onChangeText={(maxHp) => setForm({ ...form, maxHp })} keyboardType="number-pad" placeholder="44" />
            </View>
            <View className="flex-1">
              <FormField label="Armor class *" value={form.ac} onChangeText={(ac) => setForm({ ...form, ac })} keyboardType="number-pad" placeholder="17" />
            </View>
          </View>
        </FormSection>

        <FormSection title="Notes" description="Anything worth remembering about this character." icon="notes">
          <FormField label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Backstory beats, goals, quirks..." multiline className="min-h-32" />
        </FormSection>

        <View className="gap-3 pt-1">
          <PrimaryButton
            label={saving ? "Saving..." : isNew ? "Add PC" : "Save changes"}
            icon="check"
            onPress={handleSave}
            disabled={saving || !form.name.trim() || !form.maxHp.trim() || !form.ac.trim()}
          />
          {!isNew && !confirmingDelete && <DeleteButton label="Remove PC" onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && <DeleteConfirmBar label="Remove this PC from the campaign?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />}
      </ScrollView>
      <SaveToast visible={savedToast} message="Saved" onHide={() => setSavedToast(false)} />
    </KeyboardAvoidingView>
  );
}
