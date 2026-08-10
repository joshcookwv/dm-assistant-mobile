import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { AiError } from "@/components/ai-error";
import { Colors } from "@/constants/colors";
import { AiNotConfiguredError } from "@/lib/ai";
import { createNpc } from "@/lib/npcs";
import { createBestiaryMonster } from "@/lib/bestiary";
import { createNote } from "@/lib/notes";
import {
  extractFromPdf,
  type ExtractedMonster,
  type ExtractedNpc,
  type ExtractedRule,
  type PdfImportStage,
} from "@/lib/pdf-import";

type Stage = "idle" | "working" | "review" | "importing" | "done";

interface Staged<T> {
  included: boolean;
  data: T;
}

function withIncluded<T>(items: T[]): Staged<T>[] {
  return items.map((data) => ({ included: true, data }));
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={8} className="h-5 w-5 items-center justify-center">
      <View className={`h-4 w-4 rounded border ${checked ? "border-accent bg-accent" : "border-panel-border"}`} />
    </Pressable>
  );
}

function SmallInput(props: React.ComponentProps<typeof TextInput> & { placeholder?: string }) {
  return (
    <TextInput
      placeholderTextColor={Colors.muted}
      className="rounded border border-panel-border bg-background px-2 py-1.5 text-sm text-foreground"
      {...props}
    />
  );
}

