import "@/global.css";

import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import { Colors } from "@/constants/colors";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Drawer
        screenOptions={{
          // Edge-swipe-to-open is prone to misfiring from unrelated gestures
          // and Activity transitions (e.g. returning from the Android
          // document/image picker) — the hamburger button is the only
          // intentional way to open the drawer.
          swipeEnabled: false,
          headerStyle: { backgroundColor: Colors.panel },
          headerTintColor: Colors.foreground,
          headerTitleStyle: { color: Colors.foreground },
          drawerStyle: { backgroundColor: Colors.panel, width: 260 },
          drawerActiveTintColor: Colors.accent,
          drawerInactiveTintColor: Colors.muted,
          drawerActiveBackgroundColor: `${Colors.accent}33`,
          sceneStyle: { backgroundColor: Colors.background },
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Dashboard", drawerLabel: "Dashboard" }} />
        <Drawer.Screen
          name="rules"
          options={{ title: "Rules", drawerLabel: "Rules", headerShown: false }}
        />
        <Drawer.Screen
          name="npcs"
          options={{ title: "NPCs", drawerLabel: "NPCs", headerShown: false }}
        />
        <Drawer.Screen
          name="notes"
          options={{ title: "Notes", drawerLabel: "Notes", headerShown: false }}
        />
        <Drawer.Screen
          name="encounters"
          options={{ title: "Encounters", drawerLabel: "Encounters", headerShown: false }}
        />
        <Drawer.Screen
          name="maps"
          options={{ title: "Maps", drawerLabel: "Maps", headerShown: false }}
        />
        <Drawer.Screen
          name="bestiary"
          options={{ title: "Bestiary", drawerLabel: "Bestiary", headerShown: false }}
        />
        <Drawer.Screen
          name="import"
          options={{ title: "Import PDF", drawerLabel: "Import PDF" }}
        />
        <Drawer.Screen name="settings" options={{ title: "Settings", drawerLabel: "Settings" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
