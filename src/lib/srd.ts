import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import { formatChallengeRating } from "./srd-format";
import { SrdCategory, SrdEntry, SrdSource } from "./srd-types";

export { SRD_CATEGORIES, isSrdCategory, DEFAULT_SOURCES } from "./srd-types";
export type { SrdCategory, SrdEntry, SrdSource, SrdSourceRef } from "./srd-types";

// Metro requires require() arguments to be static string literals, so each
// bundled SRD file needs its own explicit entry rather than a templated path.
const ASSET_MODULES: Record<SrdCategory | "sources", number> = {
  spells: require("../../assets/srd/spells.srddata"),
  creatures: require("../../assets/srd/creatures.srddata"),
  classes: require("../../assets/srd/classes.srddata"),
  species: require("../../assets/srd/species.srddata"),
  feats: require("../../assets/srd/feats.srddata"),
  backgrounds: require("../../assets/srd/backgrounds.srddata"),
  magicitems: require("../../assets/srd/magicitems.srddata"),
  items: require("../../assets/srd/items.srddata"),
  weapons: require("../../assets/srd/weapons.srddata"),
  armor: require("../../assets/srd/armor.srddata"),
  conditions: require("../../assets/srd/conditions.srddata"),
  sources: require("../../assets/srd/sources.srddata"),
};

const cache = new Map<SrdCategory, SrdEntry[]>();
let sourcesCache: SrdSource[] | null = null;

async function loadJson<T>(moduleId: number): Promise<T> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error("SRD asset failed to resolve a local URI");
  return new File(asset.localUri).json();
}

async function loadCategory(category: SrdCategory): Promise<SrdEntry[]> {
  const cached = cache.get(category);
  if (cached) return cached;
  const entries = await loadJson<SrdEntry[]>(ASSET_MODULES[category]);
  cache.set(category, entries);
  return entries;
}

export async function listSrdSources(): Promise<SrdSource[]> {
  if (sourcesCache) return sourcesCache;
  sourcesCache = await loadJson<SrdSource[]>(ASSET_MODULES.sources);
  return sourcesCache;
}

export async function listSrdEntries(
  category: SrdCategory,
  query?: string,
  sources?: string[]
): Promise<SrdEntry[]> {
  let entries = await loadCategory(category);

  // "conditions" merges every source's wording into one shared entry via a
  // `descriptions[]` array rather than a single `document`, so it isn't
  // meaningfully filterable by source — always show the full set.
  if (sources && sources.length > 0 && category !== "conditions") {
    const sourceSet = new Set(sources);
    entries = entries.filter((entry) => entry.document && sourceSet.has(entry.document.key));
  }

  if (!query || !query.trim()) return entries;

  const q = query.trim().toLowerCase();

  if (category === "creatures") {
    // "5", "1/2", or "cr 5" all match by exact challenge rating, alongside
    // the usual name search — a plain substring match would be wrong here
    // (searching "1" would also match CR 10, 11, 12…).
    const crQuery = q.replace(/^cr\s*/, "");
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        formatChallengeRating(entry.challenge_rating).toLowerCase() === crQuery
    );
  }

  return entries.filter((entry) => entry.name.toLowerCase().includes(q));
}

export async function getSrdEntry(
  category: SrdCategory,
  key: string
): Promise<SrdEntry | undefined> {
  const entries = await loadCategory(category);
  return entries.find((entry) => entry.key === key);
}
