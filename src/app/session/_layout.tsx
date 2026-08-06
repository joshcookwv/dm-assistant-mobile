import { Stack } from "expo-router";

import { drawerToggleHeaderLeft, sectionStackScreenOptions } from "@/constants/stack-options";

export default function SessionStackLayout() {
  return (
    <Stack screenOptions={sectionStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: "Sessions", headerLeft: drawerToggleHeaderLeft }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
      <Stack.Screen name="member/[memberId]" options={{ title: "" }} />
    </Stack>
  );
}
