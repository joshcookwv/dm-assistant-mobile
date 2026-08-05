import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { SearchBar } from "@/components/search-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatChallengeRating } from "@/lib/srd-format";
import {
  DEFAULT_SOURCES,
  isSrdCategory,
  listSrdEntries,
  listSrdSources,
  type SrdCategory,
  type SrdEntry,
  type SrdSource,
} from "@/lib/srd";

const CATEGORY_LABELS: Record<SrdCategory, string> = {
  spells: "Spells",
  creatures: "Monsters",
  classes: "Classes",
  species: "Species",
  feats: "Feats",
  backgrounds: "Backgrounds",
  magicitems: "Magic Items",
  items: "Items",
  weapons: "Weapons",
  armor: "Armor",
  conditions: "Conditions",
};

function entrySubtitle(category: SrdCategory, entry: SrdEntry): string {
  switch (category) {
    case "spells": {
      const level = entry.level as number;
      return level === 0 ? "Cantrip" : `Level ${level}`;
    }
    case "creatures": {
      const type = entry.type as { name?: string } | undefined;
      return `CR ${formatChallengeRating(entry.challenge_rating)} · ${type?.name ?? ""}`;
    }
    case "classes":
      return entry.subclass_of ? "Subclass" : "Class";
    case "species":
      return entry.is_subspecies ? "Subspecies" : "Species";
    case "items":
    case "magicitems": {
      const cat = entry.category as { name?: string } | undefined;
      return cat?.name ?? "";
    }
    default:
      return "";
  }
}

export default function RulesCategoryListScreen() {
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const navigation = useNavigation();
  const category = isSrdCategory(categoryParam) ? categoryParam : "spells";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [entries, setEntries] = useState<SrdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SrdSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(DEFAULT_SOURCES));
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    navigation.setOptions({ title: CATEGORY_LABELS[category] });
  }, [category, navigation]);

  useEffect(() => {
    listSrdSources().then(setSources);
  }, []);

  useEffect(() => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    listSrdEntries(category, debouncedQuery, [...selectedSources]).then((result) => {
      if (requestId.current !== thisRequest) return; // a newer request superseded this one
      setEntries(result);
      setLoading(false);
    });
  }, [category, debouncedQuery, selectedSources]);

  // Kobold Press alone publishes a dozen+ separate sourcebooks — listing each
  // as its own checkbox buried the source picker, so they're collapsed into
  // a single "Kobold Press" toggle that selects/deselects all of them at once.
  const { koboldPressSources, groupedSources } = useMemo(() => {
    const kp: SrdSource[] = [];
    const groups: Record<string, SrdSource[]> = {};
    for (const source of sources) {
      if (source.publisher?.key === "kobold-press") {
        kp.push(source);
        continue;
      }
      const gs = source.gamesystem?.name ?? "Other";
      (groups[gs] ??= []).push(source);
    }
    return { koboldPressSources: kp, groupedSources: groups };
  }, [sources]);

  const koboldPressKeys = useMemo(() => koboldPressSources.map((s) => s.key), [koboldPressSources]);
  const koboldPressAllSelected =
    koboldPressKeys.length > 0 && koboldPressKeys.every((key) => selectedSources.has(key));

  function toggleSource(key: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleKoboldPress() {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      for (const key of koboldPressKeys) {
        if (koboldPressAllSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4 pb-2">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={
            category === "creatures"
              ? "Search monsters or a CR (e.g. 1/2, 5)…"
              : `Search ${CATEGORY_LABELS[category].toLowerCase()}…`
          }
        />
        <Pressable
          onPress={() => setShowSourcePanel((v) => !v)}
          className="self-start rounded-md border border-panel-border px-3 py-2 active:bg-white/5"
        >
          <Text className="text-sm text-foreground/80">
            Sources ({selectedSources.size}) {showSourcePanel ? "▲" : "▼"}
          </Text>
        </Pressable>

        {showSourcePanel && (
          <View className="max-h-56 rounded-md border border-panel-border bg-panel p-3">
            {koboldPressSources.length > 0 && (
              <Pressable
                onPress={toggleKoboldPress}
                className="mb-3 flex-row items-center gap-1.5 border-b border-panel-border pb-2"
              >
                <View
                  className={`h-4 w-4 rounded border ${koboldPressAllSelected ? "border-accent bg-accent" : "border-panel-border"}`}
                />
                <Text className="text-sm font-medium text-foreground">Kobold Press</Text>
                <Text className="text-xs text-muted">({koboldPressSources.length} sourcebooks)</Text>
              </Pressable>
            )}
            <FlatList
              data={Object.entries(groupedSources)}
              keyExtractor={([gamesystem]) => gamesystem}
              renderItem={({ item: [gamesystem, list] }) => (
                <View className="mb-3">
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {gamesystem}
                  </Text>
                  {list.map((source) => (
                    <Pressable
                      key={source.key}
                      onPress={() => toggleSource(source.key)}
                      className="flex-row items-center gap-1.5 py-1"
                    >
                      <View
                        className={`h-4 w-4 rounded border ${selectedSources.has(source.key) ? "border-accent bg-accent" : "border-panel-border"}`}
                      />
                      <Text className="text-sm text-foreground">{source.display_name}</Text>
                      {source.publisher && source.publisher.key !== "wizards-of-the-coast" && (
                        <Text className="text-xs text-muted">({source.publisher.name})</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>
        )}
      </View>

      {loading && (
        <View className="p-4">
          <ActivityIndicator color="#d99a3f" />
        </View>
      )}
      {!loading && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={<EntityListEmpty label="No results." />}
          renderItem={({ item }) => (
            <EntityListItem
              title={item.name}
              subtitle={entrySubtitle(category, item)}
              onPress={() => router.push(`/rules/${category}/${item.key}`)}
            />
          )}
        />
      )}
    </View>
  );
}
