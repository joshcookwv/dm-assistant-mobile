import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { generateCampaignRecap, suggestLinks } from "../ai-premium";
import { callMessages } from "../ai";

jest.mock("../ai", () => ({
  cachedText: (text: string) => ({ type: "text", text }),
  callMessages: jest.fn(),
}));

const mockedCallMessages = callMessages as jest.MockedFunction<typeof callMessages>;

describe("campaign intelligence AI", () => {
  beforeEach(() => {
    mockedCallMessages.mockReset();
  });

  it("uses the secure messages proxy without putting the RevenueCat ID in the body", async () => {
    mockedCallMessages.mockResolvedValueOnce({ content: [{ type: "text", text: "The party escaped." }] });

    const recap = await generateCampaignRecap("raw-revenuecat-customer-id", {
      campaignName: "Embers",
      sessions: [],
      notes: [],
    });

    expect(recap).toBe("The party escaped.");
    expect(JSON.stringify(mockedCallMessages.mock.calls[0][0])).not.toContain("raw-revenuecat-customer-id");
  });

  it("accepts only valid, bounded structured link suggestions", async () => {
    mockedCallMessages.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "record_link_suggestions",
          input: {
            suggestions: [
              { kind: "appearance", npcName: "Mira", locationName: "The Keep", reason: "Named together" },
              { kind: "relation", npcName: "Mira", relatedNpcName: "Orin", reason: "They argued" },
              { kind: "appearance", npcName: "Invalid", reason: "Missing location" },
            ],
          },
        },
      ],
    });

    const suggestions = await suggestLinks("raw-revenuecat-customer-id", {
      sourceText: "Mira met Orin at The Keep.",
      knownNpcNames: ["Mira", "Orin"],
      knownLocationNames: ["The Keep"],
    });

    expect(suggestions).toHaveLength(2);
    expect(JSON.stringify(mockedCallMessages.mock.calls[0][0])).not.toContain("raw-revenuecat-customer-id");
  });
});
