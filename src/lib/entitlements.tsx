import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";

/** Free tier: 1 campaign. Paid tier: unlimited (see FREE_CAMPAIGN_LIMIT usage in campaign/index.tsx). */
export const FREE_CAMPAIGN_LIMIT = 1;

const PREMIUM_ENTITLEMENT_ID = "premium";
const DEV_OVERRIDE_SETTING = "dev_premium_override";

interface RevenueCatExtra {
  iosApiKey?: string;
  androidApiKey?: string;
}

export interface EntitlementValue {
  isPremium: boolean;
  campaignLimit: number;
  appUserId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** __DEV__ only — lets local testing flip the paywall without a real store purchase. */
  devOverride: boolean | null;
  setDevOverride: (value: boolean | null) => Promise<void>;
}

const EntitlementContext = createContext<EntitlementValue | null>(null);

function isEntitled(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

/**
 * Wraps the app in RevenueCat-backed entitlement state. Configuring
 * RevenueCat requires a project + API keys that don't exist until the store
 * subscription products and the RevenueCat project are set up (see
 * app.json's extra.revenueCat) — until then this silently falls back to the
 * free tier (or the dev override below), rather than throwing.
 */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [devOverride, setDevOverrideState] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(false);

  const refresh = useCallback(async () => {
    if (!configured) return;
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setAppUserId(await Purchases.getAppUserID());
    } catch {
      // Network hiccup or not configured — leave prior state in place.
    }
  }, [configured]);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(DEV_OVERRIDE_SETTING);
      setDevOverrideState(stored === null ? null : stored === "true");

      const revenueCat = Constants.expoConfig?.extra?.revenueCat as RevenueCatExtra | undefined;
      const apiKey = Platform.select({ ios: revenueCat?.iosApiKey, android: revenueCat?.androidApiKey });
      if (!apiKey) {
        setLoading(false);
        return;
      }
      try {
        Purchases.configure({ apiKey });
        setConfigured(true);
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        setAppUserId(await Purchases.getAppUserID());
      } catch {
        // Native module not linked yet (e.g. running in Expo Go before a
        // dev-client build) — fall back to free/dev-override state.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function setDevOverride(value: boolean | null) {
    if (value === null) await SecureStore.deleteItemAsync(DEV_OVERRIDE_SETTING);
    else await SecureStore.setItemAsync(DEV_OVERRIDE_SETTING, String(value));
    setDevOverrideState(value);
  }

  const isPremium = __DEV__ && devOverride !== null ? devOverride : isEntitled(customerInfo);

  const value: EntitlementValue = {
    isPremium,
    campaignLimit: isPremium ? Number.POSITIVE_INFINITY : FREE_CAMPAIGN_LIMIT,
    appUserId,
    loading,
    refresh,
    devOverride,
    setDevOverride,
  };

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error("useEntitlement must be used within an EntitlementProvider");
  return ctx;
}
