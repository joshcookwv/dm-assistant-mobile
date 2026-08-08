import { Stack } from "expo-router";

import { sectionStackScreenOptions } from "@/constants/stack-options";

export default function CampaignDetailStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "" }} />
      <Stack.Screen name="pc/[pcId]" options={{ title: "" }} />
      <Stack.Screen name="location/[locationId]" options={{ title: "" }} />
      <Stack.Screen name="session/[sessionId]" options={{ title: "" }} />
    </Stack>
  );
}
