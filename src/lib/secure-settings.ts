import * as SecureStore from "expo-secure-store";

const API_KEY_SETTING = "anthropic_api_key";

export async function getApiKey(): Promise<string | undefined> {
  return (await SecureStore.getItemAsync(API_KEY_SETTING)) ?? undefined;
}

export async function setApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_SETTING, value);
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_SETTING);
}
