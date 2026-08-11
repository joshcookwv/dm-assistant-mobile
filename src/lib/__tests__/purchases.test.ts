import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type {
  CustomerInfo,
  PACKAGE_TYPE,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

import { activateReviewerAccess, monthlyPackages } from "../purchases";

const mockCustomerInfo = { entitlements: { active: {} } } as CustomerInfo;
const mockLogIn = jest.fn(async (_appUserId: string) => ({
  customerInfo: mockCustomerInfo,
  created: false,
}));

jest.mock("react-native-purchases", () => ({
  default: {
    isConfigured: async () => true,
    logIn: (appUserId: string) => mockLogIn(appUserId),
  },
  isConfigured: async () => true,
  logIn: (appUserId: string) => mockLogIn(appUserId),
  LOG_LEVEL: { DEBUG: "DEBUG" },
  PACKAGE_TYPE: { MONTHLY: "MONTHLY" },
}));

function aPackage(
  identifier: string,
  packageType: PACKAGE_TYPE,
  productIdentifier = "infernal_codex_pro:monthly",
  subscriptionPeriod: string | null = "P1M"
): PurchasesPackage {
  return {
    identifier,
    packageType,
    product: {
      identifier: productIdentifier,
      subscriptionPeriod,
      defaultOption: {
        id: "monthly",
        productId: "infernal_codex_pro",
        storeProductId: "infernal_codex_pro:monthly",
      },
    },
  } as PurchasesPackage;
}

describe("monthlyPackages", () => {
  it("returns only the approved monthly Play product from the default offering", () => {
    const predefinedMonthly = aPackage("$rc_monthly", "MONTHLY" as PACKAGE_TYPE);
    const staleMonthly = aPackage(
      "monthly_custom",
      "MONTHLY" as PACKAGE_TYPE,
      "retired_pro:monthly"
    );
    const wrongBasePlan = aPackage(
      "monthly_legacy",
      "MONTHLY" as PACKAGE_TYPE,
      "infernal_codex_pro:legacy"
    );
    const annual = aPackage(
      "$rc_annual",
      "ANNUAL" as PACKAGE_TYPE,
      "infernal_codex_pro:annual",
      "P1Y"
    );
    const duplicate = aPackage("monthly_duplicate", "MONTHLY" as PACKAGE_TYPE);
    const otherOfferingMonthly = aPackage("other_monthly", "MONTHLY" as PACKAGE_TYPE);
    const defaultOffering = {
      identifier: "default",
      availablePackages: [predefinedMonthly, staleMonthly, wrongBasePlan, annual, duplicate],
    };
    const offerings = {
      current: defaultOffering,
      all: {
        default: defaultOffering,
        other: { identifier: "other", availablePackages: [otherOfferingMonthly] },
      },
    } as unknown as PurchasesOfferings;

    expect(monthlyPackages(offerings)).toEqual([predefinedMonthly]);
  });

  it("returns no packages when the default offering is absent", () => {
    expect(monthlyPackages({ current: null, all: {} } as PurchasesOfferings)).toEqual([]);
  });
});

describe("activateReviewerAccess", () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY = "test-public-key";
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID = "pro";
  });

  beforeEach(() => {
    mockLogIn.mockClear();
  });

  it("trims the private identifier, logs in through RevenueCat, and returns customer info", async () => {
    await expect(activateReviewerAccess("  reviewer-private-id  ")).resolves.toBe(
      mockCustomerInfo
    );
    expect(mockLogIn).toHaveBeenCalledWith("reviewer-private-id");
  });

  it("rejects an empty code before calling RevenueCat", async () => {
    await expect(activateReviewerAccess("   ")).rejects.toThrow(
      "Enter the app review access code."
    );
    expect(mockLogIn).not.toHaveBeenCalled();
  });
});
