interface NamedRef {
  name?: string;
  [key: string]: unknown;
}

export function refList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((v) => (typeof v === "object" && v !== null ? (v as NamedRef).name : String(v)))
    .filter(Boolean)
    .join(", ");
}

export function joinLines(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n\n");
  if (typeof value === "string") return value;
  return "";
}

export function formatChallengeRating(cr: unknown): string {
  if (typeof cr !== "number") return "?";
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

export function abilityMod(mod: unknown): string {
  if (typeof mod !== "number") return "";
  return mod >= 0 ? `+${mod}` : String(mod);
}

export function formatSpeed(speedAll: unknown): string {
  if (!speedAll || typeof speedAll !== "object") return "";
  const s = speedAll as Record<string, unknown>;
  const unit = (s.unit as string) ?? "feet";
  const parts: string[] = [];
  for (const key of ["walk", "fly", "swim", "climb", "burrow", "crawl"]) {
    const val = s[key];
    if (typeof val === "number" && val > 0) {
      parts.push(`${key} ${val} ${unit}${key === "fly" && s.hover ? " (hover)" : ""}`);
    }
  }
  return parts.join(", ");
}

export function formatSenses(entry: Record<string, unknown>): string {
  const parts: string[] = [];
  const senseFields: [string, string][] = [
    ["darkvision_range", "darkvision"],
    ["blindsight_range", "blindsight"],
    ["tremorsense_range", "tremorsense"],
    ["truesight_range", "truesight"],
  ];
  for (const [field, label] of senseFields) {
    const val = entry[field];
    if (typeof val === "number" && val > 0) parts.push(`${label} ${val} ft.`);
  }
  if (typeof entry.passive_perception === "number") {
    parts.push(`passive Perception ${entry.passive_perception}`);
  }
  return parts.join(", ");
}

export function formatProficiencyMap(value: unknown, labelPrefix = ""): string {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value as Record<string, number>)
    .map(([key, val]) => `${labelPrefix}${key.replace(/_/g, " ")} ${abilityMod(val)}`)
    .join(", ");
}

export function formatCost(cost: unknown): string {
  if (cost === null || cost === undefined || cost === "") return "";
  return `${cost} gp`;
}
