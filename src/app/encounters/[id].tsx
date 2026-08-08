import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as Crypto from "expo-crypto";

import { AppIcon } from "@/components/app-icon";
import { CombatantCard } from "@/components/combatant-card";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { MonsterPickerModal } from "@/components/monster-picker-modal";
import { PrimaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import { getCampaign, getCampaignLocation, listCampaignPcs, type CampaignPc } from "@/lib/campaigns";
import { deleteEncounter, getEncounter, updateEncounter, type Combatant, type Encounter } from "@/lib/encounters";
import type { MonsterListItem } from "@/lib/monsters";

function resortAndTrackActive(combatants: Combatant[], activeIndex: number): { combatants: Combatant[]; activeIndex: number } {
  const activeCombatant = combatants[activeIndex];
  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
  const newActiveIndex = activeCombatant ? sorted.findIndex((combatant) => combatant.id === activeCombatant.id) : 0;
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
  const [customAddOpen, setCustomAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pcPickerOpen, setPcPickerOpen] = useState(false);
  const [campaignPcs, setCampaignPcs] = useState<CampaignPc[]>([]);
  const [linkLabel, setLinkLabel] = useState<string | null>(null);

  useEffect(() => {
    const found = getEncounter(Number(id));
    if (!found) {
      Alert.alert("Not found", "This encounter no longer exists.");
      router.back();
      return;
    }
    setEncounter(found);
    navigation.setOptions({ title: found.name });
    if (found.campaign_id) {
      setCampaignPcs(listCampaignPcs(found.campaign_id));
      const campaign = getCampaign(found.campaign_id);
      const location = found.location_id ? getCampaignLocation(found.location_id) : undefined;
      setLinkLabel([campaign?.name, location?.name].filter(Boolean).join(" — "));
    }
  }, [id, navigation]);

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

  function mutate(updater: (current: Encounter) => Encounter) {
    setEncounter((previous) => (previous ? updater(previous) : previous));
    dirtyRef.current = true;
  }

  function handleRename(name: string) {
    mutate((current) => ({ ...current, name }));
    navigation.setOptions({ title: name });
  }

  function addCombatant(combatant: Combatant) {
    mutate((current) => {
      const { combatants, activeIndex } = resortAndTrackActive([...current.combatants, combatant], current.active_index);
      return { ...current, combatants, active_index: activeIndex };
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
    setCustomAddOpen(false);
  }

  function handleAddMonster(monster: MonsterListItem) {
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
  }

  function handleAddPc(pc: CampaignPc) {
    addCombatant({
      id: Crypto.randomUUID(),
      name: pc.name,
      initiative: 0,
      maxHp: pc.maxHp,
      currentHp: pc.maxHp,
      ac: pc.ac,
      conditions: "",
      isPc: true,
    });
  }

  function updateCombatant(combatantId: string, patch: Partial<Combatant>) {
    mutate((current) => {
      const updated = current.combatants.map((combatant) => (combatant.id === combatantId ? { ...combatant, ...patch } : combatant));
      if (patch.initiative !== undefined) {
        const { combatants, activeIndex } = resortAndTrackActive(updated, current.active_index);
        return { ...current, combatants, active_index: activeIndex };
      }
      return { ...current, combatants: updated };
    });
  }

  function removeCombatant(combatantId: string) {
    mutate((current) => {
      const removedIndex = current.combatants.findIndex((combatant) => combatant.id === combatantId);
      const remaining = current.combatants.filter((combatant) => combatant.id !== combatantId);
      let activeIndex = current.active_index;
      if (removedIndex !== -1 && removedIndex < activeIndex) activeIndex -= 1;
      if (activeIndex >= remaining.length) activeIndex = 0;
      return { ...current, combatants: remaining, active_index: Math.max(0, activeIndex) };
    });
  }

  function nextTurn() {
    mutate((current) => {
      if (current.combatants.length === 0) return current;
      const nextIndex = current.active_index + 1;
      if (nextIndex >= current.combatants.length) return { ...current, active_index: 0, round: current.round + 1 };
      return { ...current, active_index: nextIndex };
    });
  }

  function prevTurn() {
    mutate((current) => {
      if (current.combatants.length === 0) return current;
      const previousIndex = current.active_index - 1;
      if (previousIndex < 0) return { ...current, active_index: current.combatants.length - 1, round: Math.max(1, current.round - 1) };
      return { ...current, active_index: previousIndex };
    });
  }

  function handleDelete() {
    deleteEncounter(Number(id));
    router.back();
  }

  if (!encounter) return null;

  const hasCombatants = encounter.combatants.length > 0;
  const activeCombatant = hasCombatants ? encounter.combatants[encounter.active_index] : null;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <View className="overflow-hidden rounded-3xl border border-panel-border bg-panel">
          <View className="border-b border-panel-border bg-panel-raised p-4">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
                <AppIcon name="encounters" size={18} color={Colors.accentBright} />
              </View>
              <Text className="text-xs font-black uppercase tracking-[2px] text-accent-bright">Encounter runner</Text>
              <View className="flex-1" />
              <View className="flex-row items-center gap-1.5 rounded-full border border-panel-border bg-background px-2.5 py-1.5">
                {saveStatus === "saving" ? <ActivityIndicator size={11} color={Colors.accentBright} /> : <AppIcon name="check" size={12} color={saveStatus === "saved" ? Colors.success : Colors.muted} />}
                <Text className="text-[10px] font-semibold text-muted">{saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : "Autosave"}</Text>
              </View>
            </View>
            <Text className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">Encounter name</Text>
            <TextInput value={encounter.name} onChangeText={handleRename} className="mt-1 py-0 text-xl font-black text-foreground" />
            {linkLabel ? (
              <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-accent-soft px-2.5 py-1">
                <AppIcon name="maps" size={11} color={Colors.accentBright} />
                <Text className="text-[10px] font-bold text-accent-bright">{linkLabel}</Text>
              </View>
            ) : null}
          </View>

          <View className="p-4">
            <View className="flex-row items-stretch gap-3">
              <View className="w-24 items-center justify-center rounded-2xl bg-accent-soft px-3 py-3">
                <Text className="text-[10px] font-black uppercase tracking-wider text-accent-bright">Round</Text>
                <Text className="mt-0.5 text-3xl font-black text-foreground">{encounter.round}</Text>
              </View>
              <View className="flex-1 justify-center rounded-2xl border border-panel-border bg-background px-4 py-3">
                <Text className="text-[10px] font-black uppercase tracking-wider text-muted">
                  {hasCombatants ? `Turn ${encounter.active_index + 1} of ${encounter.combatants.length}` : "Initiative"}
                </Text>
                <Text className="mt-1 text-base font-bold text-foreground" numberOfLines={1}>
                  {activeCombatant?.name ?? "No combatants yet"}
                </Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {activeCombatant ? `Initiative ${activeCombatant.initiative}` : "Add combatants below to begin."}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={prevTurn}
                disabled={!hasCombatants}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-panel-border bg-panel-raised px-3 active:bg-white/5 disabled:opacity-35"
              >
                <AppIcon name="chevronLeft" size={17} color={Colors.foreground} />
                <Text className="text-sm font-semibold text-foreground">Previous</Text>
              </Pressable>
              <Pressable
                onPress={nextTurn}
                disabled={!hasCombatants}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-accent px-3 active:bg-accent-bright disabled:opacity-35"
              >
                <Text className="text-sm font-black text-accent-foreground">Next turn</Text>
                <AppIcon name="chevronRight" size={17} color={Colors.accentForeground} />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="flex-row items-end justify-between px-1">
          <View>
            <Text className="text-lg font-black text-foreground">Initiative order</Text>
            <Text className="mt-0.5 text-xs text-muted">Updates automatically when initiative changes.</Text>
          </View>
          <View className="rounded-full bg-panel-raised px-3 py-1.5">
            <Text className="text-xs font-bold text-muted">{encounter.combatants.length} total</Text>
          </View>
        </View>

        <View className="gap-3">
          {!hasCombatants ? (
            <View className="items-center rounded-3xl border border-dashed border-panel-border bg-panel px-6 py-10">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
                <AppIcon name="encounters" size={27} color={Colors.accentBright} />
              </View>
              <Text className="mt-4 text-base font-bold text-foreground">Build the initiative order</Text>
              <Text className="mt-1 max-w-72 text-center text-sm leading-5 text-muted">Add a monster, a PC from your campaign roster, or create a custom combatant.</Text>
            </View>
          ) : null}
          {encounter.combatants.map((combatant, index) => (
            <CombatantCard
              key={combatant.id}
              combatant={combatant}
              isActive={index === encounter.active_index}
              onUpdate={(patch) => updateCombatant(combatant.id, patch)}
              onRemove={() => removeCombatant(combatant.id)}
            />
          ))}
        </View>

        <View className="gap-3 rounded-3xl border border-panel-border bg-panel p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
              <AppIcon name="add" size={21} color={Colors.accentBright} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-foreground">Add combatants</Text>
              <Text className="mt-0.5 text-xs text-muted">Choose a source or enter someone manually.</Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <Pressable onPress={() => setPickerOpen(true)} className="min-h-24 flex-1 items-center justify-center gap-2 rounded-2xl border border-panel-border bg-panel-raised p-3 active:bg-white/5">
              <AppIcon name="monsters" size={23} color={Colors.accentBright} />
              <Text className="text-center text-sm font-bold text-foreground">Monster</Text>
              <Text className="text-center text-[10px] text-muted">Search bestiary</Text>
            </Pressable>
            {encounter.campaign_id ? (
              <Pressable onPress={() => setPcPickerOpen(true)} className="min-h-24 flex-1 items-center justify-center gap-2 rounded-2xl border border-panel-border bg-panel-raised p-3 active:bg-white/5">
                <AppIcon name="npcs" size={23} color={Colors.accentBright} />
                <Text className="text-center text-sm font-bold text-foreground">PC</Text>
                <Text className="text-center text-[10px] text-muted">From roster</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setCustomAddOpen((open) => !open)}
            className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-panel-border bg-background px-4 active:bg-white/5"
          >
            <AppIcon name="person" size={17} color={Colors.accentBright} />
            <Text className="text-sm font-semibold text-foreground">Custom combatant</Text>
            <AppIcon name={customAddOpen ? "chevronUp" : "chevronDown"} size={16} color={Colors.muted} />
          </Pressable>

          {customAddOpen ? (
            <View className="gap-4 border-t border-panel-border pt-4">
              <FormField label="Name" value={newName} onChangeText={setNewName} placeholder="Goblin scout" />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField label="Initiative" value={newInitiative} onChangeText={setNewInitiative} keyboardType="numbers-and-punctuation" placeholder="12" />
                </View>
                <View className="flex-1">
                  <FormField label="HP" value={newHp} onChangeText={setNewHp} keyboardType="numbers-and-punctuation" placeholder="7" />
                </View>
                <View className="flex-1">
                  <FormField label="AC" value={newAc} onChangeText={setNewAc} keyboardType="numbers-and-punctuation" placeholder="15" />
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel-raised p-3.5">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Player character</Text>
                  <Text className="mt-0.5 text-xs text-muted">Use the PC color treatment.</Text>
                </View>
                <Switch
                  value={newIsPc}
                  onValueChange={setNewIsPc}
                  trackColor={{ false: Colors.panelBorder, true: Colors.accent }}
                  thumbColor={Colors.foreground}
                />
              </View>
              <PrimaryButton label="Add combatant" icon="add" onPress={handleAddCustom} disabled={!newName.trim()} />
            </View>
          ) : null}
        </View>

        <View className="gap-3 border-t border-panel-border pt-4">
          {!confirmingDelete ? <DeleteButton label="Delete encounter" onPress={() => setConfirmingDelete(true)} /> : null}
          {confirmingDelete ? <DeleteConfirmBar label="Delete this encounter?" onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} /> : null}
        </View>
      </ScrollView>

      <MonsterPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAddMonster} />

      <Modal visible={pcPickerOpen} animationType="slide" onRequestClose={() => setPcPickerOpen(false)}>
        <View className="flex-1 bg-background p-4 pt-14">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-black text-foreground">Add PC</Text>
            <Pressable onPress={() => setPcPickerOpen(false)} className="min-h-10 items-center justify-center rounded-xl bg-accent px-4 active:bg-accent-bright">
              <Text className="text-sm font-black text-accent-foreground">Done</Text>
            </Pressable>
          </View>
          {campaignPcs.length === 0 ? (
            <Text className="text-sm text-muted">This campaign has no PCs yet — add them from the campaign screen.</Text>
          ) : (
            <View className="gap-2">
              {campaignPcs.map((pc) => (
                <Pressable
                  key={pc.id}
                  onPress={() => handleAddPc(pc)}
                  className="flex-row items-center justify-between rounded-2xl border border-panel-border bg-panel p-3.5 active:bg-white/5"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-sky-300">{pc.name}</Text>
                    {!!pc.classLevel && <Text className="mt-0.5 text-xs text-muted">{pc.classLevel}</Text>}
                  </View>
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent">
                    <AppIcon name="add" size={18} color={Colors.accentForeground} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
