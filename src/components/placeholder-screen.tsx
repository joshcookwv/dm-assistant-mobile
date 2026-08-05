import { ScrollView, Text, View } from "react-native";

export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6">
      <View className="rounded-lg border border-panel-border bg-panel p-4">
        <Text className="text-xl font-semibold text-foreground">{title}</Text>
        <Text className="mt-2 leading-5 text-muted">{description}</Text>
      </View>
    </ScrollView>
  );
}
