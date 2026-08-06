import { Text, TextInput, TextInputProps, View } from "react-native";

import { Colors } from "@/constants/colors";

export function FormField({
  label,
  labelRight,
  multiline,
  className,
  ...inputProps
}: {
  label: string;
  labelRight?: React.ReactNode;
} & TextInputProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</Text>
        {labelRight}
      </View>
      <TextInput
        placeholderTextColor={Colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : undefined}
        className={`mt-1.5 rounded-xl border border-panel-border bg-panel-raised px-3.5 py-3 text-sm text-foreground ${multiline ? "min-h-32" : ""} ${className ?? ""}`}
        {...inputProps}
      />
    </View>
  );
}