export default function ImportScreen() {
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadStage, setUploadStage] = useState<PdfImportStage>("uploading");
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [sourceName, setSourceName] = useState("");

  const [npcs, setNpcs] = useState<Staged<ExtractedNpc>[]>([]);
  const [monsters, setMonsters] = useState<Staged<ExtractedMonster>[]>([]);
  const [rules, setRules] = useState<Staged<ExtractedRule>[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  async function handlePickAndExtract() {
    setError(null);
    // type: "*/*" — filtering to "application/pdf" was routing Android to
    // its newer unified "Documents" content provider
    // (com.android.providers.media.documents), which produced an unreadable
    // file under Expo Go regardless of read API. The unfiltered picker uses
    // the classic file picker instead; we validate the extension ourselves.
    const picked = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (asset.mimeType !== "application/pdf" && !asset.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }

    setStage("working");
    setUploadStage("uploading");
    try {
      const result = await extractFromPdf(asset.uri, asset.name, setUploadStage);
      setSourceName(asset.name);
      setNpcs(withIncluded(result.npcs));
      setMonsters(withIncluded(result.monsters));
      setRules(withIncluded(result.rules));
      setTruncated(result.truncated);
      setStage("review");
    } catch (err) {
      setError(
        err instanceof AiNotConfiguredError
          ? // Deliberately doesn't just say "add a key" — a DM who already
            // turned on Free Shared AI for NPC suggestions and then hits an
            // unqualified "not configured" message here reads it as broken,
            // not as an intentional scope boundary (dm-reviewer's catch).
            // Naming the toggle and explaining why preempts that.
            "PDF import isn't included in Free Shared AI — it's a much larger request than other AI features. Add your own Claude API key in Settings to use it."
          : err instanceof Error
            ? err.message
            : "Something went wrong reading that file."
      );
      setStage("idle");
    }
  }

  function handleImport() {
    setStage("importing");
    let npcCount = 0;
    let monsterCount = 0;
    let ruleCount = 0;

    for (const { included, data } of npcs) {
      if (!included || !data.name.trim()) continue;
      createNpc({ ...data, tags: "imported, pdf" });
      npcCount++;
    }
    for (const { included, data } of monsters) {
      if (!included || !data.name.trim()) continue;
      createBestiaryMonster({
        ...data,
        source_note: `Imported from ${sourceName}`,
        tags: "imported, pdf",
      });
      monsterCount++;
    }
    for (const { included, data } of rules) {
      if (!included || !data.title.trim()) continue;
      createNote({
        title: data.title,
        content: `${data.content}\n\n_Imported from ${sourceName}_`,
        tags: "imported, pdf",
      });
      ruleCount++;
    }

    setSummary(
      `Imported ${npcCount} NPC${npcCount === 1 ? "" : "s"}, ${monsterCount} monster${monsterCount === 1 ? "" : "s"}, ${ruleCount} rule note${ruleCount === 1 ? "" : "s"}.`
    );
    setStage("done");
  }

  function startOver() {
    setStage("idle");
    setError(null);
    setTruncated(false);
    setNpcs([]);
    setMonsters([]);
    setRules([]);
    setSummary(null);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Text className="text-sm text-muted">
          Pick a sourcebook or homebrew PDF — Claude reads it directly and pulls out NPCs, monster
          stat blocks, and rules text for you to review before anything is saved.
        </Text>

        {(stage === "idle" || stage === "working") && (
          <View className="rounded-md border border-panel-border bg-panel p-4">
            <Pressable
              onPress={handlePickAndExtract}
              disabled={stage === "working"}
              className="items-center rounded-md bg-accent px-4 py-2.5 active:opacity-80 disabled:opacity-50"
            >
              {stage === "working" ? (
                <ActivityIndicator color={Colors.accentForeground} />
              ) : (
                <Text className="font-medium text-accent-foreground">Choose PDF & Extract</Text>
              )}
            </Pressable>
            {stage === "working" && (
              <Text className="mt-2 text-sm text-muted">
                {uploadStage === "uploading"
                  ? "Uploading PDF…"
                  : "Extracting content — this can take a minute for longer documents."}
              </Text>
            )}
            {error && <AiError message={error} />}
          </View>
        )}

        {(stage === "review" || stage === "importing") && (
          <View className="gap-6">
            {truncated && (
              <Text className="text-sm text-amber-400">
                This document was long enough that extraction may be incomplete — review carefully.
              </Text>
            )}

            <StagedSection
              title={`NPCs Found (${npcs.length})`}
              emptyText="No NPCs found in this document."
              items={npcs}
              renderItem={(item, i) => (
                <View key={i} className="rounded-md border border-panel-border p-3">
                  <View className="flex-row items-center gap-2">
                    <Checkbox
                      checked={item.included}
                      onToggle={() =>
                        setNpcs((prev) => prev.map((n, idx) => (idx === i ? { ...n, included: !n.included } : n)))
                      }
                    />
                    <SmallInput
                      value={item.data.name}
                      onChangeText={(name) =>
                        setNpcs((prev) => prev.map((n, idx) => (idx === i ? { ...n, data: { ...n.data, name } } : n)))
                      }
                      className="flex-1 rounded border border-panel-border bg-background px-2 py-1.5 text-sm font-medium text-foreground"
                    />
                  </View>
                  <View className="mt-2 flex-row gap-2">
                    {(["race", "role", "location"] as const).map((field) => (
                      <SmallInput
                        key={field}
                        placeholder={field}
                        value={item.data[field] ?? ""}
                        onChangeText={(v) =>
                          setNpcs((prev) =>
                            prev.map((n, idx) => (idx === i ? { ...n, data: { ...n.data, [field]: v } } : n))
                          )
                        }
                        className="flex-1 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                      />
                    ))}
                  </View>
                  <SmallInput
                    value={item.data.description ?? ""}
                    onChangeText={(description) =>
                      setNpcs((prev) =>
                        prev.map((n, idx) => (idx === i ? { ...n, data: { ...n.data, description } } : n))
                      )
                    }
                    multiline
                    className="mt-2 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                  />
                </View>
              )}
            />

            <StagedSection
              title={`Monsters Found (${monsters.length})`}
              emptyText="No monster stat blocks found in this document."
              items={monsters}
              renderItem={(item, i) => (
                <View key={i} className="rounded-md border border-panel-border p-3">
                  <View className="flex-row items-center gap-2">
                    <Checkbox
                      checked={item.included}
                      onToggle={() =>
                        setMonsters((prev) => prev.map((m, idx) => (idx === i ? { ...m, included: !m.included } : m)))
                      }
                    />
                    <SmallInput
                      value={item.data.name}
                      onChangeText={(name) =>
                        setMonsters((prev) =>
                          prev.map((m, idx) => (idx === i ? { ...m, data: { ...m.data, name } } : m))
                        )
                      }
                      className="flex-1 rounded border border-panel-border bg-background px-2 py-1.5 text-sm font-medium text-foreground"
                    />
                  </View>
                  <View className="mt-2 flex-row gap-2">
                    <SmallInput
                      placeholder="AC"
                      keyboardType="numbers-and-punctuation"
                      value={item.data.armor_class != null ? String(item.data.armor_class) : ""}
                      onChangeText={(v) =>
                        setMonsters((prev) =>
                          prev.map((m, idx) => (idx === i ? { ...m, data: { ...m.data, armor_class: Number(v) || undefined } } : m))
                        )
                      }
                      className="w-14 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                    />
                    <SmallInput
                      placeholder="HP"
                      keyboardType="numbers-and-punctuation"
                      value={item.data.hit_points != null ? String(item.data.hit_points) : ""}
                      onChangeText={(v) =>
                        setMonsters((prev) =>
                          prev.map((m, idx) => (idx === i ? { ...m, data: { ...m.data, hit_points: Number(v) || undefined } } : m))
                        )
                      }
                      className="w-14 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                    />
                    <SmallInput
                      placeholder="CR"
                      value={item.data.challenge_rating ?? ""}
                      onChangeText={(v) =>
                        setMonsters((prev) =>
                          prev.map((m, idx) => (idx === i ? { ...m, data: { ...m.data, challenge_rating: v } } : m))
                        )
                      }
                      className="w-14 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                    />
                    <SmallInput
                      placeholder="type"
                      value={item.data.type ?? ""}
                      onChangeText={(v) =>
                        setMonsters((prev) => prev.map((m, idx) => (idx === i ? { ...m, data: { ...m.data, type: v } } : m)))
                      }
                      className="flex-1 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                    />
                  </View>
                  <SmallInput
                    value={item.data.stat_block ?? ""}
                    onChangeText={(stat_block) =>
                      setMonsters((prev) =>
                        prev.map((m, idx) => (idx === i ? { ...m, data: { ...m.data, stat_block } } : m))
                      )
                    }
                    multiline
                    className="mt-2 rounded border border-panel-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
                  />
                </View>
              )}
            />

            <StagedSection
              title={`Rules Found (${rules.length})`}
              emptyText="No standalone rules text found in this document."
              items={rules}
              renderItem={(item, i) => (
                <View key={i} className="rounded-md border border-panel-border p-3">
                  <View className="flex-row items-center gap-2">
                    <Checkbox
                      checked={item.included}
                      onToggle={() =>
                        setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, included: !r.included } : r)))
                      }
                    />
                    <SmallInput
                      value={item.data.title}
                      onChangeText={(title) =>
                        setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, data: { ...r.data, title } } : r)))
                      }
                      className="flex-1 rounded border border-panel-border bg-background px-2 py-1.5 text-sm font-medium text-foreground"
                    />
                  </View>
                  <SmallInput
                    value={item.data.content}
                    onChangeText={(content) =>
                      setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, data: { ...r.data, content } } : r)))
                    }
                    multiline
                    className="mt-2 rounded border border-panel-border bg-background px-2 py-1.5 text-xs text-foreground"
                  />
                </View>
              )}
            />

            <View className="flex-row gap-2">
              <Pressable
                onPress={handleImport}
                disabled={stage === "importing"}
                className="rounded-md bg-accent px-4 py-2.5 active:opacity-80 disabled:opacity-50"
              >
                <Text className="font-medium text-accent-foreground">
                  {stage === "importing" ? "Importing…" : "Import Selected"}
                </Text>
              </Pressable>
              <Pressable
                onPress={startOver}
                disabled={stage === "importing"}
                className="rounded-md border border-panel-border px-4 py-2.5 active:bg-white/5"
              >
                <Text className="text-sm text-foreground">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {stage === "done" && (
          <View className="rounded-md border border-panel-border bg-panel p-4">
            <Text className="text-sm text-foreground">{summary}</Text>
            <Pressable
              onPress={startOver}
              className="mt-4 items-center self-start rounded-md bg-accent px-4 py-2.5 active:opacity-80"
            >
              <Text className="font-medium text-accent-foreground">Import Another PDF</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StagedSection<T>({
  title,
  emptyText,
  items,
  renderItem,
}: {
  title: string;
  emptyText: string;
  items: Staged<T>[];
  renderItem: (item: Staged<T>, index: number) => React.ReactNode;
}) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">{title}</Text>
      <View className="mt-2 gap-2">
        {items.length > 0 ? items.map(renderItem) : <Text className="text-sm text-muted">{emptyText}</Text>}
      </View>
    </View>
  );
}
