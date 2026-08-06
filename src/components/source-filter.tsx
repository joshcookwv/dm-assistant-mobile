import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { listSrdSources, type SrdSource } from "@/lib/srd";

function SelectionBox({ selected }: { selected: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-md border ${
        selected ? "border-accent bg-accent" : "border-panel-border bg-background"
      }`}
    >
      {selected && <AppIcon name="check" size={13} color={Colors.accentForeground} />}
    </View>
  );
}

/**
 * Collapsible sourcebook filter. Kobold Press alone publishes a dozen+ separate
 * sourcebooks, so those collapse into a single toggle rather than burying the
 * list; everything else is grouped by game system.
 */
export function SourceFilter({
  selectedSources,
  onChange,
}: {
  selectedSources: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [sources, setSources] = useState<SrdSource[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    listSrdSources().then(setSources);
  }, []);

  const { koboldPressSources, groupedSources } = useMemo(() => {
    const kp: SrdSource[] = [];
    const groups: Record<string, SrdSource[]> = {};
    for (const source of sources) {
      if (source.publisher?.key === "kobold-press") {
        kp.push(source);
        continue;
      }
      const gameSystem = source.gamesystem?.name ?? "Other";
      (groups[gameSystem] ??= []).push(source);
    }
    return { koboldPressSources: kp, groupedSources: groups };
  }, [sources]);

  const koboldPressKeys = useMemo(() => koboldPressSources.map((source) => source.key), [koboldPressSources]);
  const koboldPressAllSelected =
    koboldPressKeys.length > 0 && koboldPressKeys.every((key) => selectedSources.has(key));

  function toggleSource(key: string) {
    const next = new Set(selectedSources);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleKoboldPress() {
    const next = new Set(selectedSources);
    for (const key of koboldPressKeys) {
      if (koboldPressAllSelected) next.delete(key);
      else next.add(key);
    }
    onChange(next);
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="min-h-12 flex-row items-center rounded-xl border border-panel-border bg-panel px-3.5 active:bg-panel-raised"
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-panel-raised">
          <AppIcon name="library" size={17} color={Colors.accentBright} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">Sourcebooks</Text>
          <Text className="mt-0.5 text-[11px] text-muted">{selectedSources.size} selected</Text>
        </View>
        <AppIcon
          name={expanded ? "chevronUp" : "chevronDown"}
          size={19}
          color={Colors.subtle}
        />
      </Pressable>

      {expanded && (
        <View className="max-h-72 overflow-hidden rounded-2xl border border-panel-border bg-panel p-3">
          {koboldPressSources.length > 0 && (
            <Pressable
              onPress={toggleKoboldPress}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: koboldPressAllSelected }}
              className="mb-3 flex-row items-center gap-2.5 rounded-xl bg-panel-raised px-3 py-2.5"
            >
              <SelectionBox selected={koboldPressAllSelected} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Kobold Press</Text>
                <Text className="mt-0.5 text-[11px] text-muted">
                  {koboldPressSources.length} sourcebooks
                </Text>
              </View>
            </Pressable>
          )}
          <FlatList
            data={Object.entries(groupedSources)}
            keyExtractor={([gameSystem]) => gameSystem}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: [gameSystem, list] }) => (
              <View className="mb-3">
                <Text className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[1.5px] text-subtle">
                  {gameSystem}
                </Text>
                {list.map((source) => {
                  const selected = selectedSources.has(source.key);
                  return (
                    <Pressable
                      key={source.key}
                      onPress={() => toggleSource(source.key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      className="flex-row items-center gap-2.5 rounded-xl px-2 py-2 active:bg-panel-raised"
                    >
                      <SelectionBox selected={selected} />
                      <View className="flex-1">
                        <Text className="text-sm text-foreground">{source.display_name}</Text>
                        {source.publisher && source.publisher.key !== "wizards-of-the-coast" && (
                          <Text className="mt-0.5 text-[11px] text-muted">{source.publisher.name}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}
