import Constants from "expo-constants";

/**
 * Client-side contract for the bundled-AI backend (server/). Mirrored, not
 * imported — that's a separate deployable package with its own runtime and
 * tsconfig — so keep these in sync with server/src/types.ts by hand when
 * either side changes.
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

interface GenerateResponseBody {
  text?: string;
  suggestions?: LinkSuggestion[];
}

export class AiProxyNotConfiguredError extends Error {
  constructor() {
    super("The bundled AI backend isn't set up yet.");
    this.name = "AiProxyNotConfiguredError";
  }
}

function proxyUrl(): string | undefined {
  const extra = Constants.expoConfig?.extra as { aiProxyUrl?: string } | undefined;
  return extra?.aiProxyUrl || undefined;
}

type GenerateContext =
  | CampaignRecapContext
  | SessionSummaryContext
  | NpcNameContext
  | NpcDescriptionContext
  | LinkSuggestionsContext;

async function generate(type: GenerateRequestType, appUserId: string, context: GenerateContext): Promise<GenerateResponseBody> {
  const baseUrl = proxyUrl();
  if (!baseUrl) throw new AiProxyNotConfiguredError();

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, appUserId, context }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error ?? `Request failed (HTTP ${res.status})`);
  }
  return body as GenerateResponseBody;
}

export async function generateCampaignRecap(appUserId: string, context: CampaignRecapContext): Promise<string> {
  const body = await generate("campaign_recap", appUserId, context);
  return body.text ?? "";
}

export async function generateSessionSummary(appUserId: string, context: SessionSummaryContext): Promise<string> {
  const body = await generate("session_summary", appUserId, context);
  return body.text ?? "";
}

export async function generateNpcNamePremium(appUserId: string, context: NpcNameContext): Promise<string> {
  const body = await generate("npc_name", appUserId, context);
  return body.text ?? "";
}

export async function generateNpcDescriptionPremium(appUserId: string, context: NpcDescriptionContext): Promise<string> {
  const body = await generate("npc_description", appUserId, context);
  return body.text ?? "";
}

export async function suggestLinks(appUserId: string, context: LinkSuggestionsContext): Promise<LinkSuggestion[]> {
  const body = await generate("link_suggestions", appUserId, context);
  return body.suggestions ?? [];
}
