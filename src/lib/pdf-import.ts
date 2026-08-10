import { cachedText, callMessages, deleteFile, FILES_API_BETA, uploadFile } from "./ai";
import type { ExtractionResult } from "./pdf-extract-types";

export type { ExtractedNpc, ExtractedMonster, ExtractedRule, ExtractionResult } from "./pdf-extract-types";

const EXTRACTION_TOOL_NAME = "record_extracted_content";

// Static across every call — cached so repeated use isn't repriced/recomputed.
const EXTRACTION_SYSTEM_PROMPT = `You are helping a Dungeon Master import content from a D&D sourcebook PDF into their campaign notes app. Read the entire attached document.

Call ${EXTRACTION_TOOL_NAME} with everything found in it:
- npcs: named characters with a personality/role, not just a bare monster stat block
- monsters: anything presented with combat statistics (AC, HP, etc.)
- rules: standalone rules, mechanics, or optional-rules text that isn't an NPC or monster

Only extract what is actually present in the text — never invent or embellish content, and don't extract page headers, table-of-contents entries, or generic flavor text as "rules". If the document has nothing of a given type, return an empty array for it.`;

const EXTRACTION_TOOL = {
  name: EXTRACTION_TOOL_NAME,
  description:
    "Record every NPC, monster stat block, and standalone rule found in this D&D sourcebook document.",
  input_schema: {
    type: "object",
    properties: {
      npcs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            race: { type: "string" },
            role: { type: "string" },
            location: { type: "string" },
            description: {
              type: "string",
              description: "Personality, appearance, and motivation as found in the text.",
            },
          },
          required: ["name"],
        },
      },
      monsters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            size: { type: "string" },
            type: { type: "string" },
            alignment: { type: "string" },
            armor_class: { type: "number" },
            hit_points: { type: "number" },
            hit_dice: { type: "string" },
            speed: { type: "string" },
            challenge_rating: { type: "string" },
            stat_block: {
              type: "string",
              description:
                "The rest of the stat block as plain text: ability scores, saves, skills, senses, languages, traits, actions, legendary actions, etc.",
            },
          },
          required: ["name"],
        },
      },
      rules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
          },
          required: ["title", "content"],
        },
      },
    },
    required: ["npcs", "monsters", "rules"],
  },
};

export type PdfImportStage = "uploading" | "extracting";

/**
 * Sends the whole PDF to Claude as a native document content block instead
 * of extracting text locally and chunking it (the web app's approach with
 * pdfjs-dist) — one call instead of upload-then-chunk-then-extract, and it
 * also handles scanned/image-only pages the old text-layer-only extraction
 * couldn't. Very large sourcebooks may still hit this call's max_tokens
 * ceiling — `truncated` flags that so the caller can tell the user the
 * results may be incomplete.
 *
 * The PDF is uploaded via the Files API and referenced by file_id rather
 * than inlined as base64: base64 inflates size ~33%, so any raw PDF over
 * ~24MB already exceeded the 32MB inline-request cap — a real limit for
 * full sourcebook scans. The Files API's 500MB-per-file ceiling has enough
 * headroom that this isn't a concern in practice.
 *
 * `onStageChange` lets the caller (the import screen) show upload progress
 * separately from extraction progress — the two can take meaningfully
 * different amounts of time depending on connection speed vs. document
 * length.
 */
export async function extractFromPdf(
  uri: string,
  filename: string,
  onStageChange?: (stage: PdfImportStage) => void
): Promise<ExtractionResult & { truncated: boolean }> {
  onStageChange?.("uploading");
  const fileId = await uploadFile(uri, filename, "application/pdf");

  try {
    onStageChange?.("extracting");
    const message = await callMessages(
      {
        max_tokens: 8192,
        system: [cachedText(EXTRACTION_SYSTEM_PROMPT)],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "file", file_id: fileId } },
              { type: "text", text: "Extract everything from this document." },
            ],
          },
        ],
      },
      [FILES_API_BETA]
    );

    const toolUse = message.content.find((block: any) => block.type === "tool_use");
    const input = toolUse?.input ?? {};
    return {
      npcs: Array.isArray(input.npcs) ? input.npcs : [],
      monsters: Array.isArray(input.monsters) ? input.monsters : [],
      rules: Array.isArray(input.rules) ? input.rules : [],
      truncated: message.stop_reason === "max_tokens",
    };
  } finally {
    // The file is only ever needed for this one extraction call — clean it
    // up so repeated imports don't silently accumulate storage. Best-effort:
    // a failed delete shouldn't mask the extraction's actual result/error.
    void deleteFile(fileId);
  }
}
