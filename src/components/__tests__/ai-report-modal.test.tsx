import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { AiReportModal } from "../ai-report-modal";
import { submitAiReport } from "@/lib/ai-reports";

jest.mock("@/lib/ai-reports", () => ({ submitAiReport: jest.fn() }));

const mockSubmit = submitAiReport as jest.MockedFunction<typeof submitAiReport>;

describe("AiReportModal", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({ reportId: "report-123" });
  });

  it("shows the exact flagged output, all categories, and the 30-day disclosure", async () => {
    const screen = await render(
      <AiReportModal
        visible
        output="Exact generated output to flag"
        feature="npc"
        model="claude-haiku-4-5-20251001"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("Exact generated output to flag")).toBeTruthy();
    for (const label of [
      "Offensive or hateful",
      "Sexual content",
      "Violence or self-harm",
      "Deceptive or unsafe",
      "Other",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByPlaceholderText("Optional context for this report")).toBeTruthy();
    expect(screen.getByText(/stored securely for 30 days/i)).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Submit report")).toBeDisabled();
  });

  it("submits only the selected category, comment, exact output, feature, and model", async () => {
    const screen = await render(
      <AiReportModal
        visible
        output="Exact generated output to flag"
        feature="session_summary"
        model="claude-haiku-4-5-20251001"
        onClose={jest.fn()}
      />
    );
    await fireEvent.press(screen.getByText("Deceptive or unsafe"));
    await fireEvent.changeText(
      screen.getByPlaceholderText("Optional context for this report"),
      "It invented unsafe instructions."
    );
    await fireEvent.press(screen.getByText("Submit report"));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith({
        category: "deceptive_unsafe",
        comment: "It invented unsafe instructions.",
        output: "Exact generated output to flag",
        feature: "session_summary",
        model: "claude-haiku-4-5-20251001",
      })
    );
    expect(await screen.findByText("Report submitted")).toBeTruthy();
  });
});
