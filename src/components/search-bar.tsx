import { TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";

export function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View className="min-h-12 flex-row items-center gap-2.5 rounded-xl border border-panel-border bg-panel-raised px-3.5">
      <AppIcon name="search" size={19} color={Colors.subtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.subtle}
        autoCapitalize="none"
        autoCorrect={false}
        className="flex-1 py-3 text-sm text-foreground"
      />
    </View>
  );
}
