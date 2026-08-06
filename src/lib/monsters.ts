import { listBestiary } from "./bestiary";
import { listSrdEntries } from "./srd";
import { formatChallengeRating } from "./srd-format";

export type MonsterOrigin = "custom" | "srd";

/**
 * A monster from either source, flattened into one shape so the Monsters
 * browser, the encounter picker, and session prep can all work with a single
 * list instead of reconciling SRD entries against homebrew rows themselves.
 */
export interface MonsterListItem {
  origin: MonsterOrigin;
  /** Stable list key, unique across both origins. */
  key: string;
  /** Set for homebrew monsters — the `bestiary` row id. */
  id?: number;
  /** Set for official monsters — the SRD entry key. */
  srdKey?: string;
  name: string;
  challengeRating: string;
  typeLabel: string;
  hitPoints: number;
  armorClass: number | null;
}

export type MonsterFilter = "all" | "srd" | "custom";

function customToItem(m: {
  id: number;
  name: string;
  type: string;
  challenge_rating: string;
  hit_points: number | null;
  armor_class: number | null;
}): MonsterListItem {
  return {
    origin: "custom",
    key: `custom-${m.id}`,
    id: m.id,
    name: m.name,
    challengeRating: m.challenge_rating,
    typeLabel: m.type,
    hitPoints: m.hit_points ?? 0,
    armorClass: m.armor_class,
  };
}

function srdToItem(entry: Record<string, unknown> & { key: string; name: string }): MonsterListItem {
  const type = entry.type as { name?: string } | undefined;
  return {
    origin: "srd",
    key: `srd-${entry.key}`,
    srdKey: entry.key,
    name: entry.name,
    challengeRating: formatChallengeRating(entry.challenge_rating),
    typeLabel: type?.name ?? "",
    hitPoints: typeof entry.hit_points === "number" ? entry.hit_points : 0,
    armorClass: typeof entry.armor_class === "number" ? entry.armor_class : null,
  };
}

/**
 * Homebrew monsters sort first — there are far fewer of them and they're the
 * ones the DM authored, so burying them in thousands of official entries would
 * make them effectively unfindable.
 */
export async function listMonsters(options?: {
  query?: string;
  sources?: string[];
  filter?: MonsterFilter;
  limitPerOrigin?: number;
}): Promise<MonsterListItem[]> {
  const { query, sources, filter = "all", limitPerOrigin } = options ?? {};

  const customRows = filter === "srd" ? [] : listBestiary(query);
  const srdRows = filter === "custom" ? [] : await listSrdEntries("creatures", query, sources);

  // Slice before mapping — a broad query can match thousands of official
  // entries, and the caller only ever renders the first handful.
  const cap = <T,>(rows: T[]) => (limitPerOrigin === undefined ? rows : rows.slice(0, limitPerOrigin));

  return [...cap(customRows).map(customToItem), ...cap(srdRows).map(srdToItem)];
}
