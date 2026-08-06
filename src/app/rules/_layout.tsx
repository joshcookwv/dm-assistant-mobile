import { Stack } from "expo-router";

import { drawerToggleHeaderLeft, sectionStackScreenOptions } from "@/constants/stack-options";

export default function RulesStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: "Rules", headerLeft: drawerToggleHeaderLeft }}
      />
      <Stack.Screen name="quick-reference" options={{ title: "Quick Reference" }} />
      <Stack.Screen name="[category]" options={{ headerShown: false }} />
    </Stack>
  );
}
