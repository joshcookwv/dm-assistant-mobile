import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { Colors } from "@/constants/colors";
import { MonsterPickerModal } from "@/components/monster-picker-modal";
import { createEncounter, updateEncounter } from "@/lib/encounters";
import type { MonsterListItem } from "@/lib/monsters";
import {
  createSessionMember,
  deleteSession,
  getSession,
  listSessionMembers,
  membersToCombatants,
  updateSession,
  type SessionMember,
} from "@/lib/session";

function MemberRow({ member, onPress }: { member: SessionMember; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-panel-border/50 px-4 py-3 active:bg-white/5"
    >
      <View className="flex-1">
        <Text className={`font-medium ${member.isPc ? "text-sky-300" : "text-foreground"}`}>
          {member.name}
          {member.quantity > 1 && <Text className="text-accent"> ×{member.quantity}</Text>}
        </Text>
        {!!member.notes && <Text className="mt-0.5 text-xs text-muted">{member.notes}</Text>}
      </View>
      <Text className="text-xs text-muted">
        HP {member.maxHp} · AC {member.ac ?? "?"}
      </Text>
    </Pressable>
  );
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameDirty = useRef(false);

  const refresh = useCallback(() => {
    const session = getSession(sessionId);
    if (!session) {
      Alert.alert("Not found", "This session no longer exists.");
      router.back();
      return;
    }
    if (!nameDirty.current) setName(session.name);
    navigation.setOptions({ title: session.name });
    setMembers(listSessionMembers(sessionId));
  }, [sessionId, navigation]);

  useFocusEffect(refresh);

  // Debounced rename so each keystroke isn't its own write.
  useEffect(() => {
    if (!nameDirty.current) return;
    const timeout = setTimeout(() => {
      updateSession(sessionId, name.trim() || "Untitled Session");
      navigation.setOptions({ title: name });
      nameDirty.current = false;
    }, 500);
    return () => clearTimeout(timeout);
  }, [name, sessionId, navigation]);

  const party = members.filter((m) => m.isPc);
  const monsters = members.filter((m) => !m.isPc);

  function handleAddMonster(monster: MonsterListItem) {
    createSessionMember({
      sessionId,
      name: monster.name,
      maxHp: monster.hitPoints,
      ac: monster.armorClass,
      isPc: false,
      quantity: 1,
    });
  }

  function handleStartEncounter() {
    if (members.length === 0) return;
    const encounter = createEncounter(name.trim() || "Session Encounter");
    updateEncounter(encounter.id, {
      name: encounter.name,
      round: 1,
      active_index: 0,
      combatants: membersToCombatants(members),
    });
    router.push(`/encounters/${encounter.id}`);
  }

  function handleDelete() {
    deleteSession(sessionId);
    router.back();
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 pb-6">
        <View className="gap-3 p-4 pb-0">
          <TextInput
            value={name}
            onChangeText={(next) => {
              nameDirty.current = true;
              setName(next);
            }}
            placeholder="Session name"
            placeholderTextColor={Colors.muted}
            className="rounded-md border border-panel-border bg-background px-3 py-2 text-lg font-medium text-foreground"
          />

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push(`/session/member/new?session=${sessionId}&pc=1`)}
              className="flex-1 items-center rounded-md border border-panel-border px-4 py-2.5 active:bg-white/5"
            >
              <Text className="text-sm text-foreground">+ Add PC</Text>
            </Pressable>
            <Pressable
              onPress={() => setPickerOpen(true)}
              className="flex-1 items-center rounded-md border border-panel-border px-4 py-2.5 active:bg-white/5"
            >
              <Text className="text-sm text-foreground">+ Add Monster</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleStartEncounter}
            disabled={members.length === 0}
            className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-medium text-accent-foreground">Start Encounter with All</Text>
          </Pressable>
        </View>

        <View>
          <Text className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-accent/80">
            Party ({party.length})
          </Text>
          {party.length === 0 ? (
            <Text className="px-4 text-sm text-muted">
              No PCs yet — add them once and they&apos;re ready for every encounter this session.
            </Text>
          ) : (
            party.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onPress={() => router.push(`/session/member/${m.id}`)}
              />
            ))
          )}
        </View>

        <View>
          <Text className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-accent/80">
            Monsters ({monsters.reduce((sum, m) => sum + m.quantity, 0)})
          </Text>
          {monsters.length === 0 ? (
            <Text className="px-4 text-sm text-muted">
              No monsters staged yet — search the SRD and your homebrew above.
            </Text>
          ) : (
            monsters.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onPress={() => router.push(`/session/member/${m.id}`)}
              />
            ))
          )}
        </View>

        <View className="mt-2 flex-row gap-2 border-t border-panel-border px-4 pt-3">
          {!confirmingDelete && <DeleteButton onPress={() => setConfirmingDelete(true)} />}
          {confirmingDelete && (
            <DeleteConfirmBar
              label="Delete this session?"
              onConfirm={handleDelete}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </View>
      </ScrollView>

      <MonsterPickerModal
        visible={pickerOpen}
        title="Add to Session"
        onClose={() => {
          setPickerOpen(false);
          refresh();
        }}
        onSelect={handleAddMonster}
      />
    </View>
  );
}
