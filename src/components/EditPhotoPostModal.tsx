/**
 * EditPhotoPostModal Component
 * 
 * Modal for photo post owners to edit caption and tags.
 * Only the owner can trigger this modal (enforced by parent screen).
 */

import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEEP_FOREST, PARCHMENT, TEXT_PRIMARY_STRONG, TEXT_SECONDARY, BORDER_SOFT } from "../constants/colors";
import { updatePhotoPost } from "../services/photoPostsService";
import { PhotoPost } from "../types/photoPost";

interface EditPhotoPostModalProps {
  visible: boolean;
  photoPost: PhotoPost | null;
  onSave: (updatedPost: PhotoPost) => void;
  onClose: () => void;
}

export default function EditPhotoPostModal({ visible, photoPost, onSave, onClose }: EditPhotoPostModalProps) {
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible && photoPost) {
      setCaption(photoPost.caption || "");
    }
  }, [visible, photoPost]);

  const handleSave = async () => {
    if (!photoPost) return;
    
    setSaving(true);
    try {
      // Only update allowed fields: caption
      await updatePhotoPost(photoPost.id, {
        caption: caption.trim(),
      });
      
      // Return updated post to parent
      const updatedPost: PhotoPost = {
        ...photoPost,
        caption: caption.trim(),
      };
      onSave(updatedPost);
      onClose();
    } catch (error) {
      console.error("[EditPhotoPostModal] Save failed:", error);
      Alert.alert(
        "Update Failed",
        "Could not save your changes. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSaving(false);
    }
  };

  if (!photoPost) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Edit Photo Post</Text>
            <Pressable onPress={onClose} style={styles.closeButton} disabled={saving}>
              <Ionicons name="close" size={20} color={PARCHMENT} />
            </Pressable>
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
            placeholder="Describe your photo..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoFocus
            editable={!saving}
          />
          
          <View style={styles.actions}>
            <Pressable 
              onPress={onClose} 
              style={styles.cancelBtn} 
              accessibilityLabel="Cancel"
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              accessibilityLabel="Save changes"
              disabled={saving || caption.trim() === (photoPost.caption || "").trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveText}>Save</Text>
                </>
              )}
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
  label: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 8,
    padding: 12,
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: TEXT_PRIMARY_STRONG,
    backgroundColor: "#fff",
    minHeight: 150,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: "#fff",
  },
  cancelText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: DEEP_FOREST,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});
