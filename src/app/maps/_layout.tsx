import { Stack } from "expo-router";

import { drawerToggleHeaderLeft, sectionStackScreenOptions } from "@/constants/stack-options";

export default function MapsStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: "Maps", headerLeft: drawerToggleHeaderLeft }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
