import "@/global.css";

import {
  Drawer,
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { Image, Text, View, type ColorValue } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { EntitlementProvider } from "@/lib/entitlements";

function AppDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      <View className="mb-3 border-b border-panel-border bg-panel-raised px-5 pb-5 pt-7">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-accent/40 bg-background">
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 54, height: 54 }}
              resizeMode="contain"
            />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">Infernal Codex</Text>
            <Text className="mt-0.5 text-xs text-muted">Your table, organized</Text>
          </View>
        </View>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

function drawerIcon(name: AppIconName) {
  return function DrawerIcon({ color, size }: { color: ColorValue; size: number }) {
    return <AppIcon name={name} color={color} size={size} />;
  };
}

export default function RootLayout() {
  return (
    <EntitlementProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["bottom"]}>
          <StatusBar style="light" />
          <Drawer
            drawerContent={(props) => <AppDrawerContent {...props} />}
            screenOptions={{
              swipeEnabled: false,
              headerStyle: { backgroundColor: Colors.panelRaised },
              headerTintColor: Colors.foreground,
              headerTitleStyle: { color: Colors.foreground, fontSize: 19, fontWeight: "700" },
              headerShadowVisible: false,
              drawerStyle: { backgroundColor: Colors.panel, width: 286 },
              drawerItemStyle: { borderRadius: 12, marginHorizontal: 10, marginVertical: 2 },
              drawerLabelStyle: { fontSize: 14, fontWeight: "600" },
              drawerActiveTintColor: Colors.accentBright,
              drawerInactiveTintColor: Colors.muted,
              drawerActiveBackgroundColor: Colors.accentSoft,
              overlayColor: "rgba(5, 2, 1, 0.72)",
              sceneStyle: { backgroundColor: Colors.background },
            }}
          >
            <Drawer.Screen
              name="index"
              options={{ title: "Dashboard", drawerLabel: "Dashboard", drawerIcon: drawerIcon("dashboard") }}
            />
            <Drawer.Screen
              name="rules"
              options={{ title: "Rules", drawerLabel: "Rules", drawerIcon: drawerIcon("rules"), headerShown: false }}
            />
            <Drawer.Screen
              name="monsters"
              options={{
                title: "Monsters",
                drawerLabel: "Monsters",
                drawerIcon: drawerIcon("monsters"),
                headerShown: false,
              }}
            />
            <Drawer.Screen
              name="npcs"
              options={{ title: "NPCs", drawerLabel: "NPCs", drawerIcon: drawerIcon("npcs"), headerShown: false }}
            />
            <Drawer.Screen
              name="notes"
              options={{ title: "Notes", drawerLabel: "Notes", drawerIcon: drawerIcon("notes"), headerShown: false }}
            />
            <Drawer.Screen
              name="campaign"
              options={{
                title: "Campaigns",
                drawerLabel: "Campaigns",
                drawerIcon: drawerIcon("session"),
                headerShown: false,
              }}
            />
            <Drawer.Screen
              name="encounters"
              options={{
                title: "One-Shot Encounters",
                drawerLabel: "One-Shot Encounters",
                drawerIcon: drawerIcon("encounters"),
                headerShown: false,
              }}
            />
            <Drawer.Screen
              name="maps"
              options={{ title: "Maps", drawerLabel: "Maps", drawerIcon: drawerIcon("maps"), headerShown: false }}
            />
            <Drawer.Screen
              name="import"
              options={{ title: "Import PDF", drawerLabel: "Import PDF", drawerIcon: drawerIcon("import") }}
            />
            <Drawer.Screen
              name="settings"
              options={{
                title: "Settings",
                drawerLabel: "Settings",
                drawerIcon: drawerIcon("settings"),
                headerShown: false,
              }}
            />
            <Drawer.Screen
              name="onboarding"
              options={{ headerShown: false, swipeEnabled: false, drawerItemStyle: { height: 0 } }}
            />
          </Drawer>
        </SafeAreaView>
      </GestureHandlerRootView>
    </EntitlementProvider>
  );
}
