import { cachedText, type AnthropicMessageParams } from "./anthropic";
import type {
  CampaignRecapContext,
  GenerateContext,
  GenerateRequestType,
  LinkSuggestionsContext,
  NpcDescriptionContext,
  NpcNameContext,
  SessionSummaryContext,
} from "./types";

/**
 * Model split is deliberate, not a default: campaign_recap and
 * session_summary are the only two features that use Sonnet. Everything
 * else — including the bundled NPC generator, which mirrors the app's
 * existing BYO-key feature — stays on Haiku to keep the common case cheap.
 */
export const MODEL_BY_TYPE: Record<GenerateRequestType, string> = {
  campaign_recap: "claude-sonnet-5",
  session_summary: "claude-sonnet-5",
  npc_name: "claude-haiku-4-5",
  npc_description: "claude-haiku-4-5",
  link_suggestions: "claude-haiku-4-5",
};

const CAMPAIGN_RECAP_SYSTEM = `You are helping a Dungeon Master recap their D&D 5e campaign so far.

Write a "story so far" recap in plain prose (4-8 paragraphs depending on how much has happened), covering the throughline across sessions: who the party met, where they went, what they accomplished, and any threads still open. Write it for the DM's own reference, or to read aloud to a player who missed a few sessions. Do not invent events beyond what's implied by the session, NPC, location, and note data given — if the record is thin, say less rather than making things up. Start directly with the recap — no title, no markdown headers.`;

const SESSION_SUMMARY_SYSTEM = `You are helping a Dungeon Master write a one-session recap for their D&D 5e campaign.

Write a concise summary (1-3 paragraphs) of what happened in this session, using the NPCs, locations, and encounters given. If the DM's existing notes are provided, treat them as a rough draft to tidy and expand, not something to discard. Do not invent specifics beyond what's given. Start directly with the summary — no title, no markdown headers.`;

// Kept verbatim in sync with src/lib/npc-ai.ts's system prompts, so the
// bundled (paid) and BYO-key (free) NPC generators read the same.
const NPC_DESCRIPTION_SYSTEM = `You are helping a Dungeon Master flesh out an NPC for a D&D 5e campaign.

Write a short NPC description (3-5 sentences) covering: physical appearance, personality, a distinguishing quirk or mannerism, and a motivation or secret the DM can use as a hook. Write it as a single plain-prose paragraph the DM can read at the table or drop into their notes. Start directly with the first sentence of the description — do not include a title, heading, markdown formatting, or the name on its own line before it, and do not repeat the name/race/role/location back verbatim as a list.`;

const NPC_NAME_SYSTEM = `You are helping a Dungeon Master name an NPC for a D&D 5e campaign.

Suggest a single fitting fantasy name for this character (first name, plus a surname or epithet if it suits the race/culture). Reply with just the name and nothing else — no explanation, no quotation marks, no alternatives.`;

const LINK_SUGGESTIONS_SYSTEM = `You help a Dungeon Master keep their campaign's records connected. Given a piece of freeform session or note text and the DM's already-known NPC and location names, find two kinds of gaps: NPCs the text mentions who aren't yet linked to this location/session, and pairs of NPCs the text implies have a relationship (ally, rival, family, servant, mentor, etc.) that isn't recorded yet.

Only suggest a link when the text gives a real, specific reason — never guess from a name alone, and never suggest a link the DM has already recorded. If nothing qualifies, return an empty list. Call record_link_suggestions exactly once with your findings.`;

const LINK_SUGGESTIONS_TOOL = {
  name: "record_link_suggestions",
  description: "Record the NPC appearance and relationship links found in the text.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["appearance", "relation"] },
            npcName: { type: "string", description: "The NPC this suggestion is about." },
            locationName: { type: "string", description: "For kind=appearance: where the NPC was mentioned." },
            relatedNpcName: { type: "string", description: "For kind=relation: the other NPC involved." },
            relationType: {
              type: "string",
              description: "For kind=relation: a short label, e.g. ally, rival, family, servant.",
            },
            reason: {
              type: "string",
              description: "Why this link is suggested, quoting or paraphrasing the text.",
            },
          },
          required: ["kind", "npcName", "reason"],
        },
      },
    },
    required: ["suggestions"],
  },
} as const;

