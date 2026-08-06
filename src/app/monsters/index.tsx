import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { EntityListEmpty } from "@/components/entity-list-item";
import { FilterChip } from "@/components/filter-chip";
import { PrimaryButton } from "@/components/primary-button";
import { SearchBar } from "@/components/search-bar";
import { SourceFilter } from "@/components/source-filter";
import { Colors } from "@/constants/colors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listMonsters, type MonsterFilter, type MonsterListItem } from "@/lib/monsters";
import { DEFAULT_SOURCES } from "@/lib/srd";

const FILTERS: { value: MonsterFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "srd", label: "Official" },
  { value: "custom", label: "Homebrew" },
];

function MonsterRow({ monster, onPress }: { monster: MonsterListItem; onPress: () => void }) {
  const isHomebrew = monster.origin === "custom";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-panel-border bg-panel px-3.5 py-3.5 active:bg-panel-raised"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
        <AppIcon name="monsters" size={22} color={Colors.accentBright} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-shrink font-semibold text-foreground" numberOfLines={1}>
            {monster.name}
          </Text>
          {isHomebrew && (
            <View className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent-bright">
                Homebrew
              </Text>
            </View>
          )}
        </View>
        <Text className="mt-1 text-xs text-muted">
          {[monster.challengeRating && `CR ${monster.challengeRating}`, monster.typeLabel]
            .filter(Boolean)
            .join(" • ")}
        </Text>
        {isHomebrew && (
          <Text className="mt-1.5 text-[11px] font-semibold text-subtle">
            HP {monster.hitPoints}  •  AC {monster.armorClass ?? "?"}
          </Text>
        )}
      </View>
      <AppIcon name="chevronRight" size={18} color={Colors.subtle} />
    </Pressable>
  );
}

export default function MonstersListScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filter, setFilter] = useState<MonsterFilter>("all");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(DEFAULT_SOURCES));
  const [monsters, setMonsters] = useState<MonsterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);

  // Homebrew monsters can be edited/deleted on the detail screen, so refresh
  // the list whenever this screen regains focus.
  useFocusEffect(useCallback(() => setReloadToken((token) => token + 1), []));

  useEffect(() => {
    const thisRequest = ++requestId.current;
    async function refreshMonsters() {
      setLoading(true);
      const found = await listMonsters({
        query: debouncedQuery,
        sources: [...selectedSources],
        filter,
      });
      if (requestId.current !== thisRequest) return;
      setMonsters(found);
      setLoading(false);
    }
    void refreshMonsters();
  }, [debouncedQuery, selectedSources, filter, reloadToken]);

  function openMonster(monster: MonsterListItem) {
    if (monster.origin === "custom") router.push(`/monsters/custom/${monster.id}`);
    else router.push(`/monsters/srd/${monster.srdKey}`);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4 pb-3">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search monsters or a CR (e.g. 1/2, 5)…"
        />

        <View className="flex-row gap-2">
          {FILTERS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </View>

        {filter !== "custom" && (
          <SourceFilter selectedSources={selectedSources} onChange={setSelectedSources} />
        )}

        <PrimaryButton label="New Monster" onPress={() => router.push("/monsters/custom/new")} />
      </View>

      {loading ? (
        <View className="mx-4 flex-row items-center justify-center gap-3 rounded-2xl border border-panel-border bg-panel p-5">
          <ActivityIndicator color={Colors.accentBright} />
          <Text className="text-sm text-muted">Consulting the bestiary…</Text>
        </View>
      ) : (
        <FlatList
          data={monsters}
          contentContainerClassName="pb-6"
          keyExtractor={(item) => item.key}
          ListEmptyComponent={
            <EntityListEmpty
              label="No monsters found"
              detail="Try another name, challenge rating, filter, or sourcebook."
              icon="monsters"
            />
          }
          renderItem={({ item }) => (
            <MonsterRow monster={item} onPress={() => openMonster(item)} />
          )}
        />
      )}
    </View>
  );
}
