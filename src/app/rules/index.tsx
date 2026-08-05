import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { SRD_CATEGORIES, type SrdCategory } from "@/lib/srd-types";

const CATEGORY_INFO: Record<SrdCategory, { label: string; icon: string }> = {
  spells: { label: "Spells", icon: "🔮" },
  creatures: { label: "Monsters", icon: "🐉" },
  classes: { label: "Classes", icon: "🛡️" },
  species: { label: "Species", icon: "🧝" },
  feats: { label: "Feats", icon: "⭐" },
  backgrounds: { label: "Backgrounds", icon: "📜" },
  magicitems: { label: "Magic Items", icon: "💍" },
  items: { label: "Items", icon: "🎒" },
  weapons: { label: "Weapons", icon: "⚔️" },
  armor: { label: "Armor", icon: "🥋" },
  conditions: { label: "Conditions", icon: "💫" },
};

export default function RulesCategoryScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <Text className="mb-3 text-sm text-muted">
        Official SRD (2014 &amp; 2024) plus third-party sourcebooks, filterable by source within
        each category.
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {SRD_CATEGORIES.map((category) => {
          const info = CATEGORY_INFO[category];
          return (
            <Pressable
              key={category}
              onPress={() => router.push(`/rules/${category}`)}
              className="min-w-[30%] flex-1 items-center gap-1 rounded-md border border-panel-border bg-panel py-5 active:bg-white/5"
            >
              <Text className="text-2xl">{info.icon}</Text>
              <Text className="text-xs text-foreground">{info.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
