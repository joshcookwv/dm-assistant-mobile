import { cachedText, callMessages } from "./ai";

// Static across every call — cached so repeated use isn't repriced/recomputed.
const DESCRIPTION_SYSTEM_PROMPT = `You are helping a Dungeon Master flesh out an NPC for a D&D 5e campaign.

Write a short NPC description (3-5 sentences) covering: physical appearance, personality, a distinguishing quirk or mannerism, and a motivation or secret the DM can use as a hook. Write it as a single plain-prose paragraph the DM can read at the table or drop into their notes. Start directly with the first sentence of the description — do not include a title, heading, markdown formatting, or the name on its own line before it, and do not repeat the name/race/role/location back verbatim as a list.`;

const NAME_SYSTEM_PROMPT = `You are helping a Dungeon Master name an NPC for a D&D 5e campaign.

Suggest a single fitting fantasy name for this character (first name, plus a surname or epithet if it suits the race/culture). Reply with just the name and nothing else — no explanation, no quotation marks, no alternatives.`;

function textFromMessage(message: any): string {
  return message.content
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

export async function suggestNpcDescription(input: {
  name: string;
  race?: string;
  role?: string;
  location?: string;
}): Promise<string> {
  const details = [
    `Name: ${input.name}`,
    input.race && `Race: ${input.race}`,
    input.role && `Role: ${input.role}`,
    input.location && `Location: ${input.location}`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await callMessages({
    max_tokens: 400,
    system: [cachedText(DESCRIPTION_SYSTEM_PROMPT)],
    messages: [{ role: "user", content: details }],
  });

  // Defensive cleanup in case the model still opens with a heading/title line.
  return textFromMessage(message).replace(/^#{1,6}\s*.*\n+/, "").trim();
}

export async function suggestNpcName(input: {
  race?: string;
  role?: string;
  location?: string;
}): Promise<string> {
  const details =
    [input.race && `Race: ${input.race}`, input.role && `Role: ${input.role}`, input.location && `Location: ${input.location}`]
      .filter(Boolean)
      .join("\n") || "No further details given — invent something fitting.";

  const message = await callMessages({
    max_tokens: 20,
    system: [cachedText(NAME_SYSTEM_PROMPT)],
    messages: [{ role: "user", content: details }],
  });

  return textFromMessage(message).replace(/^["']|["']$/g, "");
}
