import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { FlatList, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { PrimaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import { createCampaign, listCampaigns, type CampaignSummary } from "@/lib/campaigns";
import { useEntitlement } from "@/lib/entitlements";

function summaryLine(campaign: CampaignSummary): string {
  if (campaign.pcCount === 0 && campaign.locationCount === 0) return "Nothing set up yet";
  return [
    campaign.pcCount > 0 && `${campaign.pcCount} PC${campaign.pcCount === 1 ? "" : "s"}`,
    campaign.locationCount > 0 && `${campaign.locationCount} location${campaign.locationCount === 1 ? "" : "s"}`,
    campaign.sessionCount > 0 && `${campaign.sessionCount} session${campaign.sessionCount === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function CampaignsListScreen() {
  const { isPremium, campaignLimit } = useEntitlement();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);

  const refresh = useCallback(() => setCampaigns(listCampaigns()), []);
  useFocusEffect(refresh);

  const atLimit = !isPremium && campaigns.length >= campaignLimit;

  function handleCreate() {
    if (atLimit) {
      router.push("/paywall");
      return;
    }
    const created = createCampaign("New Campaign");
    router.push(`/campaign/${created.id}`);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <View className="flex-row gap-3 rounded-2xl border border-panel-border bg-panel p-4">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
            <AppIcon name="session" size={20} color={Colors.accentBright} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">Your campaign, organized</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">
              Keep a persistent party roster and browse locations to see who's there, what's
              happened, and what's been noted.
            </Text>
          </View>
        </View>
        <PrimaryButton
          label={atLimit ? "Upgrade for more campaigns" : "New Campaign"}
          icon={atLimit ? "sparkles" : "add"}
          onPress={handleCreate}
        />
        {atLimit && (
          <Text className="text-center text-xs text-muted">
            Free plan is limited to {campaignLimit} campaign. Upgrade to create more.
          </Text>
        )}
      </View>

      <FlatList
        data={campaigns}
        contentContainerClassName="pb-6"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EntityListEmpty
            label="No campaigns yet"
            detail="Create one to start tracking your party, locations, and sessions."
            icon="session"
          />
        }
        renderItem={({ item }) => (
          <EntityListItem
            title={item.name}
            subtitle={summaryLine(item)}
            icon="session"
            onPress={() => router.push(`/campaign/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
