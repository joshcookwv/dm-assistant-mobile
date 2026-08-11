import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { setSetting } from "@/lib/settings";

interface Slide {
  icon: AppIconName | "logo";
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "logo",
    title: "Welcome",
    body: "Everything you need to run a session lives here — rules, NPCs, monsters, maps, and combat — all on your device, no internet required once it's set up.",
  },
  {
    icon: "npcs",
    title: "NPCs & Notes",
    body: "Track every NPC's name, role, and location, and keep searchable campaign notes. Infernal Codex Pro can suggest NPC names and descriptions when you need a starting point.",
  },
  {
    icon: "monsters",
    title: "Monsters & Rules",
    body: "Official SRD creatures and your own homebrew live side by side, searchable by name or challenge rating. The Rules tab has the full offline 5e reference plus a combat quick-reference page.",
  },
  {
    icon: "session",
    title: "Campaign Sessions & Encounters",
    body: "Keep a persistent party roster in each campaign, log session recaps, and pull PCs into encounters for live initiative, HP, and condition tracking.",
  },
  {
    icon: "settings",
    title: "You're set up",
    body: "The free plan includes one campaign with no AI. Infernal Codex Pro unlocks unlimited campaigns and shared AI tools; Settings also has backup, restore, and this walkthrough.",
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  function finish() {
    setSetting("onboarding_completed", "1");
    router.replace("/");
  }

  function goTo(nextIndex: number) {
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-end px-5 pt-2">
        <Pressable onPress={finish} hitSlop={10} className="px-2 py-2">
          <Text className="text-sm font-semibold text-muted">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        className="flex-1"
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={{ width }} className="items-center justify-center px-8">
            <View className="mb-8 h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-accent/40 bg-panel-raised">
              {slide.icon === "logo" ? (
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={{ width: 96, height: 96 }}
                  resizeMode="contain"
                />
              ) : (
                <AppIcon name={slide.icon} size={52} color={Colors.accentBright} />
              )}
            </View>
            <Text className="text-center text-2xl font-bold text-foreground">{slide.title}</Text>
            <Text className="mt-3 text-center text-base leading-6 text-muted">{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="gap-6 px-8" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="flex-row justify-center gap-2">
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
              className={`h-2 rounded-full ${i === index ? "w-6 bg-accent" : "w-2 bg-panel-border"}`}
            />
          ))}
        </View>
        <Pressable
          onPress={() => (isLast ? finish() : goTo(index + 1))}
          className="items-center rounded-2xl bg-accent py-4 active:opacity-80"
        >
          <Text className="text-base font-bold text-accent-foreground">
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
