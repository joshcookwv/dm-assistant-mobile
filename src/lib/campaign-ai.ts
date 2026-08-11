import { cachedText, callMessages } from "./ai";

const CAMPAIGN_SUMMARY_PROMPT = `You are helping a Dungeon Master keep a concise campaign status summary.

Using only the supplied campaign information, write a compact 2-4 paragraph summary covering the party, important places, recent events, unresolved hooks, and the most useful next-session reminders. Do not invent facts. Use plain text with short headings only when they improve scanning at the table.`;

const SESSION_SUMMARY_PROMPT = `You are helping a Dungeon Master turn rough session notes into a useful recap.

Write a concise 2-4 paragraph session summary covering the major events, decisions, consequences, discoveries, and unresolved hooks. Preserve names and facts from the supplied notes, do not invent details, and return plain text without an introductory sentence about the task.`;

function textFromMessage(message: any): string {
  return message.content
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

export async function generateCampaignSummary(input: {
  campaignName: string;
  currentNotes?: string;
  party: string[];
  locations: string[];
  sessions: string[];
}): Promise<string> {
  const details = [
    `Campaign: ${input.campaignName}`,
    input.currentNotes?.trim() && `Current campaign notes:\n${input.currentNotes.trim()}`,
    `Party:\n${input.party.length ? input.party.map((item) => `- ${item}`).join("\n") : "- None recorded"}`,
    `Locations:\n${input.locations.length ? input.locations.map((item) => `- ${item}`).join("\n") : "- None recorded"}`,
    `Sessions (newest first):\n${input.sessions.length ? input.sessions.map((item) => `- ${item}`).join("\n") : "- None recorded"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const message = await callMessages({
    max_tokens: 700,
    system: [cachedText(CAMPAIGN_SUMMARY_PROMPT)],
    messages: [{ role: "user", content: details }],
  });
  return textFromMessage(message);
}

export async function generateSessionSummary(input: {
  campaignName: string;
  sessionName: string;
  playedOn?: string;
  notes: string;
}): Promise<string> {
  const message = await callMessages({
    max_tokens: 600,
    system: [cachedText(SESSION_SUMMARY_PROMPT)],
    messages: [
      {
        role: "user",
        content: [
          `Campaign: ${input.campaignName}`,
          `Session: ${input.sessionName}`,
          input.playedOn && `Date: ${input.playedOn}`,
          `Rough notes:\n${input.notes}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });
  return textFromMessage(message);
}
