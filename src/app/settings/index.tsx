import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { FormField } from "@/components/form-field";
import { deleteApiKey, getApiKey, setApiKey } from "@/lib/secure-settings";

const SUPPORT_ISSUES_URL = "https://github.com/joshcookwv/dm-assistant-mobile-support/issues/new";

type TestStatus = "idle" | "testing" | "success" | "error";

export default function SettingsScreen() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

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

      <View className="mt-6 gap-2">
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
