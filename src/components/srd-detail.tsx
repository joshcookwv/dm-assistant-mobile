import { Fragment } from "react";
import { Image, Text, View } from "react-native";

import {
  abilityMod,
  formatChallengeRating,
  formatCost,
  formatSenses,
  formatSpeed,
  refList,
} from "@/lib/srd-format";
import type { SrdCategory, SrdEntry } from "@/lib/srd";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">{title}</Text>
      <View className="mt-1">{children}</View>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View className="flex-row gap-2">
      <Text className="text-sm font-medium text-muted">{label}:</Text>
      <Text className="flex-1 text-sm text-foreground">{value}</Text>
    </View>
  );
}

function Prose({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View className="gap-2">
      {text.split("\n\n").map((para, i) => (
        <Text key={i} className="leading-relaxed text-foreground/90">
          {para}
        </Text>
      ))}
    </View>
  );
}

function NamedList({ items }: { items: { name?: string; desc?: string }[] }) {
  return (
    <View className="gap-3">
      {items.map((item, i) => (
        <View key={i}>
          {!!item.name && <Text className="font-medium text-foreground">{item.name}</Text>}
          {!!item.desc && <Text className="text-foreground/80">{item.desc}</Text>}
        </View>
      ))}
    </View>
  );
}

function SourceBadge({ entry }: { entry: SrdEntry }) {
  if (!entry.document) return null;
  return (
    <View className="rounded-full border border-panel-border px-2 py-0.5">
      <Text className="text-xs text-muted">{entry.document.display_name}</Text>
    </View>
  );
}

const ABILITIES: { key: string; label: string }[] = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
];

function SpellDetail({ entry: e }: { entry: SrdEntry }) {
  const school = e.school as { name?: string } | undefined;
  const components: string[] = [];
  if (e.verbal) components.push("V");
  if (e.somatic) components.push("S");
  if (e.material) components.push("M");

  return (
    <>
      <Text className="text-sm text-muted">
        {typeof e.level === "number" && e.level === 0 ? "Cantrip" : `Level ${e.level}`}
        {school?.name ? ` · ${school.name}` : ""}
        {e.ritual ? " (ritual)" : ""}
      </Text>
      <Section title="Details">
        <Field label="Casting Time" value={e.casting_time as string} />
        <Field label="Range" value={(e.range_text as string) ?? (e.range as string)} />
        <Field
          label="Components"
          value={components.join(", ") + (e.material_specified ? ` (${e.material_specified})` : "")}
        />
        <Field label="Duration" value={e.duration as string} />
        <Field label="Concentration" value={e.concentration ? "Yes" : "No"} />
      </Section>
      <Section title="Description">
        <Prose text={e.desc as string} />
      </Section>
      {!!e.higher_level && (
        <Section title="At Higher Levels">
          <Prose text={e.higher_level as string} />
        </Section>
      )}
      {Array.isArray(e.classes) && e.classes.length > 0 && (
        <Section title="Classes">
          <Text className="text-sm text-foreground">{refList(e.classes)}</Text>
        </Section>
      )}
    </>
  );
}

