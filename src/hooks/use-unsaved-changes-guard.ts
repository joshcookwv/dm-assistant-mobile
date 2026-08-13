import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";

/**
 * Confirms with the user before a screen with unsaved edits is popped. Covers the
 * Android hardware/gesture back button, the header back button, and swipe-to-go-back
 * alike, since all three route through the navigator's `beforeRemove` event.
 *
 * Returns `allowLeave()` — call it synchronously right before a programmatic
 * navigation that follows a successful save/delete, so that navigation isn't
 * mistaken for the very edit it's leaving behind (the `hasUnsavedChanges` prop
 * is only current as of the last render, which is too stale for this).
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean, message: string) {
  const navigation = useNavigation();
  const dirtyRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    dirtyRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (!dirtyRef.current) return;
        e.preventDefault();
        Alert.alert("Discard changes?", message, [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
        ]);
      }),
    [navigation, message]
  );

  return function allowLeave() {
    dirtyRef.current = false;
  };
}
