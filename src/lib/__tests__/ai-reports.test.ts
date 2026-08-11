import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { submitAiReport, type AiOutputReportInput } from "../ai-reports";
import { requestAiProxy } from "../ai";

jest.mock("../ai", () => ({ requestAiProxy: jest.fn() }));

const mockRequestAiProxy = requestAiProxy as jest.MockedFunction<typeof requestAiProxy>;

describe("submitAiReport", () => {
  beforeEach(() => {
    mockRequestAiProxy.mockReset();
  });

  it("sends only the approved flagged-output fields and returns the report ID", async () => {
    mockRequestAiProxy.mockResolvedValue({ reportId: "report-123" });
    const input = {
      category: "other",
      comment: "Flagged by the user",
      output: "The exact generated output",
      feature: "session_summary",
      model: "claude-haiku-4-5-20251001",
      prompt: "must never be transmitted in a report",
    } as AiOutputReportInput & { prompt: string };

    await expect(submitAiReport(input)).resolves.toEqual({ reportId: "report-123" });
    expect(mockRequestAiProxy).toHaveBeenCalledTimes(1);
    const [path, init] = mockRequestAiProxy.mock.calls[0];
    expect(path).toBe("/v1/reports");
    expect(JSON.parse(String(init?.body))).toEqual({
      category: "other",
      comment: "Flagged by the user",
      output: "The exact generated output",
      feature: "session_summary",
      model: "claude-haiku-4-5-20251001",
    });
    expect(String(init?.body)).not.toContain("must never be transmitted");
  });
});