function CreatureDetail({ entry: e }: { entry: SrdEntry }) {
  const type = e.type as { name?: string } | undefined;
  const size = e.size as { name?: string } | undefined;
  const abilityScores = (e.ability_scores as Record<string, number>) ?? {};
  const modifiers = (e.modifiers as Record<string, number>) ?? {};
  const savingThrows = (e.saving_throws as Record<string, number>) ?? {};
  const skillBonuses = (e.skill_bonuses as Record<string, number>) ?? {};
  const ri = (e.resistances_and_immunities as Record<string, string>) ?? {};
  const languages = e.languages as { as_string?: string } | undefined;
  const illustration = e.illustration as { file_url?: string; alt_text?: string } | undefined;

  const actions = (e.actions as { name: string; desc: string; action_type: string }[]) ?? [];
  const actionGroups: Record<string, typeof actions> = {};
  for (const action of actions) {
    const group = action.action_type || "ACTION";
    (actionGroups[group] ??= []).push(action);
  }
  const groupLabels: Record<string, string> = {
    ACTION: "Actions",
    BONUS_ACTION: "Bonus Actions",
    REACTION: "Reactions",
    LEGENDARY_ACTION: "Legendary Actions",
  };

  return (
    <>
      <Text className="text-sm text-muted">
        {size?.name} {type?.name}, {e.alignment as string}
      </Text>
      {!!illustration?.file_url && (
        <Image
          source={{ uri: `https://api.open5e.com${illustration.file_url}` }}
          accessibilityLabel={illustration.alt_text || (e.name as string)}
          className="mt-3 h-56 w-full rounded-md border border-panel-border"
          resizeMode="contain"
        />
      )}
      <Section title="Combat Stats">
        <Field
          label="Armor Class"
          value={`${e.armor_class}${e.armor_detail ? ` (${e.armor_detail})` : ""}`}
        />
        <Field label="Hit Points" value={`${e.hit_points} (${e.hit_dice})`} />
        <Field label="Speed" value={formatSpeed(e.speed_all)} />
      </Section>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {ABILITIES.map(({ key, label }) => (
          <View key={key} className="min-w-16 flex-1 items-center rounded-md border border-panel-border py-2">
            <Text className="text-xs text-muted">{label}</Text>
            <Text className="font-medium text-foreground">
              {abilityScores[key]} ({abilityMod(modifiers[key])})
            </Text>
          </View>
        ))}
      </View>
      <Section title="Proficiencies & Senses">
        {Object.keys(savingThrows).length > 0 && (
          <Field
            label="Saving Throws"
            value={Object.entries(savingThrows)
              .map(([k, v]) => `${k.slice(0, 3).toUpperCase()} ${abilityMod(v)}`)
              .join(", ")}
          />
        )}
        {Object.keys(skillBonuses).length > 0 && (
          <Field
            label="Skills"
            value={Object.entries(skillBonuses)
              .map(([k, v]) => `${k.replace(/_/g, " ")} ${abilityMod(v)}`)
              .join(", ")}
          />
        )}
        <Field label="Damage Vulnerabilities" value={ri.damage_vulnerabilities_display} />
        <Field label="Damage Resistances" value={ri.damage_resistances_display} />
        <Field label="Damage Immunities" value={ri.damage_immunities_display} />
        <Field label="Condition Immunities" value={ri.condition_immunities_display} />
        <Field label="Senses" value={formatSenses(e)} />
        <Field label="Languages" value={languages?.as_string} />
        <Field
          label="Challenge Rating"
          value={`${formatChallengeRating(e.challenge_rating)} (${e.experience_points ?? "?"} XP)`}
        />
      </Section>
      {Array.isArray(e.traits) && e.traits.length > 0 && (
        <Section title="Special Abilities">
          <NamedList items={e.traits as { name: string; desc: string }[]} />
        </Section>
      )}
      {Object.entries(groupLabels).map(([group, label]) =>
        actionGroups[group]?.length ? (
          <Section key={group} title={label}>
            <NamedList items={actionGroups[group]} />
          </Section>
        ) : null
      )}
    </>
  );
}

function ConditionDetail({ entry: e }: { entry: SrdEntry }) {
  const descriptions = (e.descriptions as { desc: string; document: string; gamesystem: string }[]) ?? [];
  const preferred = descriptions.filter((d) => ["srd-2014", "srd-2024"].includes(d.document));
  const shown = preferred.length > 0 ? preferred : descriptions;

  return (
    <>
      {shown.map((d, i) => (
        <Section key={i} title={d.document}>
          <Prose text={d.desc} />
        </Section>
      ))}
    </>
  );
}

