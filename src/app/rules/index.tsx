import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { SRD_CATEGORIES, type SrdCategory } from "@/lib/srd-types";

const CATEGORY_INFO: Record<SrdCategory, { label: string; icon: AppIconName }> = {
  spells: { label: "Spells", icon: "sparkles" },
  creatures: { label: "Monsters", icon: "monsters" },
  classes: { label: "Classes", icon: "person" },
  species: { label: "Species", icon: "npcs" },
  feats: { label: "Feats", icon: "bookmark" },
  backgrounds: { label: "Backgrounds", icon: "document" },
  magicitems: { label: "Magic Items", icon: "sparkles" },
  items: { label: "Items", icon: "folder" },
  weapons: { label: "Weapons", icon: "encounters" },
  armor: { label: "Armor", icon: "armor" },
  conditions: { label: "Conditions", icon: "chart" },
};

// Monsters live in their own top-level section (merged with homebrew), so they
// are deliberately not listed here.
const BROWSABLE_CATEGORIES = SRD_CATEGORIES.filter((c) => c !== "creatures");

export default function RulesCategoryScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Pressable
        onPress={() => router.push("/rules/quick-reference")}
        className="mb-5 flex-row items-center gap-4 overflow-hidden rounded-3xl border border-accent/30 bg-panel-raised p-5 active:bg-accent-soft"
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
          <AppIcon name="quick" size={25} color={Colors.accentBright} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">Combat Quick Reference</Text>
          <Text className="mt-1 text-xs leading-5 text-muted">
            Turns, actions, conditions, and death saves at a glance
          </Text>
        </View>
        <AppIcon name="chevronRight" size={18} color={Colors.subtle} />
      </Pressable>

      <Text className="mb-1 text-lg font-bold text-foreground">Rules library</Text>
      <Text className="mb-4 text-sm leading-5 text-muted">
        Official SRD plus third-party sourcebooks, available offline and filterable by source.
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {BROWSABLE_CATEGORIES.map((category) => {
          const info = CATEGORY_INFO[category];
          return (
            <Pressable
              key={category}
              onPress={() => router.push(`/rules/${category}`)}
              className="min-w-[46%] flex-1 rounded-2xl border border-panel-border bg-panel p-4 active:bg-panel-raised"
            >
              <View className="mb-4 h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                <AppIcon name={info.icon} size={21} color={Colors.accentBright} />
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">{info.label}</Text>
                <AppIcon name="chevronRight" size={16} color={Colors.subtle} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
