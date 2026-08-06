import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { SrdDetail } from "@/components/srd-detail";
import { Colors } from "@/constants/colors";
import { getSrdEntry, type SrdEntry } from "@/lib/srd";

export default function SrdMonsterDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const navigation = useNavigation();

  const [entry, setEntry] = useState<SrdEntry | null | undefined>(undefined);

  useEffect(() => {
    getSrdEntry("creatures", key).then((found) => {
      setEntry(found ?? null);
      if (found) navigation.setOptions({ title: found.name });
    });
  }, [key, navigation]);

  if (entry === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (entry === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-sm text-muted">This monster could not be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <SrdDetail category="creatures" entry={entry} />
    </ScrollView>
  );
}
