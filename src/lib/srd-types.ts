export const SRD_CATEGORIES = [
  "spells",
  "creatures",
  "classes",
  "species",
  "feats",
  "backgrounds",
  "magicitems",
  "items",
  "weapons",
  "armor",
  "conditions",
] as const;

export type SrdCategory = (typeof SRD_CATEGORIES)[number];

export interface SrdSourceRef {
  key: string;
  display_name: string;
  publisher?: { name: string; key: string };
  gamesystem?: { name: string; key: string };
}

export interface SrdEntry {
  key: string;
  name: string;
  document?: SrdSourceRef;
  [field: string]: unknown;
}

export interface SrdSource {
  key: string;
  name: string;
  display_name: string;
  type: string;
  publisher?: { name: string; key: string };
  gamesystem?: { name: string; key: string };
  desc?: string;
  permalink?: string;
}

export function isSrdCategory(value: string): value is SrdCategory {
  return (SRD_CATEGORIES as readonly string[]).includes(value);
}

// Sources checked by default so a new DM isn't buried in ~9,000 third-party
// entries on first use — everything else is opt-in via the source filter.
export const DEFAULT_SOURCES = ["srd-2014", "srd-2024"];
