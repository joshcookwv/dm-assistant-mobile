import { fireEvent, render } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import NewCampaignScreen from "../new";

const mockCreateCampaign = jest.fn((_name: string, _notes: string) => ({ id: 42 }));
const mockReplace = jest.fn((_href: string) => undefined);

jest.mock("@/lib/campaigns", () => ({
  createCampaign: (name: string, notes: string) => mockCreateCampaign(name, notes),
  listCampaigns: () => [],
}));

jest.mock("@/providers/pro-access", () => ({
  useProAccess: () => ({ isPro: true, loading: false }),
}));

jest.mock("expo-router", () => ({
  router: { replace: (href: string) => mockReplace(href) },
  // No real navigator wraps this test, so there's no focus/blur to react to —
  // running the callback once on mount is the faithful equivalent here.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require("react").useEffect(callback, []),
}));

describe("NewCampaignScreen", () => {
  beforeEach(() => {
    mockCreateCampaign.mockClear();
    mockReplace.mockClear();
  });

  it("does not persist a campaign until Create Campaign is pressed", async () => {
    const screen = await render(<NewCampaignScreen />);

    expect(mockCreateCampaign).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByPlaceholderText("Ashes of the Sunken Crown"),
      "Nightfall"
    );
    expect(mockCreateCampaign).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Create Campaign"));

    expect(mockCreateCampaign).toHaveBeenCalledWith("Nightfall", "");
    expect(mockReplace).toHaveBeenCalledWith("/campaign/42");
  });
});
