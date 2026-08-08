import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { DeleteButton, DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { Colors } from "@/constants/colors";
import {
  createCampaignSession,
  deleteCampaign,
  getCampaign,
  listCampaignLocations,
  listCampaignPcs,
  listCampaignSessions,
  updateCampaign,
  type CampaignLocation,
  type CampaignPc,
  type CampaignSession,
  type LocationSummary,
} from "@/lib/campaigns";

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignId = Number(id);
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [pcs, setPcs] = useState<CampaignPc[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameDirty = useRef(false);

  const refresh = useCallback(() => {
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      Alert.alert("Not found", "This campaign no longer exists.");
      router.back();
      return;
    }
    if (!nameDirty.current) setName(campaign.name);
    navigation.setOptions({ title: campaign.name });
    setPcs(listCampaignPcs(campaignId));
    setLocations(listCampaignLocations(campaignId));
    setSessions(listCampaignSessions(campaignId));
  }, [campaignId, navigation]);

  useFocusEffect(refresh);

  useEffect(() => {
    if (!nameDirty.current) return;
    const timeout = setTimeout(() => {
      updateCampaign(campaignId, name.trim() || "Untitled Campaign");
      navigation.setOptions({ title: name });
      nameDirty.current = false;
    }, 500);
    return () => clearTimeout(timeout);
  }, [name, campaignId, navigation]);

  function handleNewLocation() {
    router.push(`/campaign/${campaignId}/location/new`);
  }

  function handleNewSession() {
    const created = createCampaignSession(campaignId);
    router.push(`/campaign/${campaignId}/session/${created.id}`);
  }

  function handleDelete() {
    deleteCampaign(campaignId);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <TextInput
        value={name}
        onChangeText={(next) => {
          nameDirty.current = true;
          setName(next);
        }}
        placeholder="Campaign name"
        placeholderTextColor={Colors.muted}
        className="rounded-md border border-panel-border bg-panel px-3 py-2.5 text-lg font-bold text-foreground"
      />

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
            Party ({pcs.length})
          </Text>
          <Pressable onPress={() => router.push(`/campaign/${campaignId}/pc/new`)} hitSlop={8}>
            <Text className="text-xs font-semibold text-accent-bright">+ Add PC</Text>
          </Pressable>
        </View>
        {pcs.length === 0 ? (
          <Text className="text-sm leading-5 text-muted">
            Add your players once and they&apos;re ready for every encounter in this campaign.
          </Text>
        ) : (
          <View className="gap-2">
            {pcs.map((pc) => (
              <Pressable
                key={pc.id}
                onPress={() => router.push(`/campaign/${campaignId}/pc/${pc.id}`)}
                className="flex-row items-center justify-between rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-sky-300">{pc.name}</Text>
                  {!!pc.classLevel && <Text className="mt-0.5 text-xs text-muted">{pc.classLevel}</Text>}
                </View>
                <Text className="text-xs text-muted">
                  HP {pc.maxHp} · AC {pc.ac ?? "?"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
            Locations ({locations.length})
          </Text>
          <Pressable onPress={handleNewLocation} hitSlop={8}>
            <Text className="text-xs font-semibold text-accent-bright">+ Add Location</Text>
          </Pressable>
        </View>
        {locations.length === 0 ? (
          <Text className="text-sm leading-5 text-muted">
            Add a place your party visits — NPCs, encounters, and notes tagged there all show up
            together.
          </Text>
        ) : (
          <View className="gap-2">
            {locations.map((location: CampaignLocation & { npcCount: number; encounterCount: number; noteCount: number }) => (
              <Pressable
                key={location.id}
                onPress={() => router.push(`/campaign/${campaignId}/location/${location.id}`)}
                className="flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                  <AppIcon name="maps" size={19} color={Colors.accentBright} />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">{location.name}</Text>
                  <Text className="mt-0.5 text-xs text-muted">
                    {location.npcCount} NPC{location.npcCount === 1 ? "" : "s"} · {location.encounterCount}{" "}
                    encounter{location.encounterCount === 1 ? "" : "s"} · {location.noteCount} note
                    {location.noteCount === 1 ? "" : "s"}
                  </Text>
                </View>
                <AppIcon name="chevronRight" size={16} color={Colors.subtle} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
            Sessions ({sessions.length})
          </Text>
          <Pressable onPress={handleNewSession} hitSlop={8}>
            <Text className="text-xs font-semibold text-accent-bright">+ New Session</Text>
          </Pressable>
        </View>
        {sessions.length === 0 ? (
          <Text className="text-sm leading-5 text-muted">
            Log a session to number your game nights and keep a recap.
          </Text>
        ) : (
          <View className="gap-2">
            {sessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/campaign/${campaignId}/session/${session.id}`)}
                className="flex-row items-center justify-between rounded-2xl border border-panel-border bg-panel px-4 py-3 active:bg-panel-raised"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    Session {session.number}
                    {session.name ? ` — ${session.name}` : ""}
                  </Text>
                  {!!session.playedOn && <Text className="mt-0.5 text-xs text-muted">{session.playedOn}</Text>}
                </View>
                <AppIcon name="chevronRight" size={16} color={Colors.subtle} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View className="mt-2 border-t border-panel-border pt-4">
        {!confirmingDelete && <DeleteButton label="Delete Campaign" onPress={() => setConfirmingDelete(true)} />}
        {confirmingDelete && (
          <DeleteConfirmBar
            label="Delete this campaign? Its PCs, locations, and sessions all go with it."
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </View>
    </ScrollView>
  );
}
