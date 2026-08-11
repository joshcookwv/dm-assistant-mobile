import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { DeleteConfirmBar } from "@/components/delete-confirm-bar";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import { exportBackup, importBackup, type BackupCounts } from "@/lib/backup";
import { useProAccess } from "@/providers/pro-access";

const SUPPORT_ISSUES_URL = "https://github.com/joshcookwv/dm-assistant-mobile-support/issues/new";
const PRIVACY_POLICY_URL = "https://joshcookwv.github.io/dm-assistant-mobile-support/";

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
  const { isPro, appUserId, loading: accessLoading, error: accessError } = useProAccess();
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ uri: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    const picked = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.name.toLowerCase().endsWith(".json")) {
      setImportError("Please choose an Infernal Codex backup .json file.");
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
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Couldn't restore that backup.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="rounded-2xl border border-accent/40 bg-panel p-5">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
            <AppIcon name={isPro ? "sparkles" : "session"} size={21} color={Colors.accentBright} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              {accessLoading ? "Checking plan..." : isPro ? "Infernal Codex Pro" : "Free plan"}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted">
              {isPro
                ? "Unlimited campaigns and all shared AI features are unlocked."
                : "Includes one campaign. AI features and additional campaigns require Pro."}
            </Text>
          </View>
        </View>
        {accessError && <Text className="mt-3 text-xs text-red-400">{accessError}</Text>}
        {appUserId && (
          <View className="mt-3 rounded-xl bg-background px-3 py-2.5">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Anonymous purchase ID
            </Text>
            <Text selectable className="mt-1 text-xs text-foreground">
              {appUserId}
            </Text>
          </View>
        )}
        <View className="mt-4">
          <PrimaryButton
            label={isPro ? "Manage or Restore Pro" : "View Infernal Codex Pro"}
            icon="sparkles"
            onPress={() =>
              router.push({ pathname: "/pro", params: { returnTo: "/settings" } })
            }
            disabled={accessLoading}
          />
        </View>
      </View>

      <View className="mt-6 rounded-2xl border border-panel-border bg-panel p-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-accent/80">
          Backup &amp; Restore
        </Text>
        <Text className="mt-2 text-sm leading-5 text-foreground/80">
          Export NPCs, notes, encounters, maps, campaigns, sessions, and homebrew monsters to one file.
          Restoring replaces the data currently stored in the app.
        </Text>

        <Pressable
          onPress={handleExport}
          disabled={exporting}
          className="mt-3 rounded-xl bg-accent px-4 py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-center font-medium text-accent-foreground">
            {exporting ? "Preparing..." : "Export Backup"}
          </Text>
        </Pressable>
        {exportMessage && <Text className="mt-2 text-sm text-muted">{exportMessage}</Text>}

        <View className="mt-4 border-t border-panel-border pt-4">
          {!pendingImport ? (
            <Pressable
              onPress={handlePickImportFile}
              className="rounded-xl border border-panel-border px-4 py-3 active:bg-white/5"
            >
              <Text className="text-center text-sm text-foreground">Restore from Backup...</Text>
            </Pressable>
          ) : (
            <DeleteConfirmBar
              label={`Restore "${pendingImport.name}"? This permanently replaces all current data with what's in the backup.`}
              onConfirm={handleConfirmImport}
              onCancel={() => setPendingImport(null)}
            />
          )}
          {importing && <Text className="mt-2 text-sm text-muted">Restoring...</Text>}
          {importMessage && <Text className="mt-2 text-sm text-green-400">✓ {importMessage}</Text>}
          {importError && <Text className="mt-2 text-sm text-red-400">{importError}</Text>}
        </View>
      </View>

      <View className="mt-6 gap-2">
        <Pressable
          onPress={() => router.push("/onboarding")}
          className="rounded-xl border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Replay Walkthrough</Text>
          <Text className="mt-0.5 text-xs text-muted">A quick tour of what&apos;s where</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          className="rounded-xl border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Privacy Policy</Text>
          <Text className="mt-0.5 text-xs text-muted">How local data, purchases, and optional AI processing work</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/settings/legal")}
          className="rounded-xl border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Legal &amp; Licenses</Text>
          <Text className="mt-0.5 text-xs text-muted">SRD content attributions and open-source licenses</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(SUPPORT_ISSUES_URL)}
          className="rounded-xl border border-panel-border bg-panel px-4 py-3 active:bg-white/5"
        >
          <Text className="text-sm font-medium text-foreground">Report an Issue</Text>
          <Text className="mt-0.5 text-xs text-muted">Opens the public issue tracker in your browser</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
