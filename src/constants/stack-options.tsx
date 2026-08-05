import { DrawerToggleButton } from "expo-router/drawer";

import { Colors } from "@/constants/colors";

export const sectionStackScreenOptions = {
  headerStyle: { backgroundColor: Colors.panel },
  headerTintColor: Colors.foreground,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: Colors.background },
} as const;

export function drawerToggleHeaderLeft() {
  return <DrawerToggleButton tintColor={Colors.foreground} />;
}
