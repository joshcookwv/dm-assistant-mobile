import { AiRequestError, requestAiProxy } from "./ai";

export type ReportCategory =
  | "offensive"
  | "sexual"
  | "violence_self_harm"
  | "deceptive_unsafe"
  | "other";

export interface AiOutputReportInput {
  category: ReportCategory;
  comment?: string;
  output: string;
  feature: "npc" | "campaign_summary" | "session_summary" | "pdf_import";
  model: string;
}

export async function submitAiReport(
  input: AiOutputReportInput
): Promise<{ reportId: string }> {
  const response = await requestAiProxy<{ reportId?: unknown }>("/v1/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: input.category,
      comment: input.comment,
      output: input.output,
      feature: input.feature,
      model: input.model,
    }),
  });
  if (typeof response.reportId !== "string" || !response.reportId) {
    throw new AiRequestError("The report could not be submitted.", 502, null);
  }
  return { reportId: response.reportId };
}
