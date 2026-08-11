import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { AppIcon } from "@/components/app-icon";
import { PrimaryButton, SecondaryButton } from "@/components/primary-button";
import { Colors } from "@/constants/colors";
import { PRO_FEATURES } from "@/lib/access-policy";
import {
  customerHasPro,
  getProOfferings,
  purchaseProPackage,
  restoreProPurchases,
} from "@/lib/purchases";
import { useProAccess } from "@/providers/pro-access";

function purchaseErrorMessage(error: unknown): string | null {
  if (typeof error === "object" && error && "userCancelled" in error && error.userCancelled) {
    return null;
  }
  return error instanceof Error ? error.message : "Couldn't complete that purchase. Try again.";
}

export default function ProScreen() {
  const { isPro, configured, loading: accessLoading, refresh } = useProAccess();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    setError(null);
    try {
      const offerings = await getProOfferings();
      setPackages(offerings?.current?.availablePackages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load purchase options.");
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPackages();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadPackages]);

  async function handlePurchase(aPackage: PurchasesPackage) {
    setBusyPackage(aPackage.identifier);
    setError(null);
    setMessage(null);
    try {
      const customerInfo = await purchaseProPackage(aPackage);
      await refresh();
      if (customerHasPro(customerInfo)) {
        setMessage("Infernal Codex Pro is active.");
      } else {
        setError("The purchase completed, but Pro access has not appeared yet. Try Restore Purchases.");
      }
    } catch (err) {
      setError(purchaseErrorMessage(err));
    } finally {
      setBusyPackage(null);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    setMessage(null);
    try {
      const customerInfo = await restoreProPurchases();
      await refresh();
      if (customerHasPro(customerInfo)) {
        setMessage("Purchases restored. Infernal Codex Pro is active.");
      } else {
        setMessage("No active Infernal Codex Pro purchase was found for this store account.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't restore purchases. Try again.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 p-4 pb-10">
      <View className="items-center rounded-3xl border border-accent/40 bg-panel px-5 py-7">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <AppIcon name="sparkles" size={28} color={Colors.accentBright} />
        </View>
        <Text className="mt-4 text-center text-2xl font-bold text-foreground">Infernal Codex Pro</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          Build without campaign limits and use the shared AI tools without managing your own API key.
        </Text>
        {accessLoading ? (
          <ActivityIndicator className="mt-4" color={Colors.accentBright} />
        ) : (
          <View className={`mt-4 rounded-full px-3 py-1.5 ${isPro ? "bg-green-500/15" : "bg-panel-raised"}`}>
            <Text className={`text-xs font-bold ${isPro ? "text-green-400" : "text-muted"}`}>
              {isPro ? "PRO ACTIVE" : "FREE PLAN"}
            </Text>
          </View>
        )}
      </View>

      <View className="gap-3 rounded-2xl border border-panel-border bg-panel p-5">
        {PRO_FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
              <AppIcon name="check" size={15} color={Colors.accentBright} />
            </View>
            <Text className="flex-1 text-sm text-foreground">{feature}</Text>
          </View>
        ))}
      </View>

      {!isPro && (
        <View className="gap-3">
          {loadingPackages ? (
            <View className="items-center py-5">
              <ActivityIndicator color={Colors.accentBright} />
              <Text className="mt-2 text-sm text-muted">Loading purchase options...</Text>
            </View>
          ) : packages.length > 0 ? (
            packages.map((aPackage) => (
              <Pressable
                key={aPackage.identifier}
                onPress={() => handlePurchase(aPackage)}
                disabled={busyPackage !== null || restoring}
                className="flex-row items-center justify-between rounded-2xl border border-panel-border bg-panel px-4 py-4 active:bg-panel-raised disabled:opacity-50"
              >
                <View className="flex-1 pr-3">
                  <Text className="font-bold text-foreground">{aPackage.product.title}</Text>
                  {!!aPackage.product.description && (
                    <Text className="mt-1 text-xs leading-4 text-muted">{aPackage.product.description}</Text>
                  )}
                </View>
                <Text className="font-bold text-accent-bright">
                  {busyPackage === aPackage.identifier ? "Working..." : aPackage.product.priceString}
                </Text>
              </Pressable>
            ))
          ) : (
            <View className="rounded-2xl border border-panel-border bg-panel p-4">
              <Text className="text-sm font-semibold text-foreground">Purchase options are not available yet.</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                {configured
                  ? "The store returned no products for the current offering."
                  : "This build is missing its RevenueCat public configuration."}
              </Text>
            </View>
          )}

          <SecondaryButton
            label={restoring ? "Restoring..." : "Restore Purchases"}
            icon="clock"
            onPress={handleRestore}
            disabled={restoring || busyPackage !== null || !configured}
          />
        </View>
      )}

      {isPro && (
        <PrimaryButton label="Pro is active" icon="check" onPress={() => undefined} disabled />
      )}
      {message && <Text className="text-center text-sm text-green-400">{message}</Text>}
      {error && <Text className="text-center text-sm text-red-400">{error}</Text>}
      <Text className="text-center text-xs leading-5 text-muted">
        Purchases are handled by Google Play. Existing campaigns are never deleted if Pro expires.
      </Text>
    </ScrollView>
  );
}
