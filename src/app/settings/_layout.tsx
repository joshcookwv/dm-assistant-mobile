import { Stack } from "expo-router";

import { drawerToggleHeaderLeft, sectionStackScreenOptions } from "@/constants/stack-options";

export default function SettingsStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "Settings", headerLeft: drawerToggleHeaderLeft }} />
      <Stack.Screen name="legal" options={{ title: "Legal & Licenses" }} />
    </Stack>
  );
}
