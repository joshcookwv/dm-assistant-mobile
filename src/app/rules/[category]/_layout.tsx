import { Stack } from "expo-router";

import { sectionStackScreenOptions } from "@/constants/stack-options";

export default function RulesCategoryStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "" }} />
      <Stack.Screen name="[key]" options={{ title: "" }} />
    </Stack>
  );
}
