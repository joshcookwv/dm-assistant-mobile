import { Stack } from "expo-router";

import { drawerToggleHeaderLeft, sectionStackScreenOptions } from "@/constants/stack-options";

export default function CampaignStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: "Campaigns", headerLeft: drawerToggleHeaderLeft }}
      />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
