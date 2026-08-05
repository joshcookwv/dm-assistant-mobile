import { Pressable, Text, TextInput, View } from "react-native";

import type { Combatant } from "@/lib/encounters";

export function CombatantCard({
  combatant,
  isActive,
  onUpdate,
  onRemove,
}: {
  combatant: Combatant;
  isActive: boolean;
  onUpdate: (patch: Partial<Combatant>) => void;
  onRemove: () => void;
}) {
  const isBloodied = combatant.maxHp > 0 && combatant.currentHp <= combatant.maxHp / 2 && combatant.currentHp > 0;
  const isDown = combatant.currentHp <= 0;
  const hpColor = isDown ? "text-red-400" : isBloodied ? "text-amber-400" : "text-foreground";

  return (
    <View
      className={`rounded-md border p-3 ${isActive ? "border-accent bg-accent/15" : "border-panel-border bg-panel"} ${isDown ? "opacity-60" : ""}`}
    >
      <View className="flex-row items-center gap-2">
        {isActive && <Text className="text-accent">▶</Text>}
        <TextInput
          value={combatant.name}
          onChangeText={(name) => onUpdate({ name })}
          className={`flex-1 text-base font-medium ${combatant.isPc ? "text-sky-300" : "text-foreground"}`}
        />
        <Pressable onPress={onRemove} hitSlop={8} className="px-1">
          <Text className="text-muted">✕</Text>
        </Pressable>
      </View>

      <View className="mt-2 flex-row flex-wrap items-center gap-4">
        <View className="items-center">
          <Text className="text-[10px] uppercase text-muted">Init</Text>
          <TextInput
            value={String(combatant.initiative)}
            onChangeText={(v) => onUpdate({ initiative: Number(v) || 0 })}
            keyboardType="numbers-and-punctuation"
            className="mt-0.5 w-12 rounded border border-panel-border bg-background px-1.5 py-1 text-center text-foreground"
          />
        </View>

        <View className="items-center">
          <Text className="text-[10px] uppercase text-muted">HP</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Pressable
              onPress={() => onUpdate({ currentHp: Math.max(0, combatant.currentHp - 1) })}
              hitSlop={6}
              className="h-7 w-7 items-center justify-center rounded border border-panel-border active:bg-white/10"
            >
              <Text className="text-foreground">−</Text>
            </Pressable>
            <TextInput
              value={String(combatant.currentHp)}
              onChangeText={(v) => onUpdate({ currentHp: Number(v) || 0 })}
              keyboardType="numbers-and-punctuation"
              className={`w-12 rounded border border-panel-border bg-background px-1 py-1 text-center ${hpColor}`}
            />
            <Pressable
              onPress={() => onUpdate({ currentHp: combatant.currentHp + 1 })}
              hitSlop={6}
              className="h-7 w-7 items-center justify-center rounded border border-panel-border active:bg-white/10"
            >
              <Text className="text-foreground">+</Text>
            </Pressable>
            <Text className="text-muted">/</Text>
            <TextInput
              value={String(combatant.maxHp)}
              onChangeText={(v) => onUpdate({ maxHp: Number(v) || 0 })}
              keyboardType="numbers-and-punctuation"
              className="w-12 rounded border border-panel-border bg-background px-1 py-1 text-center text-foreground"
            />
          </View>
        </View>

        <View className="items-center">
          <Text className="text-[10px] uppercase text-muted">AC</Text>
          <TextInput
            value={combatant.ac === null ? "" : String(combatant.ac)}
            onChangeText={(v) => onUpdate({ ac: v ? Number(v) || 0 : null })}
            keyboardType="numbers-and-punctuation"
            className="mt-0.5 w-12 rounded border border-panel-border bg-background px-1.5 py-1 text-center text-foreground"
          />
        </View>

        <View className="min-w-24 flex-1">
          <Text className="text-[10px] uppercase text-muted">Conditions</Text>
          <TextInput
            value={combatant.conditions}
            onChangeText={(conditions) => onUpdate({ conditions })}
            placeholder="—"
            placeholderTextColor="#a89a80"
            className="mt-0.5 rounded border border-panel-border bg-background px-1.5 py-1 text-foreground"
          />
        </View>
      </View>
    </View>
  );
}