function joinLines(parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}

export function buildPromptRequest(type: GenerateRequestType, context: GenerateContext): AnthropicMessageParams {
  const model = MODEL_BY_TYPE[type];

  switch (type) {
    case "campaign_recap": {
      const ctx = context as CampaignRecapContext;
      const sessionBlocks = ctx.sessions
        .map((entry) =>
          joinLines([
            `Session ${entry.session.number}${entry.session.name ? ` — ${entry.session.name}` : ""}`,
            entry.locationNames.length > 0 && `Locations: ${entry.locationNames.join(", ")}`,
            entry.npcNames.length > 0 && `NPCs: ${entry.npcNames.join(", ")}`,
            entry.encounterNames.length > 0 && `Encounters: ${entry.encounterNames.join(", ")}`,
            !!entry.session.recap && `DM's notes: ${entry.session.recap}`,
          ])
        )
        .join("\n\n");
      const noteBlock = ctx.notes.map((n) => `- ${n.title}: ${n.content}`).join("\n");
      const details = joinLines([
        `Campaign: ${ctx.campaignName}`,
        "",
        sessionBlocks ? `Sessions:\n${sessionBlocks}` : "No sessions logged yet.",
        noteBlock && `\nNotes:\n${noteBlock}`,
      ]);
      return {
        model,
        max_tokens: 3000,
        output_config: { effort: "medium" },
        system: [cachedText(CAMPAIGN_RECAP_SYSTEM)],
        messages: [{ role: "user", content: details }],
      };
    }

    case "session_summary": {
      const ctx = context as SessionSummaryContext;
      const details = joinLines([
        `Campaign: ${ctx.campaignName}`,
        `Session ${ctx.session.number}${ctx.session.name ? ` — ${ctx.session.name}` : ""}`,
        ctx.locationNames.length > 0 && `Locations visited: ${ctx.locationNames.join(", ")}`,
        ctx.npcNames.length > 0 && `NPCs who appeared: ${ctx.npcNames.join(", ")}`,
        ctx.encounterNames.length > 0 && `Encounters run: ${ctx.encounterNames.join(", ")}`,
        !!ctx.existingRecap && `DM's existing notes: ${ctx.existingRecap}`,
      ]);
      return {
        model,
        max_tokens: 1200,
        output_config: { effort: "medium" },
        system: [cachedText(SESSION_SUMMARY_SYSTEM)],
        messages: [{ role: "user", content: details }],
      };
    }

    case "npc_description": {
      const ctx = context as NpcDescriptionContext;
      const details = joinLines([
        `Name: ${ctx.name}`,
        !!ctx.race && `Race: ${ctx.race}`,
        !!ctx.role && `Role: ${ctx.role}`,
        !!ctx.location && `Location: ${ctx.location}`,
      ]);
      return {
        model,
        max_tokens: 400,
        system: [cachedText(NPC_DESCRIPTION_SYSTEM)],
        messages: [{ role: "user", content: details }],
      };
    }

    case "npc_name": {
      const ctx = context as NpcNameContext;
      const details =
        joinLines([!!ctx.race && `Race: ${ctx.race}`, !!ctx.role && `Role: ${ctx.role}`, !!ctx.location && `Location: ${ctx.location}`]) ||
        "No further details given — invent something fitting.";
      return {
        model,
        max_tokens: 20,
        system: [cachedText(NPC_NAME_SYSTEM)],
        messages: [{ role: "user", content: details }],
      };
    }

    case "link_suggestions": {
      const ctx = context as LinkSuggestionsContext;
      const details = joinLines([
        `Known NPCs: ${ctx.knownNpcNames.join(", ") || "none yet"}`,
        `Known locations: ${ctx.knownLocationNames.join(", ") || "none yet"}`,
        "",
        `Text:\n${ctx.sourceText}`,
      ]);
      return {
        model,
        max_tokens: 800,
        system: [cachedText(LINK_SUGGESTIONS_SYSTEM)],
        messages: [{ role: "user", content: details }],
        tools: [LINK_SUGGESTIONS_TOOL],
        tool_choice: { type: "tool", name: "record_link_suggestions" },
      };
    }
  }
}
