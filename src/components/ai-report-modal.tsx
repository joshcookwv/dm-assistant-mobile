import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
  submitAiReport,
  type AiOutputReportInput,
  type ReportCategory,
} from "@/lib/ai-reports";

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "offensive", label: "Offensive or hateful" },
  { value: "sexual", label: "Sexual content" },
  { value: "violence_self_harm", label: "Violence or self-harm" },
  { value: "deceptive_unsafe", label: "Deceptive or unsafe" },
  { value: "other", label: "Other" },
];

interface AiReportModalProps {
  visible: boolean;
  output: string;
  feature: AiOutputReportInput["feature"];
  model: string;
  onClose: () => void;
}

export function AiReportModal({
  visible,
  output,
  feature,
  model,
  onClose,
}: AiReportModalProps) {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setCategory(null);
    setComment("");
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!category || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitAiReport({ category, comment: comment.trim(), output, feature, model });
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't submit the report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/75"
      >
        <View className="max-h-[92%] rounded-t-3xl border-t border-panel-border bg-panel px-5 pb-8 pt-5">
          {submitted ? (
            <View className="gap-4 py-5">
              <Text className="text-center text-xl font-bold text-foreground">Report submitted</Text>
              <Text className="text-center text-sm leading-5 text-muted">
                Thank you. The flagged output will be reviewed and automatically deleted after 30 days.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleClose}
                className="min-h-12 items-center justify-center rounded-xl bg-accent px-4"
              >
                <Text className="font-bold text-accent-foreground">Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4">
              <View>
                <Text className="text-xl font-bold text-foreground">Report AI output</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Report only this generated output. Your original prompt is not included.
                </Text>
              </View>

              <View className="max-h-32 rounded-xl border border-panel-border bg-background p-3">
                <ScrollView nestedScrollEnabled>
                  <Text selectable className="text-sm leading-5 text-foreground">
                    {output}
                  </Text>
                </ScrollView>
              </View>

              <View className="gap-2">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  What is wrong with it?
                </Text>
                {CATEGORIES.map((item) => {
                  const selected = category === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setCategory(item.value)}
                      className={`min-h-11 flex-row items-center rounded-xl border px-3 ${
                        selected
                          ? "border-accent bg-accent-soft"
                          : "border-panel-border bg-panel-raised"
                      }`}
                    >
                      <View
                        className={`mr-3 h-4 w-4 rounded-full border ${
                          selected ? "border-accent bg-accent" : "border-muted"
                        }`}
                      />
                      <Text className="text-sm font-semibold text-foreground">{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={comment}
                onChangeText={setComment}
                maxLength={1_000}
                multiline
                placeholder="Optional context for this report"
                placeholderTextColor={Colors.muted}
                className="min-h-24 rounded-xl border border-panel-border bg-background p-3 text-sm text-foreground"
                textAlignVertical="top"
              />

              <Text className="text-xs leading-4 text-muted">
                The flagged output, category, optional comment, feature, model, timestamp, and a
                protected customer identifier are stored securely for 30 days.
              </Text>
              {error && <Text className="text-sm text-danger">{error}</Text>}

              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClose}
                  disabled={submitting}
                  className="min-h-12 flex-1 items-center justify-center rounded-xl border border-panel-border"
                >
                  <Text className="font-semibold text-foreground">Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSubmit}
                  disabled={!category || submitting}
                  className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-accent disabled:opacity-40"
                >
                  {submitting && (
                    <ActivityIndicator size="small" color={Colors.accentForeground} />
                  )}
                  <Text className="ml-2 font-bold text-accent-foreground">Submit report</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
