import { cachedText, callMessages } from "./ai";

export type GenerateRequestType =
  | "campaign_recap"
  | "session_summary"
  | "npc_name"
  | "npc_description"
  | "link_suggestions";

export interface SessionTimelineEntryPayload {
  session: { id: number; number: number; name: string; playedOn: string | null; recap: string };
  npcNames: string[];
  locationNames: string[];
  encounterNames: string[];
}

export interface CampaignRecapContext {
  campaignName: string;
  sessions: SessionTimelineEntryPayload[];
  notes: { title: string; content: string }[];
}

export interface SessionSummaryContext {
  campaignName: string;
  session: { number: number; name: string; playedOn: string | null };
  npcNames: string[];
  locationNames: string[];
  encounterNames: string[];
  existingRecap: string;
}

export interface NpcNameContext {
  race?: string;
  role?: string;
  location?: string;
}

export interface NpcDescriptionContext {
  name: string;
  race?: string;
  role?: string;
  location?: string;
}

export interface LinkSuggestionsContext {
  sourceText: string;
  knownNpcNames: string[];
  knownLocationNames: string[];
}

export interface LinkSuggestion {
  kind: "appearance" | "relation";
  npcName: string;
  locationName?: string;
  relatedNpcName?: string;
  relationType?: string;
  reason: string;
}

function messageText(message: any): string {
  return message.content
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

async function generateText(system: string, context: unknown, maxTokens = 700): Promise<string> {
  const message = await callMessages({
    max_tokens: maxTokens,
    system: [cachedText(system)],
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });
  return messageText(message);
}

/**
 * The legacy appUserId argument remains for call-site compatibility only.
 * Identity is never put in the request body: callMessages derives the current
 * RevenueCat ID and sends it in the entitlement-gated proxy header.
 */
export async function generateCampaignRecap(
  _appUserId: string,
  context: CampaignRecapContext,
): Promise<string> {
  return generateText(
    "Write a concise campaign story-so-far from only the supplied timeline and notes. Preserve names and facts, highlight consequences and unresolved hooks, and do not invent details.",
    context,
  );
}

export async function generateSessionSummary(
  _appUserId: string,
  context: SessionSummaryContext,
): Promise<string> {
  return generateText(
    "Write a concise tabletop session recap using only the supplied facts. Cover major events, decisions, consequences, discoveries, and unresolved hooks. Do not invent details.",
    context,
    600,
  );
}

export async function generateNpcNamePremium(
  _appUserId: string,
  context: NpcNameContext,
): Promise<string> {
  return generateText("Return one fitting fantasy NPC name and nothing else.", context, 80);
}

export async function generateNpcDescriptionPremium(
  _appUserId: string,
  context: NpcDescriptionContext,
): Promise<string> {
  return generateText(
    "Write a compact, game-ready NPC description using only the supplied facts. Include appearance, manner, motivation, and one usable hook without inventing campaign facts.",
    context,
    350,
  );
}

const LINK_SUGGESTION_TOOL = {
  name: "record_link_suggestions",
  description: "Return only plausible links explicitly supported by the recap and known names.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      suggestions: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", enum: ["appearance", "relation"] },
            npcName: { type: "string" },
            locationName: { type: "string" },
            relatedNpcName: { type: "string" },
            relationType: { type: "string" },
            reason: { type: "string" },
          },
          required: ["kind", "npcName", "reason"],
        },
      },
    },
    required: ["suggestions"],
  },
} as const;

function validSuggestion(value: unknown): value is LinkSuggestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (item.kind !== "appearance" && item.kind !== "relation") return false;
  if (typeof item.npcName !== "string" || typeof item.reason !== "string") return false;
  if (item.kind === "appearance" && typeof item.locationName !== "string") return false;
  if (item.kind === "relation" && typeof item.relatedNpcName !== "string") return false;
  return true;
}

export async function suggestLinks(
  _appUserId: string,
  context: LinkSuggestionsContext,
): Promise<LinkSuggestion[]> {
  const message = await callMessages({
    max_tokens: 800,
    system: [
      cachedText(
        "Find NPC appearances at campaign locations and relationships between known NPCs that are explicitly supported by the recap. Use only exact names from the supplied known-name lists. Return no speculative links.",
      ),
    ],
    tools: [LINK_SUGGESTION_TOOL],
    tool_choice: { type: "tool", name: LINK_SUGGESTION_TOOL.name },
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });
  const toolUse = message.content.find(
    (block: any) => block.type === "tool_use" && block.name === LINK_SUGGESTION_TOOL.name,
  );
  const suggestions = toolUse?.input?.suggestions;
  return Array.isArray(suggestions) ? suggestions.filter(validSuggestion).slice(0, 20) : [];
}
