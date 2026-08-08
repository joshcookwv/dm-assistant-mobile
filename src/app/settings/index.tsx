import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { FormField } from "@/components/form-field";
import { exportBackup, importBackup, type BackupCounts } from "@/lib/backup";
import { deleteApiKey, getApiKey, setApiKey } from "@/lib/secure-settings";

const SUPPORT_ISSUES_URL = "https://github.com/joshcookwv/dm-assistant-mobile-support/issues/new";

type TestStatus = "idle" | "testing" | "success" | "error";

function summarizeCounts(counts: BackupCounts): string {
  const parts = [
    counts.npcs && `${counts.npcs} NPC${counts.npcs === 1 ? "" : "s"}`,
    counts.notes && `${counts.notes} note${counts.notes === 1 ? "" : "s"}`,
    counts.encounters && `${counts.encounters} encounter${counts.encounters === 1 ? "" : "s"}`,
    counts.maps && `${counts.maps} map${counts.maps === 1 ? "" : "s"}`,
    counts.bestiary && `${counts.bestiary} homebrew monster${counts.bestiary === 1 ? "" : "s"}`,
    counts.sessions && `${counts.sessions} session${counts.sessions === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing yet";
}

export default function SettingsScreen() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ uri: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function refresh() {
    setHasApiKey(Boolean(await getApiKey()));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    setSaveMessage(null);
    setTestStatus("idle");
    try {
      await setApiKey(apiKeyInput.trim());
      setApiKeyInput("");
      setSaveMessage("Saved.");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    await deleteApiKey();
    setSaveMessage("Removed.");
    setTestStatus("idle");
    await refresh();
  }

  async function handleTest() {
    setTestStatus("testing");
    setTestMessage(null);
    try {
      const key = await getApiKey();
      if (!key) {
        setTestStatus("error");
        setTestMessage("No key saved yet.");
        return;
      }
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8,
          messages: [{ role: "user", content: "Reply with OK." }],
        }),
      });
      if (res.ok) {
        setTestStatus("success");
        setTestMessage("Connected successfully.");
      } else {
        const body = await res.json();
        setTestStatus("error");
        setTestMessage(body?.error?.message ?? "Connection failed.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Connection failed.");
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    try {
      const counts = await exportBackup();
      setExportMessage(`Backup ready — ${summarizeCounts(counts)}.`);
    } catch {
      setExportMessage("Couldn't create a backup. Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handlePickImportFile() {
    setImportMessage(null);
    setImportError(null);
    // type: "*/*" — filtering to a specific mime type routes some Android
    // file providers to a picker that hands back an unreadable file. Same
    // fix as the PDF importer; validate the extension ourselves instead.
    const picked = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.name.toLowerCase().endsWith(".json")) {
      setImportError("Please choose a campaign backup .json file.");
      return;
    }
    setPendingImport({ uri: asset.uri, name: asset.name });
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setImporting(true);
    setImportError(null);
    try {
      const counts = await importBackup(pendingImport.uri);
      setImportMessage(`Restored — ${summarizeCounts(counts)}. Restart the app to see everything refresh.`);
      setPendingImport(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Couldn't restore that backup.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Text className="text-sm text-muted">
        Add your Claude API key to enable AI-assisted features (NPC suggestions, PDF import, and more).
      </Text>

      <View className="mt-4 rounded-md border border-panel-border bg-panel p-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
          Claude API Key
        </Text>
        <Text className="mt-2 text-sm text-foreground/80">
          {hasApiKey === null
            ? "Checking…"
            : hasApiKey
              ? "A key is currently saved, in your device's secure keychain. Enter a new one below to replace it."
              : "No key saved yet."}
        </Text>

        <View className="mt-3 gap-2">
          <FormField
            label=""
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            placeholder="sk-ant-…"
            secureTextEntry
            autoCapitalize="none"
          />
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleSave}
              disabled={saving || !apiKeyInput.trim()}
              className="rounded-md bg-accent px-4 py-2.5 active:opacity-80 disabled:opacity-50"
            >
              <Text className="font-medium text-accent-foreground">{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
            {hasApiKey && (
              <Pressable
                onPress={handleRemove}
                className="rounded-md border border-panel-border px-4 py-2.5 active:bg-red-500/10"
              >
                <Text className="text-sm text-red-400">Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
        {saveMessage && <Text className="mt-2 text-sm text-muted">{saveMessage}</Text>}

        <View className="mt-4 flex-row flex-wrap items-center gap-3 border-t border-panel-border pt-4">
          <Pressable
            onPress={handleTest}
            disabled={testStatus === "testing" || !hasApiKey}
            className="rounded-md border border-panel-border px-4 py-2.5 active:bg-white/5 disabled:opacity-50"
          >
            <Text className="text-sm text-foreground">
              {testStatus === "testing" ? "Testing…" : "Test Connection"}
            </Text>
          </Pressable>
          {testStatus === "success" && (
            <Text className="text-sm text-green-400">✓ {testMessage}</Text>
          )}
          {testStatus === "error" && <Text className="text-sm text-red-400">{testMessage}</Text>}
        </View>

        <Text className="mt-4 text-xs text-muted">
          Don&apos;t have a key yet? Create one at{" "}
          <Text
            className="text-accent underline"
            onPress={() => Linking.openURL("https://console.anthropic.com/settings/keys")}
          >
            console.anthropic.com
          </Text>{" "}
          — this is a separate, usage-billed API account (not the same as a claude.ai subscription).
          Your key is stored in this device&apos;s secure keychain and is only ever sent directly to
          Anthropic&apos;s API.
        </Text>
      </View>

      <View className="mt-6 rounded-md border border-panel-border bg-panel p-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
          Backup &amp; Restore
        </Text>
        <Text className="mt-2 text-sm text-foreground/80">
          Export everything — NPCs, notes, encounters, maps, sessions, and homebrew monsters — to a
          single file you can save anywhere. Restoring it (e.g. on a new phone) replaces whatever's
          currently in the app.
        </Text>

        <Pressable
          onPress={handleExport}
          disabled={exporting}
          className="mt-3 rounded-md bg-accent px-4 py-2.5 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-center font-medium text-accent-foreground">
            {exporting ? "Preparing…" : "Export Backup"}
          </Text>
        </Pressable>
        {exportMessage && <Text className="mt-2 text-sm text-muted">{exportMessage}</Text>}

        <View className="mt-4 border-t border-panel-border pt-4">
          {!pendingImport ? (
            <Pressable
              onPress={handlePickImportFile}
              className="rounded-md border border-panel-border px-4 py-2.5 active:bg-white/5"
            >
              <Text className="text-center text-sm text-foreground">Restore from Backup…</Text>
            </Pressable>
          ) : (
            <DeleteConfirmBar
              label={`Restore "${pendingImport.name}"? This permanently replaces all current data with what's in the backup.`}
              onConfirm={handleConfirmImport}
              onCancel={() => setPendingImport(null)}
            />
          )}
          {importing && <Text className="mt-2 text-sm text-muted">Restoring…</Text>}
          {importMessage && <Text className="mt-2 text-sm text-green-400">✓ {importMessage}</Text>}
          {importError && <Text className="mt-2 text-sm text-red-400">{importError}</Text>}
        </View>
      </View>

      <View className="mt-6 gap-2">
        <Pressable
          onPress={() => router.push("/onboarding")}
          className="rounded-md border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Replay Walkthrough</Text>
          <Text className="mt-0.5 text-xs text-muted">A quick tour of what's where</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/settings/legal")}
          className="rounded-md border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Legal &amp; Licenses</Text>
          <Text className="mt-0.5 text-xs text-muted">SRD content attributions and open-source licenses</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(SUPPORT_ISSUES_URL)}
          className="rounded-md border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Report an Issue</Text>
          <Text className="mt-0.5 text-xs text-muted">Opens the public issue tracker in your browser</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
