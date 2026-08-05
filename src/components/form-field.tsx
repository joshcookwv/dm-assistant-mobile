import { Text, TextInput, TextInputProps, View } from "react-native";

export function FormField({
  label,
  labelRight,
  multiline,
  ...inputProps
}: {
  label: string;
  labelRight?: React.ReactNode;
} & TextInputProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted">{label}</Text>
        {labelRight}
      </View>
      <TextInput
        placeholderTextColor="#a89a80"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : undefined}
        className={`mt-1 rounded-md border border-panel-border bg-background px-3 py-2 text-sm text-foreground ${multiline ? "min-h-32" : ""}`}
        {...inputProps}
      />
    </View>
  );
}
