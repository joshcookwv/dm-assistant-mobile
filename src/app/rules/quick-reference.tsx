import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

interface ReferenceEntry {
  name: string;
  desc: string;
}

interface ReferenceSection {
  title: string;
  icon: string;
  /** Sections a DM reaches for constantly start open; the rest stay collapsed. */
  defaultOpen?: boolean;
  intro?: string;
  entries: ReferenceEntry[];
}

const SECTIONS: ReferenceSection[] = [
  {
    title: "On Your Turn",
    icon: "🎯",
    defaultOpen: true,
    intro: "You can move and take one action. Order is up to you, and movement can be split around it.",
    entries: [
      { name: "Move", desc: "Up to your speed. You can break it up before and after your action." },
      { name: "Action", desc: "One per turn — see Actions in Combat." },
      { name: "Bonus Action", desc: "Only when a feature, spell, or item specifically grants one." },
      { name: "Free object interaction", desc: "One per turn: draw or sheathe a weapon, open a door, pick up an item." },
      { name: "Communicate", desc: "Brief speech and gestures are free." },
    ],
  },
  {
    title: "Actions in Combat",
    icon: "⚔️",
    defaultOpen: true,
    entries: [
      { name: "Attack", desc: "One melee or ranged attack — more if you have Extra Attack." },
      { name: "Cast a Spell", desc: "A spell with a casting time of 1 action." },
      { name: "Dash", desc: "Gain extra movement equal to your speed for this turn." },
      { name: "Disengage", desc: "Your movement doesn't provoke opportunity attacks for the rest of the turn." },
      { name: "Dodge", desc: "Attacks against you have disadvantage; you make Dex saves with advantage. Ends if you're incapacitated or your speed drops to 0." },
      { name: "Help", desc: "Give an ally advantage on their next ability check, or on their next attack against a creature within 5 feet of you." },
      { name: "Hide", desc: "Make a Dexterity (Stealth) check." },
      { name: "Ready", desc: "Pick a trigger and a response. The response uses your reaction." },
      { name: "Search", desc: "Make a Wisdom (Perception) or Intelligence (Investigation) check." },
      { name: "Use an Object", desc: "Interact with a second object, or use one that requires an action." },
      { name: "Grapple", desc: "Special melee attack: your Athletics vs. the target's Athletics or Acrobatics." },
      { name: "Shove", desc: "Special melee attack: knock the target prone or push it 5 feet." },
    ],
  },
  {
    title: "Reactions",
    icon: "↩️",
    entries: [
      { name: "One per round", desc: "You regain your reaction at the start of your turn." },
      { name: "Opportunity Attack", desc: "When a hostile creature you can see moves out of your reach, you can use your reaction to make one melee attack against it." },
      { name: "Readied action", desc: "Triggers when the condition you set is met." },
    ],
  },
  {
    title: "Death Saving Throws",
    icon: "💀",
    intro: "At 0 hit points you fall unconscious and are dying. At the start of each of your turns, roll a d20 with no modifiers.",
    entries: [
      { name: "10 or higher", desc: "Success." },
      { name: "9 or lower", desc: "Failure." },
      { name: "3 successes", desc: "You become stable — still at 0 HP and unconscious, but no longer dying." },
      { name: "3 failures", desc: "You die." },
      { name: "Natural 20", desc: "You regain 1 hit point immediately." },
      { name: "Natural 1", desc: "Counts as two failures." },
      { name: "Taking damage at 0 HP", desc: "One failure — two if it was a critical hit." },
      { name: "Massive damage", desc: "Damage equal to or greater than your hit point maximum kills you outright." },
      { name: "Recovering", desc: "Successes and failures reset when you regain any hit points or become stable. A stable creature regains 1 HP after 1d4 hours." },
    ],
  },
  {
    title: "Conditions",
    icon: "💫",
    entries: [
      { name: "Blinded", desc: "Can't see and auto-fails checks requiring sight. Attacks against it have advantage; its attacks have disadvantage." },
      { name: "Charmed", desc: "Can't attack the charmer or target it with harmful effects. The charmer has advantage on social checks with it." },
      { name: "Deafened", desc: "Can't hear and auto-fails checks requiring hearing." },
      { name: "Exhaustion", desc: "1: disadvantage on ability checks. 2: speed halved. 3: disadvantage on attacks and saves. 4: HP maximum halved. 5: speed 0. 6: death." },
      { name: "Frightened", desc: "Disadvantage on checks and attacks while the source is in line of sight. Can't willingly move closer to it." },
      { name: "Grappled", desc: "Speed becomes 0. Ends if the grappler is incapacitated or the two are moved apart." },
      { name: "Incapacitated", desc: "Can't take actions or reactions." },
      { name: "Invisible", desc: "Can't be seen without special senses. Attacks against it have disadvantage; its attacks have advantage." },
      { name: "Paralyzed", desc: "Incapacitated, can't move or speak. Auto-fails Str and Dex saves. Attacks have advantage, and any hit within 5 feet is a critical hit." },
      { name: "Petrified", desc: "Turned to stone, incapacitated and unaware. Auto-fails Str and Dex saves. Resistance to all damage; immune to poison and disease." },
      { name: "Poisoned", desc: "Disadvantage on attack rolls and ability checks." },
      { name: "Prone", desc: "Can only crawl. Disadvantage on attacks. Attacks within 5 feet have advantage; attacks from farther away have disadvantage." },
      { name: "Restrained", desc: "Speed 0. Attacks against it have advantage; its attacks have disadvantage. Disadvantage on Dex saves." },
      { name: "Stunned", desc: "Incapacitated, can't move, speaks falteringly. Auto-fails Str and Dex saves. Attacks against it have advantage." },
      { name: "Unconscious", desc: "Incapacitated, unaware, drops what it's holding and falls prone. Auto-fails Str and Dex saves. Attacks have advantage, and any hit within 5 feet is a critical hit." },
    ],
  },
  {
    title: "Cover",
    icon: "🛡️",
    entries: [
      { name: "Half cover", desc: "+2 bonus to AC and Dexterity saving throws." },
      { name: "Three-quarters cover", desc: "+5 bonus to AC and Dexterity saving throws." },
      { name: "Total cover", desc: "Can't be targeted directly by an attack or spell." },
    ],
  },
  {
    title: "Advantage & Disadvantage",
    icon: "🎲",
    entries: [
      { name: "How it works", desc: "Roll two d20s and take the higher (advantage) or lower (disadvantage) result." },
      { name: "No stacking", desc: "Multiple sources of advantage or disadvantage don't add up." },
      { name: "They cancel", desc: "If you have both, you roll a single d20 as normal — regardless of how many of each." },
    ],
  },
  {
    title: "Resting",
    icon: "🔥",
    entries: [
      { name: "Short rest", desc: "At least 1 hour. Spend Hit Dice to regain HP — roll each die and add your Constitution modifier." },
      { name: "Long rest", desc: "At least 8 hours. Regain all hit points and half your total Hit Dice (minimum 1). Only one long rest per 24 hours." },
    ],
  },
];

