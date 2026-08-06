import { useEffect, useState } from "react";
import { Animated, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";

/** Brief confirmation banner shown after a successful save. */
export function SaveToast({
  visible,
  message = "Saved",
  onHide,
}: {
  visible: boolean;
  message?: string;
  onHide: () => void;
}) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onHide();
    });
    return () => animation.stop();
    // Callers commonly pass an inline onHide callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", top: 12, left: 16, right: 16, zIndex: 50, opacity }}
    >
      <View className="flex-row items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-panel-raised px-4 py-3 shadow-lg">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
          <AppIcon name="check" size={16} color="#1d120b" />
        </View>
        <Text className="text-sm font-bold text-foreground">{message}</Text>
      </View>
    </Animated.View>
  );
}
