/**
 * The wire contract for POST /generate. Mirrored (not imported — this
 * service has no dependency on the RN app or its SQLite-backed
 * campaign-intelligence.ts) by the client's future ai-premium.ts, which
 * assembles these context objects from getCampaignTimeline /
 * getCampaignOverviewStats and posts them here.
 */
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
  /** Freeform text to scan — a session recap or a note's content. */
  sourceText: string;
  knownNpcNames: string[];
  knownLocationNames: string[];
}

export type GenerateContext =
  | CampaignRecapContext
  | SessionSummaryContext
  | NpcNameContext
  | NpcDescriptionContext
  | LinkSuggestionsContext;

export interface GenerateRequestBody {
  type: GenerateRequestType;
  /** The device's RevenueCat app_user_id — entitlement is checked against this. */
  appUserId: string;
  context: GenerateContext;
}

export interface LinkSuggestion {
  kind: "appearance" | "relation";
  npcName: string;
  /** appearance suggestions only */
  locationName?: string;
  /** relation suggestions only */
  relatedNpcName?: string;
  relationType?: string;
  /** Why the model suggested this — shown to the DM before they approve it. */
  reason: string;
}

export interface GenerateResponseBody {
  /** campaign_recap, session_summary, npc_name, npc_description */
  text?: string;
  /** link_suggestions only — never written directly, the client presents these for DM approval */
  suggestions?: LinkSuggestion[];
}

export interface GenerateErrorBody {
  error: string;
}
