import { useState } from "react";
import { Pressable, Text } from "react-native";

import { AiReportModal } from "@/components/ai-report-modal";
import type { AiOutputReportInput } from "@/lib/ai-reports";

interface AiReportActionProps {
  output: string;
  feature: AiOutputReportInput["feature"];
  model: string;
}

export function AiReportAction({ output, feature, model }: AiReportActionProps) {
  const [visible, setVisible] = useState(false);
  if (!output.trim()) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report AI output"
        onPress={() => setVisible(true)}
        hitSlop={8}
        className="self-start rounded-full border border-panel-border bg-panel-raised px-3 py-1.5"
      >
        <Text className="text-xs font-semibold text-muted">Report AI output</Text>
      </Pressable>
      <AiReportModal
        visible={visible}
        output={output}
        feature={feature}
        model={model}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
