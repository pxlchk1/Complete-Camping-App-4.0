import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEEP_FOREST, PARCHMENT } from "../constants/colors";

interface EditNotesModalProps {
  visible: boolean;
  initialValue: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}

export default function EditNotesModal({ visible, initialValue, onSave, onClose }: EditNotesModalProps) {
  const [notes, setNotes] = useState(initialValue);

  // Reset notes when modal opens
  React.useEffect(() => {
    setNotes(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
        {/* Header - Deep Forest Green background */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Edit notes</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={PARCHMENT} />
            </Pressable>
          </View>
        </View>
        
        <View style={styles.content}>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes (day-by-day plans, reminders, permit info…)"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn} accessibilityLabel="Cancel">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onSave(notes.trim());
                onClose();
              }}
              style={styles.saveBtn}
              accessibilityLabel="Save notes"
              disabled={notes.trim() === initialValue.trim()}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: DEEP_FOREST,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "Raleway_700Bold",
    fontSize: 24,
    color: PARCHMENT,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5D6C2",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#3D2817",
    minHeight: 90,
    marginBottom: 18,
    backgroundColor: "#f9f6f2",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cancelBtn: {
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: "#bfae9b",
    fontSize: 15,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3D2817",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
    marginLeft: 6,
    fontWeight: "600",
  },
});