function ClassDetail({ entry: e }: { entry: SrdEntry }) {
  const hitPoints = e.hit_points as
    | { hit_dice_name?: string; hit_points_at_1st_level?: string; hit_points_at_higher_levels?: string }
    | undefined;
  const features =
    (e.features as {
      name: string;
      desc: string;
      feature_type: string;
      gained_at: { level: number; detail: string | null }[];
    }[]) ?? [];

  return (
    <>
      <Text className="text-sm text-muted">
        {e.subclass_of ? `Subclass · ${refList([e.subclass_of])}` : "Class"}
      </Text>
      <Section title="Hit Points">
        <Field label="Hit Dice" value={hitPoints?.hit_dice_name} />
        <Field label="At 1st Level" value={hitPoints?.hit_points_at_1st_level} />
        <Field label="Per Level After" value={hitPoints?.hit_points_at_higher_levels} />
      </Section>
      <Section title="Proficiencies">
        <Field label="Saving Throws" value={refList(e.saving_throws)} />
        {!!e.caster_type && e.caster_type !== "NONE" && (
          <Field label="Spellcasting" value={String(e.caster_type)} />
        )}
      </Section>
      {features.length > 0 && (
        <Section title="Features">
          <View className="gap-3">
            {features.map((f, i) => {
              const levels = f.gained_at
                ?.map((g) => g.level)
                .sort((a, b) => a - b)
                .join(", ");
              return (
                <View key={i}>
                  <Text className="font-medium text-foreground">
                    {f.name}
                    {levels ? <Text className="text-xs text-muted">{"  "}Lv. {levels}</Text> : null}
                  </Text>
                  <Text className="text-foreground/80">{f.desc}</Text>
                </View>
              );
            })}
          </View>
        </Section>
      )}
    </>
  );
}

function SpeciesDetail({ entry: e }: { entry: SrdEntry }) {
  return (
    <>
      <Text className="text-sm text-muted">{e.is_subspecies ? "Subspecies" : "Species"}</Text>
      {!!e.desc && (
        <Section title="Description">
          <Prose text={e.desc as string} />
        </Section>
      )}
      {Array.isArray(e.traits) && e.traits.length > 0 && (
        <Section title="Traits">
          <NamedList items={e.traits as { name: string; desc: string }[]} />
        </Section>
      )}
    </>
  );
}

