import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

import { getClientId } from "./client-id";

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
  const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";
  const testApiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim() ?? "";
  if (__DEV__ && testApiKey) return testApiKey;
  return androidApiKey;
}

function entitlementId(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() ?? "";
}

export function customerHasPro(customerInfo: CustomerInfo): boolean {
  const id = entitlementId();
  if (!id) return false;
  return Boolean(customerInfo.entitlements.active[id]);
}

export async function ensurePurchasesConfigured(): Promise<boolean> {
  if (DEBUG_PRO_ACCESS) return true;
  if (!apiKey() || !entitlementId()) return false;

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

export function monthlyPackages(offerings: PurchasesOfferings | null): PurchasesPackage[] {
  const defaultOffering = offerings?.all.default;
  if (!defaultOffering) return [];
  return defaultOffering.availablePackages.filter(
    (aPackage) =>
      aPackage.identifier === "$rc_monthly" || aPackage.packageType === PACKAGE_TYPE.MONTHLY
  );
}

export async function activateReviewerAccess(code: string): Promise<CustomerInfo> {
  const appUserId = code.trim();
  if (!appUserId) throw new Error("Enter the app review access code.");
  if (!(await ensurePurchasesConfigured())) {
    throw new Error("Purchases are not configured for this build yet.");
  }
  const result = await Purchases.logIn(appUserId);
  return result.customerInfo;
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
  if (DEBUG_PRO_ACCESS || !apiKey() || !entitlementId()) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
