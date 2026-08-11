import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

import { getClientId } from "./client-id";

const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";
const TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim() ?? "";
export const PRO_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() ?? "";

const DEBUG_PRO_ACCESS =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_PRO_ACCESS?.trim().toLowerCase() === "true";

let configurePromise: Promise<boolean> | null = null;

export interface ProStatus {
  configured: boolean;
  isPro: boolean;
  appUserId: string | null;
  customerInfo: CustomerInfo | null;
}

function apiKey(): string {
  if (__DEV__ && TEST_API_KEY) return TEST_API_KEY;
  return ANDROID_API_KEY;
}

export function customerHasPro(customerInfo: CustomerInfo): boolean {
  if (!PRO_ENTITLEMENT_ID) return false;
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}

export async function ensurePurchasesConfigured(): Promise<boolean> {
  if (DEBUG_PRO_ACCESS) return true;
  if (!apiKey() || !PRO_ENTITLEMENT_ID) return false;

  if (!configurePromise) {
    configurePromise = (async () => {
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey: apiKey() });
        if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      return true;
    })().catch((error) => {
      configurePromise = null;
      throw error;
    });
  }

  return configurePromise;
}

export async function getProStatus(): Promise<ProStatus> {
  if (DEBUG_PRO_ACCESS) {
    return {
      configured: true,
      isPro: true,
      appUserId: `debug-${await getClientId()}`,
      customerInfo: null,
    };
  }

  if (!(await ensurePurchasesConfigured())) {
    return { configured: false, isPro: false, appUserId: null, customerInfo: null };
  }

  const [customerInfo, appUserId] = await Promise.all([
    Purchases.getCustomerInfo(),
    Purchases.getAppUserID(),
  ]);
  return {
    configured: true,
    isPro: customerHasPro(customerInfo),
    appUserId,
    customerInfo,
  };
}

export async function requireProAppUserId(): Promise<string> {
  const status = await getProStatus();
  if (!status.isPro || !status.appUserId) {
    throw new Error("Infernal Codex Pro is required. Upgrade to unlock AI features.");
  }
  return status.appUserId;
}

export async function getProOfferings(): Promise<PurchasesOfferings | null> {
  if (DEBUG_PRO_ACCESS || !(await ensurePurchasesConfigured())) return null;
  return Purchases.getOfferings();
}

export async function purchaseProPackage(aPackage: PurchasesPackage): Promise<CustomerInfo> {
  if (!(await ensurePurchasesConfigured())) {
    throw new Error("Purchases are not configured for this build yet.");
  }
  const result = await Purchases.purchasePackage(aPackage);
  return result.customerInfo;
}

export async function restoreProPurchases(): Promise<CustomerInfo> {
  if (!(await ensurePurchasesConfigured())) {
    throw new Error("Purchases are not configured for this build yet.");
  }
  return Purchases.restorePurchases();
}

export function addProStatusListener(listener: (customerInfo: CustomerInfo) => void): () => void {
  if (DEBUG_PRO_ACCESS || !apiKey() || !PRO_ENTITLEMENT_ID) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
