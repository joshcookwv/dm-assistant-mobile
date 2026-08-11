import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  createPdfJob,
  extractPdfJob,
  uploadPdfJob,
} from "../ai";
import { extractFromPdf } from "../pdf-import";

jest.mock("../ai", () => ({
  cachedText: (text: string) => ({ type: "text", text }),
  createPdfJob: jest.fn(),
  extractPdfJob: jest.fn(),
  uploadPdfJob: jest.fn(),
}));

const mockCreate = createPdfJob as jest.MockedFunction<typeof createPdfJob>;
const mockExtract = extractPdfJob as jest.MockedFunction<typeof extractPdfJob>;
const mockUpload = uploadPdfJob as jest.MockedFunction<typeof uploadPdfJob>;

describe("protected PDF import flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue("job-123");
    mockUpload.mockResolvedValue(undefined);
  });

  it("creates, uploads, and extracts while the Worker owns file cleanup", async () => {
    mockExtract.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          input: {
            npcs: [{ name: "Mara" }],
            monsters: [],
            rules: [],
          },
        },
      ],
      stop_reason: "end_turn",
    });
    const stages: string[] = [];

    await expect(
      extractFromPdf("file:///adventure.pdf", "adventure.pdf", (stage) => stages.push(stage))
    ).resolves.toMatchObject({
      npcs: [{ name: "Mara" }],
      truncated: false,
    });
    expect(stages).toEqual(["uploading", "extracting"]);
    expect(mockUpload).toHaveBeenCalledWith(
      "job-123",
      "file:///adventure.pdf",
      "adventure.pdf",
      "application/pdf"
    );
    expect(mockExtract).toHaveBeenCalledWith(
      "job-123",
      expect.objectContaining({
        prompt: "Extract everything from this document.",
        tools: expect.any(Array),
        tool_choice: { type: "tool", name: "record_extracted_content" },
      })
    );
    expect(JSON.stringify(mockExtract.mock.calls[0][1])).not.toContain("file_id");
  });

  it("surfaces an upload failure for Worker-side refund and cleanup", async () => {
    mockUpload.mockRejectedValue(new Error("network"));

    await expect(extractFromPdf("file:///bad.pdf", "bad.pdf")).rejects.toThrow("network");
    expect(mockExtract).not.toHaveBeenCalled();
  });
});
