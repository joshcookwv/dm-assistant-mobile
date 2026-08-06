import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { EntityListEmpty, EntityListItem } from "@/components/entity-list-item";
import { SearchBar } from "@/components/search-bar";
import { SourceFilter } from "@/components/source-filter";
import { Colors } from "@/constants/colors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatChallengeRating } from "@/lib/srd-format";
import {
  DEFAULT_SOURCES,
  isSrdCategory,
  listSrdEntries,
  type SrdCategory,
  type SrdEntry,
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
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(DEFAULT_SOURCES));
  const requestId = useRef(0);

  useEffect(() => {
    navigation.setOptions({ title: CATEGORY_LABELS[category] });
  }, [category, navigation]);

  useEffect(() => {
    const thisRequest = ++requestId.current;
    async function refreshEntries() {
      setLoading(true);
      const result = await listSrdEntries(category, debouncedQuery, [...selectedSources]);
      if (requestId.current !== thisRequest) return; // a newer request superseded this one
      setEntries(result);
      setLoading(false);
    }
    void refreshEntries();
  }, [category, debouncedQuery, selectedSources]);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4 pb-2">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${CATEGORY_LABELS[category].toLowerCase()}…`}
        />
        <SourceFilter selectedSources={selectedSources} onChange={setSelectedSources} />
      </View>

      {loading && (
        <View className="p-4">
          <ActivityIndicator color={Colors.accent} />
        </View>
      )}
      {!loading && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={
            <EntityListEmpty
              label="No rules found"
              detail="Try another search or broaden the selected sourcebooks."
              icon="rules"
            />
          }
          renderItem={({ item }) => (
            <EntityListItem
              title={item.name}
              icon="rules"
              subtitle={entrySubtitle(category, item)}
              onPress={() => router.push(`/rules/${category}/${item.key}`)}
            />
          )}
        />
      )}
    </View>
  );
}
