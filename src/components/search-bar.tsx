import { TextInput } from "react-native";

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
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#a89a80"
      autoCapitalize="none"
      autoCorrect={false}
      className="rounded-md border border-panel-border bg-panel px-3 py-2 text-sm text-foreground"
    />
  );
}
