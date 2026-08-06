import { Pressable, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
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
  const hpPercent = combatant.maxHp > 0 ? Math.min(100, Math.max(0, (combatant.currentHp / combatant.maxHp) * 100)) : 0;
  const hpColor = isDown ? Colors.danger : isBloodied ? "#fbbf24" : Colors.success;
  const hpStatus = isDown ? "Down" : isBloodied ? "Bloodied" : "Healthy";

  return (
    <View
      className={`overflow-hidden rounded-2xl border ${isActive ? "border-accent bg-accent-soft" : "border-panel-border bg-panel"} ${isDown ? "opacity-70" : ""}`}
    >
      {isActive ? <View className="h-1 w-full bg-accent" /> : null}
      <View className="p-3.5">
        <View className="flex-row items-center gap-2">
          {isActive ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-accent px-2.5 py-1">
              <AppIcon name="quick" size={12} color={Colors.accentForeground} />
              <Text className="text-[10px] font-black uppercase tracking-wider text-accent-foreground">Active</Text>
            </View>
          ) : null}
          <View className={`rounded-full px-2.5 py-1 ${combatant.isPc ? "bg-sky-500/15" : "bg-panel-raised"}`}>
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${combatant.isPc ? "text-sky-300" : "text-muted"}`}>
              {combatant.isPc ? "Player" : "Enemy"}
            </Text>
          </View>
          <View className="flex-1" />
          <View className="flex-row items-center gap-1.5 rounded-xl border border-panel-border bg-background px-2 py-1">
            <Text className="text-[10px] font-bold uppercase text-muted">Init</Text>
            <TextInput
              value={String(combatant.initiative)}
              onChangeText={(value) => onUpdate({ initiative: Number(value) || 0 })}
              keyboardType="numbers-and-punctuation"
              selectTextOnFocus
              className="min-w-8 py-0 text-center text-sm font-bold text-foreground"
            />
          </View>
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${combatant.name}`}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-xl active:bg-red-500/10"
          >
            <AppIcon name="trash" size={16} color={Colors.muted} />
          </Pressable>
        </View>

        <TextInput
          value={combatant.name}
          onChangeText={(name) => onUpdate({ name })}
          placeholder="Combatant name"
          placeholderTextColor={Colors.muted}
          className={`mt-2 py-1 text-lg font-bold ${combatant.isPc ? "text-sky-200" : "text-foreground"}`}
        />

        <View className="mt-2 flex-row gap-2">
          <View className="flex-1 rounded-2xl border border-panel-border bg-background p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-muted">Hit points</Text>
              <Text style={{ color: hpColor }} className="text-[10px] font-bold uppercase">
                {hpStatus}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-center gap-1.5">
              <Pressable
                onPress={() => onUpdate({ currentHp: Math.max(0, combatant.currentHp - 1) })}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${combatant.name} hit points`}
                className="h-9 w-9 items-center justify-center rounded-xl border border-panel-border bg-panel-raised active:bg-white/10"
              >
                <Text className="text-xl font-medium text-foreground">-</Text>
              </Pressable>
              <TextInput
                value={String(combatant.currentHp)}
                onChangeText={(value) => onUpdate({ currentHp: Number(value) || 0 })}
                keyboardType="numbers-and-punctuation"
                selectTextOnFocus
                style={{ color: hpColor }}
                className="w-12 rounded-xl border border-panel-border bg-panel-raised px-1 py-2 text-center text-base font-black"
              />
              <Text className="text-xs text-muted">/</Text>
              <TextInput
                value={String(combatant.maxHp)}
                onChangeText={(value) => onUpdate({ maxHp: Number(value) || 0 })}
                keyboardType="numbers-and-punctuation"
                selectTextOnFocus
                className="w-12 rounded-xl border border-panel-border bg-panel-raised px-1 py-2 text-center text-base font-bold text-foreground"
              />
              <Pressable
                onPress={() => onUpdate({ currentHp: combatant.currentHp + 1 })}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${combatant.name} hit points`}
                className="h-9 w-9 items-center justify-center rounded-xl border border-panel-border bg-panel-raised active:bg-white/10"
              >
                <Text className="text-xl font-medium text-foreground">+</Text>
              </Pressable>
            </View>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-raised">
              <View style={{ width: `${hpPercent}%`, backgroundColor: hpColor }} className="h-full rounded-full" />
            </View>
          </View>

          <View className="w-20 items-center justify-center rounded-2xl border border-panel-border bg-background p-2">
            <AppIcon name="armor" size={18} color={Colors.muted} />
            <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">AC</Text>
            <TextInput
              value={combatant.ac === null ? "" : String(combatant.ac)}
              onChangeText={(value) => onUpdate({ ac: value ? Number(value) || 0 : null })}
              keyboardType="numbers-and-punctuation"
              selectTextOnFocus
              placeholder="--"
              placeholderTextColor={Colors.muted}
              className="mt-1 w-full py-0 text-center text-xl font-black text-foreground"
            />
          </View>
        </View>

        <View className="mt-2 flex-row items-center gap-2 rounded-xl border border-panel-border bg-background px-3 py-2.5">
          <AppIcon name="tag" size={15} color={Colors.muted} />
          <TextInput
            value={combatant.conditions}
            onChangeText={(conditions) => onUpdate({ conditions })}
            placeholder="No conditions"
            placeholderTextColor={Colors.muted}
            className="flex-1 py-0 text-sm text-foreground"
          />
        </View>
      </View>
    </View>
  );
}
