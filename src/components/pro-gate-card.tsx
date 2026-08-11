import { Text, View } from "react-native";
import { router, usePathname } from "expo-router";

import { PrimaryButton } from "@/components/primary-button";

export function ProGateCard({ title, description }: { title: string; description: string }) {
  const pathname = usePathname();

  return (
    <View className="rounded-2xl border border-accent/40 bg-panel p-5">
      <Text className="text-base font-bold text-foreground">{title}</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">{description}</Text>
      <View className="mt-4">
        <PrimaryButton
          label="View Infernal Codex Pro"
          icon="sparkles"
          onPress={() => router.push({ pathname: "/pro", params: { returnTo: pathname } })}
        />
      </View>
    </View>
  );
}
