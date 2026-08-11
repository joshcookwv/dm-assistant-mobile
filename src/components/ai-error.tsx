import { Text } from "react-native";
import { router, usePathname } from "expo-router";

export function AiError({ message }: { message: string }) {
  const pathname = usePathname();
  const upgradeRequired = message.includes("Pro") || message.includes("Upgrade");
  return (
    <Text className="mt-1 text-sm text-red-400">
      {message}{" "}
      {upgradeRequired && (
        <Text
          className="underline"
          onPress={() => router.push({ pathname: "/pro", params: { returnTo: pathname } })}
        >
          View Pro
        </Text>
      )}
    </Text>
  );
}
