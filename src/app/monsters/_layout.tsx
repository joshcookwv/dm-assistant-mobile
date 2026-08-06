import { Stack } from "expo-router";

import { drawerToggleHeaderLeft, sectionStackScreenOptions } from "@/constants/stack-options";

export default function MonstersStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: "Monsters", headerLeft: drawerToggleHeaderLeft }}
      />
      <Stack.Screen name="custom/[id]" options={{ title: "" }} />
      <Stack.Screen name="srd/[key]" options={{ title: "" }} />
    </Stack>
  );
}