function FeatDetail({ entry: e }: { entry: SrdEntry }) {
  return (
    <>
      {!!e.prerequisite && <Field label="Prerequisite" value={e.prerequisite as string} />}
      <Section title="Description">
        <Prose text={e.desc as string} />
      </Section>
      {Array.isArray(e.benefits) && e.benefits.length > 0 && (
        <Section title="Benefits">
          <View className="gap-1">
            {(e.benefits as { desc: string }[]).map((b, i) => (
              <Text key={i} className="text-foreground/90">
                • {b.desc}
              </Text>
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

function BackgroundDetail({ entry: e }: { entry: SrdEntry }) {
  const benefits = (e.benefits as { name: string; desc: string; type: string }[]) ?? [];
  return (
    <>
      {!!e.desc && <Prose text={e.desc as string} />}
      {benefits.map((b, i) => (
        <Section key={i} title={b.name}>
          <Prose text={b.desc} />
        </Section>
      ))}
    </>
  );
}

function MagicItemDetail({ entry: e }: { entry: SrdEntry }) {
  const category = e.category as { name?: string } | undefined;
  const rarity = e.rarity as { name?: string } | undefined;
  return (
    <>
      <Text className="text-sm text-muted">
        {category?.name}
        {rarity?.name ? ` · ${rarity.name}` : ""}
      </Text>
      <Section title="Details">
        <Field
          label="Requires Attunement"
          value={e.requires_attunement ? (e.attunement_detail as string) || "Yes" : undefined}
        />
        <Field label="Weight" value={e.weight ? `${e.weight} ${e.weight_unit ?? "lb"}` : undefined} />
        <Field label="Cost" value={formatCost(e.cost)} />
      </Section>
      <Section title="Description">
        <Prose text={e.desc as string} />
      </Section>
    </>
  );
}

function ItemDetail({ entry: e }: { entry: SrdEntry }) {
  const category = e.category as { name?: string } | undefined;
  return (
    <>
      <Text className="text-sm text-muted">{category?.name}</Text>
      <Section title="Details">
        <Field label="Weight" value={e.weight ? `${e.weight} ${e.weight_unit ?? "lb"}` : undefined} />
        <Field label="Cost" value={formatCost(e.cost)} />
      </Section>
      {!!e.desc && (
        <Section title="Description">
          <Prose text={e.desc as string} />
        </Section>
      )}
    </>
  );
}

function WeaponDetail({ entry: e }: { entry: SrdEntry }) {
  const damageType = e.damage_type as { name?: string } | undefined;
  const properties =
    (e.properties as { property: { name: string; desc?: string }; detail: string | null }[]) ?? [];
  return (
    <>
      <Section title="Details">
        <Field label="Damage" value={e.damage_dice ? `${e.damage_dice} ${damageType?.name ?? ""}` : undefined} />
        <Field label="Cost" value={formatCost(e.cost)} />
        <Field label="Weight" value={e.weight ? `${e.weight} ${e.weight_unit ?? "lb"}` : undefined} />
      </Section>
      {properties.length > 0 && (
        <Section title="Properties">
          <View className="gap-2">
            {properties.map((p, i) => (
              <Text key={i} className="text-foreground/90">
                <Text className="font-medium text-foreground">{p.property.name}</Text>
                {p.detail ? ` (${p.detail})` : ""}
                {p.property.desc ? ` — ${p.property.desc}` : ""}
              </Text>
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

function ArmorDetail({ entry: e }: { entry: SrdEntry }) {
  return (
    <Section title="Details">
      <Field label="Category" value={e.category as string} />
      <Field label="Armor Class" value={e.ac_display as string} />
      <Field
        label="Strength Required"
        value={e.strength_score_required ? String(e.strength_score_required) : undefined}
      />
      <Field label="Stealth" value={e.grants_stealth_disadvantage ? "Disadvantage" : undefined} />
      <Field label="Cost" value={formatCost(e.cost)} />
      <Field label="Weight" value={e.weight ? `${e.weight} lb` : undefined} />
    </Section>
  );
}

/**
 * Renders a single SRD entry's details, picking the right field layout for its
 * category. Shared between the Rules browser and the Monsters section (which
 * shows official creatures alongside homebrew ones), so it deliberately renders
 * only content — the owning screen supplies its own scroll container/padding.
 */
export function SrdDetail({ category, entry }: { category: SrdCategory; entry: SrdEntry }) {
  return (
    <>
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-xl font-semibold text-accent">{entry.name}</Text>
        <SourceBadge entry={entry} />
      </View>
      {renderDetails(category, entry)}
    </>
  );
}

function renderDetails(category: SrdCategory, entry: SrdEntry) {
  switch (category) {
    case "spells":
      return <SpellDetail entry={entry} />;
    case "creatures":
      return <CreatureDetail entry={entry} />;
    case "conditions":
      return <ConditionDetail entry={entry} />;
    case "classes":
      return <ClassDetail entry={entry} />;
    case "species":
      return <SpeciesDetail entry={entry} />;
    case "feats":
      return <FeatDetail entry={entry} />;
    case "backgrounds":
      return <BackgroundDetail entry={entry} />;
    case "magicitems":
      return <MagicItemDetail entry={entry} />;
    case "items":
      return <ItemDetail entry={entry} />;
    case "weapons":
      return <WeaponDetail entry={entry} />;
    case "armor":
      return <ArmorDetail entry={entry} />;
    default:
      return <Fragment />;
  }
}
