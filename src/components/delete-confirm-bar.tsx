import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";

const RED = "#f87171";
const RED_DARK = "#7f1d1d";
const RED_PANEL = "#2b1110";

export function DeleteButton({
  onPress,
  label = "Delete",
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.deleteTrigger, pressed && styles.deleteTriggerPressed]}
    >
      <AppIcon name="trash" size={17} color={RED} />
      <Text style={styles.deleteTriggerText}>{label}</Text>
    </Pressable>
  );
}

export function DeleteConfirmBar({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.confirmPanel}>
      <View style={styles.confirmMessage}>
        <View style={styles.warningIcon}>
          <AppIcon name="trash" size={17} color={RED} />
        </View>
        <View style={styles.messageCopy}>
          <Text style={styles.confirmTitle}>Are you sure?</Text>
          <Text style={styles.confirmLabel}>{label}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel deletion"
          style={({ pressed }) => [styles.confirmButton, styles.cancelButton, pressed && styles.cancelButtonPressed]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="Confirm deletion"
          style={({ pressed }) => [styles.confirmButton, styles.destructiveButton, pressed && styles.destructiveButtonPressed]}
        >
          <AppIcon name="trash" size={16} color="#ffffff" />
          <Text style={styles.destructiveText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteTrigger: {
    minHeight: 48,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#71322f",
    borderRadius: 12,
    backgroundColor: RED_PANEL,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteTriggerPressed: {
    backgroundColor: "#3a1715",
  },
  deleteTriggerText: {
    color: RED,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmPanel: {
    width: "100%",
    gap: 16,
    borderWidth: 1,
    borderColor: "#71322f",
    borderRadius: 16,
    backgroundColor: RED_PANEL,
    padding: 16,
  },
  confirmMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  warningIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#451a18",
  },
  messageCopy: {
    flex: 1,
  },
  confirmTitle: {
    color: Colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  confirmLabel: {
    marginTop: 2,
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  confirmButton: {
    minWidth: 0,
    minHeight: 48,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.panelBorder,
    backgroundColor: Colors.panelRaised,
  },
  cancelButtonPressed: {
    backgroundColor: Colors.panel,
  },
  cancelText: {
    color: Colors.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  destructiveButton: {
    backgroundColor: RED_DARK,
  },
  destructiveButtonPressed: {
    backgroundColor: "#991b1b",
  },
  destructiveText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
