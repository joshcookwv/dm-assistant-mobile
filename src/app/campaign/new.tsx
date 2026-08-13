import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { FormField } from "@/components/form-field";
import { FormSection } from "@/components/form-section";
import { PrimaryButton } from "@/components/primary-button";
import { canCreateCampaign, FREE_CAMPAIGN_LIMIT } from "@/lib/access-policy";
import { createCampaign, listCampaigns } from "@/lib/campaigns";
import { useProAccess } from "@/providers/pro-access";

export default function NewCampaignScreen() {
  const { isPro, loading: accessLoading } = useProAccess();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Screens reached via router.push can be reused by the navigator rather
  // than remounted, so this form could otherwise keep showing whatever an
  // earlier, unsaved draft last typed into it. Resetting on every focus
  // guarantees New Campaign always starts blank.
  useFocusEffect(
    useCallback(() => {
      setName("");
      setNotes("");
    }, [])
  );

  function handleCreate() {
    const campaignName = name.trim();
    if (!campaignName) return;

    // Recheck at the write boundary in case access or local data changed after
    // the list screen opened.
    if (!canCreateCampaign(isPro, listCampaigns().length)) {
      Alert.alert(
        "Free campaign limit reached",
        `The free plan includes ${FREE_CAMPAIGN_LIMIT} campaign. Upgrade to Pro to create another.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View Pro",
            onPress: () =>
              router.replace({ pathname: "/pro", params: { returnTo: "/campaign" } }),
          },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      const created = createCampaign(campaignName, notes.trim());
      router.replace(`/campaign/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <FormSection
          title="Campaign details"
          description="Name the campaign now; nothing is created until you tap Create Campaign."
          icon="session"
        >
          <FormField
            label="Campaign name *"
            value={name}
            onChangeText={setName}
            placeholder="Ashes of the Sunken Crown"
            autoFocus
          />
          <FormField
            label="Starting notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Premise, tone, opening hooks..."
            multiline
            className="min-h-32"
          />
        </FormSection>
        <View className="pt-1">
          <PrimaryButton
            label={saving ? "Creating..." : "Create Campaign"}
            icon="check"
            onPress={handleCreate}
            disabled={saving || accessLoading || !name.trim()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