function ReferenceCard({ section }: { section: ReferenceSection }) {
  const [open, setOpen] = useState(Boolean(section.defaultOpen));

  return (
    <View className="overflow-hidden rounded-md border border-panel-border bg-panel">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-3 p-4 active:bg-white/5"
      >
        <Text className="text-xl">{section.icon}</Text>
        <Text className="flex-1 font-semibold text-foreground">{section.title}</Text>
        <Text className="text-muted">{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open && (
        <View className="gap-3 border-t border-panel-border/60 p-4">
          {!!section.intro && (
            <Text className="text-sm italic leading-relaxed text-muted">{section.intro}</Text>
          )}
          {section.entries.map((entry) => (
            <View key={entry.name}>
              <Text className="text-sm font-medium text-accent">{entry.name}</Text>
              <Text className="mt-0.5 text-sm leading-relaxed text-foreground/90">{entry.desc}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function QuickReferenceScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4">
      <Text className="text-sm text-muted">
        The rules you look up mid-combat, condensed. Tap a section to expand it.
      </Text>

      {SECTIONS.map((section) => (
        <ReferenceCard key={section.title} section={section} />
      ))}

      <Pressable
        onPress={() => router.push("/rules/conditions")}
        className="mt-1 items-center rounded-md border border-panel-border px-4 py-3 active:bg-white/5"
      >
        <Text className="text-sm text-accent">Full condition text in Rules →</Text>
      </Pressable>

      <Text className="mt-2 text-center text-xs text-muted">
        Summarized from the D&amp;D 5e SRD. Check the full rules for edge cases.
      </Text>
    </ScrollView>
  );
}
