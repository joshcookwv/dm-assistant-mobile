import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const CLIENT_ID_KEY = "ai_proxy_client_id";

let clientIdPromise: Promise<string> | null = null;

/**
 * This device's anonymous client ID for the AI proxy Worker — a random
 * UUID generated once and persisted in the secure keychain, not tied to
 * any account. The Worker uses it purely to key its per-device daily rate
 * limit; nothing else about the device or its data is ever sent with it.
 *
 * The in-flight promise is cached (not just the resolved value) so two
 * calls racing before the very first SecureStore write completes can't
 * each generate and persist a different UUID. On failure the cached
 * promise is cleared so a later call gets a fresh attempt instead of a
 * permanently-rejected promise for the rest of the app session (e.g. a
 * transient keychain/keystore hiccup on the very first call shouldn't
 * disable the shared-proxy path until the app restarts).
 */
export function getClientId(): Promise<string> {
  if (!clientIdPromise) {
    clientIdPromise = (async () => {
      const existing = await SecureStore.getItemAsync(CLIENT_ID_KEY);
      if (existing) return existing;

      const created = Crypto.randomUUID();
      await SecureStore.setItemAsync(CLIENT_ID_KEY, created);
      return created;
    })().catch((error) => {
      clientIdPromise = null;
      throw error;
    });
  }
  return clientIdPromise;
}
