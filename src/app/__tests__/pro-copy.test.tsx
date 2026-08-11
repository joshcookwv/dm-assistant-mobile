import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";

import ProScreen from "../pro";
import { purchaseProPackage } from "@/lib/purchases";

const mockMonthly = {
  identifier: "$rc_monthly",
  packageType: "MONTHLY",
  product: {
    title: "Infernal Codex Pro Monthly",
    description: "Monthly Pro access",
    priceString: "$4.99",
  },
};
const mockAnnual = {
  identifier: "$rc_annual",
  packageType: "ANNUAL",
  product: { title: "Annual plan", description: "Should not render", priceString: "$39.99" },
};

jest.mock("@/lib/purchases", () => ({
  activateReviewerAccess: jest.fn(),
  customerHasPro: () => false,
  getProOfferings: async () => ({
    current: { identifier: "default", availablePackages: [mockMonthly, mockAnnual] },
    all: { default: { identifier: "default", availablePackages: [mockMonthly, mockAnnual] } },
  }),
  monthlyPackages: (offerings: any) =>
    offerings.all.default.availablePackages.filter(
      (item: any) => item.identifier === "$rc_monthly" || item.packageType === "MONTHLY"
    ),
  purchaseProPackage: jest.fn(),
  restoreProPurchases: jest.fn(),
}));

jest.mock("@/providers/pro-access", () => ({
  useProAccess: () => ({
    isPro: false,
    configured: true,
    loading: false,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/providers/ai-credits", () => ({
  useAiCredits: () => ({
    limit: 10,
    remaining: 7,
    resetAt: "2026-08-12T00:00:00.000Z",
  }),
}));

describe("Pro subscription policy copy", () => {
  it("shows one localized monthly offer and every required disclosure/action", async () => {
    const screen = await render(<ProScreen />);

    expect(await screen.findByText("$4.99 / month")).toBeTruthy();
    expect(screen.queryByText("$39.99")).toBeNull();
    expect(screen.queryByText("Annual plan")).toBeNull();
    for (const copy of [
      /renews automatically each month/i,
      /cancel or manage through Google Play/i,
      /free app remains available/i,
      /10 AI credits per day/i,
      /standard AI action uses 1 credit/i,
      /PDF import uses 5 credits/i,
      /Restore Purchases/i,
      /Privacy Policy/i,
      /SRD Licensing/i,
      /Manage subscription/i,
      /App review access/i,
    ]) {
      expect(screen.getByText(copy)).toBeTruthy();
    }
  });

  it("treats store-sheet cancellation as a neutral outcome", async () => {
    const purchase = purchaseProPackage as jest.MockedFunction<typeof purchaseProPackage>;
    purchase.mockRejectedValueOnce({ userCancelled: true });
    const screen = await render(<ProScreen />);
    const monthlyOffer = await screen.findByText("$4.99 / month");

    await act(async () => {
      fireEvent.press(monthlyOffer);
    });

    await waitFor(() => expect(purchase).toHaveBeenCalledWith(mockMonthly));
    expect(screen.queryByText(/couldn't complete that purchase/i)).toBeNull();
  });
});
