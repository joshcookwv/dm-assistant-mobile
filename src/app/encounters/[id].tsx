import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as Crypto from "expo-crypto";

import { CombatantCard } from "@/components/combatant-card";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  deleteEncounter,
  getEncounter,
  updateEncounter,
  type Combatant,
  type Encounter,
} from "@/lib/encounters";
import { listBestiary } from "@/lib/bestiary";
import { listSrdEntries } from "@/lib/srd";

type MonsterResult =
  | { source: "srd"; key: string; name: string; hitPoints: number; armorClass: number | null }
  | { source: "bestiary"; key: string; name: string; hitPoints: number; armorClass: number | null };

function resortAndTrackActive(
  combatants: Combatant[],
  activeIndex: number
): { combatants: Combatant[]; activeIndex: number } {
  const activeCombatant = combatants[activeIndex];
  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
  const newActiveIndex = activeCombatant ? sorted.findIndex((c) => c.id === activeCombatant.id) : 0;
  return { combatants: sorted, activeIndex: newActiveIndex === -1 ? 0 : newActiveIndex };
}

export default function EncounterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dirtyRef = useRef(false);

  const [newName, setNewName] = useState("");
  const [newInitiative, setNewInitiative] = useState("");
  const [newHp, setNewHp] = useState("");
  const [newAc, setNewAc] = useState("");
  const [newIsPc, setNewIsPc] = useState(false);

  const [monsterQuery, setMonsterQuery] = useState("");
  const debouncedMonsterQuery = useDebouncedValue(monsterQuery);
  const [monsterResults, setMonsterResults] = useState<MonsterResult[]>([]);
  const monsterRequestId = useRef(0);

  useEffect(() => {
    const found = getEncounter(Number(id));
    if (!found) {
      Alert.alert("Not found", "This encounter no longer exists.");
      router.back();
      return;
    }
    setEncounter(found);
    navigation.setOptions({ title: found.name });
  }, [id, navigation]);

  useEffect(() => {
    if (!debouncedMonsterQuery.trim()) {
      setMonsterResults([]);
      return;
    }
    const thisRequest = ++monsterRequestId.current;
    // No source filter here (unlike the Rules browser) — a DM searching for a
    // combatant mid-prep likely wants every source, including third-party.
    Promise.all([
      Promise.resolve(listBestiary(debouncedMonsterQuery)),
      listSrdEntries("creatures", debouncedMonsterQuery),
    ]).then(([bestiary, srd]) => {
      if (monsterRequestId.current !== thisRequest) return; // superseded by a newer search
      const bestiaryResults: MonsterResult[] = bestiary.slice(0, 5).map((m) => ({
        source: "bestiary",
        key: `bestiary-${m.id}`,
        name: m.name,
        hitPoints: m.hit_points ?? 0,
        armorClass: m.armor_class,
      }));
      const srdResults: MonsterResult[] = srd.slice(0, 8).map((m) => ({
        source: "srd",
        key: m.key,
        name: m.name,
        hitPoints: (m.hit_points as number) ?? 0,
        armorClass: typeof m.armor_class === "number" ? (m.armor_class as number) : null,
      }));
      setMonsterResults([...bestiaryResults, ...srdResults]);
    });
  }, [debouncedMonsterQuery]);

  useEffect(() => {
    if (!encounter || !dirtyRef.current) return;
    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      updateEncounter(encounter.id, {
        name: encounter.name,
        round: encounter.round,
        active_index: encounter.active_index,
        combatants: encounter.combatants,
      });
      dirtyRef.current = false;
      setSaveStatus("saved");
    }, 500);
    return () => clearTimeout(timeout);
  }, [encounter]);

  function mutate(updater: (e: Encounter) => Encounter) {
    setEncounter((prev) => (prev ? updater(prev) : prev));
    dirtyRef.current = true;
  }

  function handleRename(name: string) {
    mutate((e) => ({ ...e, name }));
    navigation.setOptions({ title: name });
  }

  function addCombatant(combatant: Combatant) {
    mutate((e) => {
      const { combatants, activeIndex } = resortAndTrackActive([...e.combatants, combatant], e.active_index);
      return { ...e, combatants, active_index: activeIndex };
    });
  }

  function handleAddCustom() {
    if (!newName.trim()) return;
    const maxHp = Number(newHp) || 0;
    addCombatant({
      id: Crypto.randomUUID(),
      name: newName.trim(),
      initiative: Number(newInitiative) || 0,
      maxHp,
      currentHp: maxHp,
      ac: newAc ? Number(newAc) || 0 : null,
      conditions: "",
      isPc: newIsPc,
    });
    setNewName("");
    setNewInitiative("");
    setNewHp("");
    setNewAc("");
    setNewIsPc(false);
  }

  function handleAddMonster(monster: MonsterResult) {
    addCombatant({
      id: Crypto.randomUUID(),
      name: monster.name,
      initiative: 0,
      maxHp: monster.hitPoints,
      currentHp: monster.hitPoints,
      ac: monster.armorClass,
      conditions: "",
      isPc: false,
    });
    setMonsterQuery("");
  }

  function updateCombatant(cid: string, patch: Partial<Combatant>) {
    mutate((e) => {
      const updated = e.combatants.map((c) => (c.id === cid ? { ...c, ...patch } : c));
      if (patch.initiative !== undefined) {
        const { combatants, activeIndex } = resortAndTrackActive(updated, e.active_index);
        return { ...e, combatants, active_index: activeIndex };
      }
      return { ...e, combatants: updated };
    });
  }

  function removeCombatant(cid: string) {
    mutate((e) => {
      const removedIndex = e.combatants.findIndex((c) => c.id === cid);
      const remaining = e.combatants.filter((c) => c.id !== cid);
      let activeIndex = e.active_index;
      if (removedIndex !== -1 && removedIndex < activeIndex) activeIndex -= 1;
      if (activeIndex >= remaining.length) activeIndex = 0;
      return { ...e, combatants: remaining, active_index: Math.max(0, activeIndex) };
    });
  }

  function nextTurn() {
    mutate((e) => {
      if (e.combatants.length === 0) return e;
      const nextIndex = e.active_index + 1;
      if (nextIndex >= e.combatants.length) return { ...e, active_index: 0, round: e.round + 1 };
      return { ...e, active_index: nextIndex };
    });
  }

  function prevTurn() {
    mutate((e) => {
      if (e.combatants.length === 0) return e;
      const prevIndex = e.active_index - 1;
      if (prevIndex < 0) {
        return { ...e, active_index: e.combatants.length - 1, round: Math.max(1, e.round - 1) };
      }
      return { ...e, active_index: prevIndex };
    });
  }

  function handleDelete() {
    deleteEncounter(Number(id));
    router.back();
  }

  if (!encounter) return null;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-4 p-4">
        <TextInput
          value={encounter.name}
          onChangeText={handleRename}
          className="rounded-md border border-panel-border bg-background px-3 py-2 text-lg font-medium text-foreground"
        />

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={prevTurn}
            className="rounded-md border border-panel-border px-3 py-2 active:bg-white/5"
          >
            <Text className="text-sm text-foreground">← Prev</Text>
          </Pressable>
          <Text className="rounded-md bg-panel px-3 py-2 text-sm text-foreground">
            Round <Text className="font-semibold text-accent">{encounter.round}</Text>
          </Text>
          <Pressable onPress={nextTurn} className="rounded-md bg-accent px-3 py-2 active:opacity-80">
            <Text className="text-sm font-medium text-accent-foreground">Next Turn →</Text>
          </Pressable>
          <Text className="ml-auto text-xs text-muted">
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "All changes saved" : ""}
          </Text>
        </View>

        <View className="gap-2">
          {encounter.combatants.length === 0 && (
            <Text className="p-3 text-center text-sm text-muted">No combatants yet — add one below.</Text>
          )}
          {encounter.combatants.map((c, i) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={i === encounter.active_index}
              onUpdate={(patch) => updateCombatant(c.id, patch)}
              onRemove={() => removeCombatant(c.id)}
            />
          ))}
        </View>

        <View className="rounded-md border border-panel-border bg-panel p-4">
          <Text className="text-sm font-semibold text-accent">Add Combatant</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <View>
              <Text className="text-xs text-muted">Name</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                className="mt-1 w-28 rounded border border-panel-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </View>
            <View>
              <Text className="text-xs text-muted">Init</Text>
              <TextInput
                value={newInitiative}
                onChangeText={setNewInitiative}
                keyboardType="numbers-and-punctuation"
                className="mt-1 w-14 rounded border border-panel-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </View>
            <View>
              <Text className="text-xs text-muted">HP</Text>
              <TextInput
                value={newHp}
                onChangeText={setNewHp}
                keyboardType="numbers-and-punctuation"
                className="mt-1 w-14 rounded border border-panel-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </View>
            <View>
              <Text className="text-xs text-muted">AC</Text>
              <TextInput
                value={newAc}
                onChangeText={setNewAc}
                keyboardType="numbers-and-punctuation"
                className="mt-1 w-14 rounded border border-panel-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-muted">PC</Text>
              <Switch value={newIsPc} onValueChange={setNewIsPc} />
            </View>
          </View>
          <Pressable
            onPress={handleAddCustom}
            disabled={!newName.trim()}
            className="mt-2 items-center self-start rounded-md bg-accent px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-sm font-medium text-accent-foreground">Add</Text>
          </Pressable>
        </View>

        <View className="rounded-md border border-panel-border bg-panel p-4">
          <Text className="text-sm font-semibold text-accent">Add Monster</Text>
          <TextInput
            value={monsterQuery}
            onChangeText={setMonsterQuery}
            placeholder="Search SRD & your bestiary…"
            placeholderTextColor="#a89a80"
            className="mt-2 rounded border border-panel-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
          {monsterResults.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => handleAddMonster(m)}
              className="mt-1 flex-row items-center justify-between rounded border border-panel-border px-2 py-1.5 active:bg-white/5"
            >
              <Text className="text-sm text-foreground">
                {m.name}
                {m.source === "bestiary" && <Text className="text-xs text-accent"> (Homebrew)</Text>}
              </Text>
              <Text className="text-xs text-muted">
                HP {m.hitPoints} · AC {m.armorClass ?? "?"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row gap-2 border-t border-panel-border pt-3">
          {!confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
          {confirmingDelete && (
            <DeleteConfirmBar
              label="Delete this encounter?"
              onConfirm={handleDelete}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
