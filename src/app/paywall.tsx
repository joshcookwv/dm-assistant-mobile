import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import { FREE_CAMPAIGN_LIMIT, useEntitlement } from "@/lib/entitlements";

const PREMIUM_FEATURES = [
  "Unlimited campaigns",
  "AI-generated campaign recaps (Claude Sonnet)",
  "AI-generated session summaries (Claude Sonnet)",
  "NPC name & description generation — no API key needed",
  "AI link suggestions from your session notes",
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = useEntitlement();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 p-5 pb-10"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Pressable onPress={() => router.back()} hitSlop={8} className="self-start">
        <AppIcon name="chevronLeft" size={22} color={Colors.muted} />
      </Pressable>

      <View className="items-center gap-2 pt-2">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <AppIcon name="sparkles" size={26} color={Colors.accentBright} />
        </View>
        <Text className="text-xl font-bold text-foreground">Go Premium</Text>
        <Text className="text-center text-sm leading-5 text-muted">
          Free plan is capped at {FREE_CAMPAIGN_LIMIT} campaign, with your own Claude API key for NPC
          generation. Premium unlocks unlimited campaigns and bundled AI — no key required.
        </Text>
      </View>

      <View className="gap-2.5 rounded-3xl border border-panel-border bg-panel p-4">
        {PREMIUM_FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-start gap-2.5">
            <AppIcon name="check" size={15} color={Colors.accentBright} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm leading-5 text-foreground/90">{feature}</Text>
          </View>
        ))}
      </View>

      {isPremium ? (
        <View className="items-center rounded-2xl border border-panel-border bg-panel p-4">
          <Text className="text-sm font-semibold text-accent-bright">You&apos;re already Premium — thank you!</Text>
        </View>
      ) : (
        <>
          <PrimaryButton label="Upgrade — coming soon" icon="sparkles" disabled onPress={() => {}} />
          <Text className="text-center text-xs text-muted">
            Subscriptions aren&apos;t live yet — this screen is a placeholder until the App Store and Play
            Store products are set up.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
