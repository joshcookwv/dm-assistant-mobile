import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { SaveToast } from "@/components/save-toast";
import { Colors } from "@/constants/colors";
import { createSessionMember, deleteSessionMember, getSessionMember, updateSessionMember } from "@/lib/session";

interface FormState {
  name: string;
  maxHp: string;
  ac: string;
  isPc: boolean;
  quantity: string;
  notes: string;
}

const BLANK_FORM: FormState = { name: "", maxHp: "", ac: "", isPc: false, quantity: "1", notes: "" };

export default function SessionMemberScreen() {
  const { memberId, session, pc } = useLocalSearchParams<{ memberId: string; session?: string; pc?: string }>();
  const isNew = memberId === "new";
  const navigation = useNavigation();
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [sessionId, setSessionId] = useState<number>(Number(session) || 0);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm({ ...BLANK_FORM, isPc: pc === "1" });
      setSessionId(Number(session) || 0);
      navigation.setOptions({ title: pc === "1" ? "Add PC" : "Add to Session" });
      return;
    }
    const member = getSessionMember(Number(memberId));
    if (!member) {
      Alert.alert("Not found", "This session entry no longer exists.");
      router.back();
      return;
    }
    setSessionId(member.sessionId);
    setForm({
      name: member.name,
      maxHp: String(member.maxHp),
      ac: member.ac === null ? "" : String(member.ac),
      isPc: member.isPc,
      quantity: String(member.quantity),
      notes: member.notes,
    });
    navigation.setOptions({ title: member.name });
  }, [memberId, isNew, session, pc, navigation]);

  function handleSave() {
    if (!form.name.trim() || !sessionId) return;
    setSaving(true);
    try {
      const payload = {
        sessionId,
        name: form.name.trim(),
        maxHp: Number(form.maxHp) || 0,
        ac: form.ac ? Number(form.ac) || 0 : null,
        isPc: form.isPc,
        quantity: Math.max(1, Number(form.quantity) || 1),
        notes: form.notes,
      };
      if (isNew) {
        const created = createSessionMember(payload);
        router.replace(`/session/member/${created.id}`);
      } else {
        updateSessionMember(Number(memberId), payload);
        navigation.setOptions({ title: payload.name });
      }
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    deleteSessionMember(Number(memberId));
    router.back();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection title="Identity" description="Set the display name and whether this entry represents a player character." icon="person">
          <FormField label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Alfonzo" />
          <View className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel-raised p-3.5">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Player character</Text>
              <Text className="mt-0.5 text-xs leading-4 text-muted">PCs stay visually distinct in session and encounter views.</Text>
            </View>
            <Switch
              value={form.isPc}
              onValueChange={(isPc) => setForm({ ...form, isPc })}
              trackColor={{ false: Colors.panelBorder, true: Colors.accent }}
              thumbColor={Colors.foreground}
            />
          </View>
        </FormSection>

        <FormSection title="Combat profile" description="These values seed the encounter tracker when combat begins." icon="encounters">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Max HP" value={form.maxHp} onChangeText={(maxHp) => setForm({ ...form, maxHp })} keyboardType="number-pad" placeholder="24" />
            </View>
            <View className="flex-1">
              <FormField label="Armor class" value={form.ac} onChangeText={(ac) => setForm({ ...form, ac })} keyboardType="number-pad" placeholder="15" />
            </View>
          </View>
          <FormField label="Quantity" value={form.quantity} onChangeText={(quantity) => setForm({ ...form, quantity })} keyboardType="number-pad" placeholder="1" />
          <View className="rounded-xl bg-accent-soft px-3.5 py-3">
            <Text className="text-xs leading-5 text-accent-bright">A quantity above 1 creates numbered copies when you start an encounter.</Text>
          </View>
        </FormSection>

        <FormSection title="Session notes" description="Add tactics, reminders, conditions, or roleplay cues." icon="notes">
          <FormField label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Ambush from the treeline, flees below 5 HP..." multiline className="min-h-40" />
        </FormSection>

        <View className="gap-3 pt-1">
          <PrimaryButton label={saving ? "Saving..." : isNew ? "Add to session" : "Save changes"} icon="check" onPress={handleSave} disabled={saving || !form.name.trim()} />
          {!isNew && !confirmingDelete && <DeleteButton label="Remove from session" onPress={() => setConfirmingDelete(true)} />}
        </View>
        {!isNew && confirmingDelete && <DeleteConfirmBar label="Remove this entry from the session?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />}
      </ScrollView>
      <SaveToast visible={savedToast} message="Saved to session" onHide={() => setSavedToast(false)} />
    </KeyboardAvoidingView>
  );
}
