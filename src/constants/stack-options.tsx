import { DrawerToggleButton } from "expo-router/drawer";

import { Colors } from "@/constants/colors";

export const sectionStackScreenOptions = {
  headerStyle: { backgroundColor: Colors.panelRaised },
  headerTintColor: Colors.foreground,
  headerTitleStyle: { color: Colors.foreground, fontSize: 19, fontWeight: "700" },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: Colors.background },
} as const;

export function drawerToggleHeaderLeft() {
  return <DrawerToggleButton tintColor={Colors.foreground} />;
}
