/**
 * ContentActionsMenu Component
 * 
 * Connect-only actions: This component handles Edit/Delete for owners and Remove for admins/mods.
 * ONLY use this component for Connect section content (Questions, Tips, Comments, Answers).
 * Do NOT reuse for Trips, Parks, Reviews, or other non-Connect content.
 * 
 * Displays a kebab (⋯) menu for content actions:
 * - Owner: Edit / Delete
 * - Admin/Moderator: Remove
 * 
 * Used across all Connect UGC cards, rows, and comments for consistent action handling.
 */

import React, { useState, useCallback, useMemo } from "react";
import { View, Pressable, Text, Modal, ActionSheetIOS, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useToast } from "../ToastManager";
import {
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
} from "../../constants/colors";

export type ContentItemType = 
  | "comment" 
  | "question" 
  | "tip" 
  | "photo" 
  | "review" 
  | "tripPost" 
  | "feedback"
  | "answer"
  | "other";

export type RoleLabel = "ADMIN" | "MOD" | null;

export interface ConfirmCopy {
  deleteTitle?: string;
  deleteBody?: string;
  deleteConfirm?: string;
  removeTitle?: string;
  removeBody?: string;
  removeConfirm?: string;
}

export interface ContentActionsMenuProps {
  /** Unique ID of the content item */
  itemId: string;
  /** Type of content for analytics and action routing */
  itemType: ContentItemType;
  /** User ID who created this content */
  createdByUserId: string;
  /** Current logged-in user ID */
  currentUserId: string | undefined;
  /** Whether current user can moderate content */
  canModerate: boolean;
  /** Label for moderation role (used in action naming) */
  roleLabel: RoleLabel;
  /** Callback when Edit is requested */
  onRequestEdit?: () => void;
  /** Callback when owner Delete is requested */
  onRequestDelete?: () => Promise<void>;
  /** Callback when moderation Remove is requested */
  onRequestRemove?: () => Promise<void>;
  /** Whether the content is already deleted */
  isDeleted?: boolean;
  /** Hide completely when user has no actions (default: true) */
  hideWhenNotAllowed?: boolean;
  /** Override confirmation copy */
  confirmCopy?: ConfirmCopy;
  /** Analytics tag for tracking */
  analyticsTag?: string;
  /** Icon size (default: 20) */
  iconSize?: number;
  /** Icon color override */
  iconColor?: string;
}

const DEFAULT_CONFIRM_COPY: Required<ConfirmCopy> = {
  deleteTitle: "Delete This?",
  deleteBody: "This can't be undone.",
  deleteConfirm: "Delete",
  removeTitle: "Remove This?",
  removeBody: "This removes it for everyone. This can't be undone.",
  removeConfirm: "Remove",
};

export function ContentActionsMenu({
  itemId,
  itemType,
  createdByUserId,
  currentUserId,
  canModerate,
  roleLabel,
  onRequestEdit,
  onRequestDelete,
  onRequestRemove,
  isDeleted = false,
  hideWhenNotAllowed = true,
  confirmCopy,
  analyticsTag,
  iconSize = 20,
  iconColor,
}: ContentActionsMenuProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // Compute permissions
  const isOwner = Boolean(currentUserId && createdByUserId === currentUserId);
  const canShowOwnerActions = isOwner && (onRequestEdit || onRequestDelete);
  const canShowModActions = canModerate && !isOwner && onRequestRemove;
  const hasAnyActions = canShowOwnerActions || canShowModActions;

  // Memoize copy to prevent dependency changes on every render
  const copy = useMemo(
    () => ({ ...DEFAULT_CONFIRM_COPY, ...confirmCopy }),
    [confirmCopy]
  );

  const confirmDelete = useCallback(() => {
    Alert.alert(
      copy.deleteTitle,
      copy.deleteBody,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: copy.deleteConfirm,
          style: "destructive",
          onPress: async () => {
            if (!onRequestDelete) return;
            setLoading(true);
            try {
              await onRequestDelete();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess("Deleted");
            } catch (error) {
              console.error(`[ContentActions] Delete failed for ${itemType}:${itemId}`, error);
              showError("Failed to delete");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [onRequestDelete, copy, itemType, itemId, showSuccess, showError]);

  const confirmRemove = useCallback(() => {
    Alert.alert(
      copy.removeTitle,
      copy.removeBody,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: copy.removeConfirm,
          style: "destructive",
          onPress: async () => {
            if (!onRequestRemove) return;
            setLoading(true);
            try {
              await onRequestRemove();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess("Removed");
            } catch (error) {
              console.error(`[ContentActions] Remove failed for ${itemType}:${itemId}`, error);
              showError("Failed to remove");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [onRequestRemove, copy, itemType, itemId, showSuccess, showError]);

  const handleEdit = useCallback(() => {
    setShowModal(false);
    onRequestEdit?.();
  }, [onRequestEdit]);

  const handleDeletePress = useCallback(() => {
    setShowModal(false);
    confirmDelete();
  }, [confirmDelete]);

  const handleRemovePress = useCallback(() => {
    setShowModal(false);
    confirmRemove();
  }, [confirmRemove]);

  const handleOpenMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === "ios") {
      // Use native ActionSheet on iOS
      const options: string[] = [];
      const destructiveIndex: number[] = [];
      let cancelIndex = 0;

      if (isOwner) {
        if (onRequestEdit) {
          options.push("Edit");
        }
        if (onRequestDelete) {
          options.push("Delete");
          destructiveIndex.push(options.length - 1);
        }
      } else if (canModerate && onRequestRemove) {
        const removeLabel = roleLabel === "ADMIN" ? "Remove (Admin)" : "Remove (Moderator)";
        options.push(removeLabel);
        destructiveIndex.push(options.length - 1);
      }

      options.push("Cancel");
      cancelIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex.length > 0 ? destructiveIndex[0] : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelIndex) return;

          if (isOwner) {
            let currentIndex = 0;
            if (onRequestEdit) {
              if (buttonIndex === currentIndex) {
                onRequestEdit();
                return;
              }
              currentIndex++;
            }
            if (onRequestDelete && buttonIndex === currentIndex) {
              confirmDelete();
            }
          } else if (canModerate && onRequestRemove && buttonIndex === 0) {
            confirmRemove();
          }
        }
      );
    } else {
      // Use modal on Android
      setShowModal(true);
    }
  }, [isOwner, canModerate, onRequestEdit, onRequestDelete, onRequestRemove, roleLabel, confirmDelete, confirmRemove]);

  // Don't render if deleted or no actions available
  if (isDeleted) return null;
  if (!hasAnyActions && hideWhenNotAllowed) return null;
  if (!hasAnyActions) return null;

  return (
    <>
      <Pressable
        onPress={handleOpenMenu}
        disabled={loading}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="p-1 rounded-full active:opacity-70"
        style={{ opacity: loading ? 0.5 : 1 }}
        accessibilityLabel="More options"
        accessibilityRole="button"
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={iconSize}
          color={iconColor || TEXT_SECONDARY}
        />
      </Pressable>

      {/* Android Modal Menu */}
      {Platform.OS === "android" && (
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setShowModal(false)}
          >
            <View
              className="rounded-t-3xl p-5 pb-8"
              style={{ backgroundColor: PARCHMENT }}
            >
              {isOwner ? (
                <>
                  {onRequestEdit && (
                    <Pressable
                      onPress={handleEdit}
                      className="flex-row items-center py-4 px-2 border-b"
                      style={{ borderColor: BORDER_SOFT }}
                    >
                      <Ionicons name="pencil-outline" size={22} color={TEXT_PRIMARY_STRONG} />
                      <Text
                        className="ml-4 text-base"
                        style={{ fontFamily: "SourceSans3_500Medium", color: TEXT_PRIMARY_STRONG }}
                      >
                        Edit
                      </Text>
                    </Pressable>
                  )}
                  {onRequestDelete && (
                    <Pressable
                      onPress={handleDeletePress}
                      className="flex-row items-center py-4 px-2"
                    >
                      <Ionicons name="trash-outline" size={22} color="#DC2626" />
                      <Text
                        className="ml-4 text-base"
                        style={{ fontFamily: "SourceSans3_500Medium", color: "#DC2626" }}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  )}
                </>
              ) : canModerate && onRequestRemove ? (
                <Pressable
                  onPress={handleRemovePress}
                  className="flex-row items-center py-4 px-2"
                >
                  <Ionicons name="trash-outline" size={22} color="#DC2626" />
                  <Text
                    className="ml-4 text-base"
                    style={{ fontFamily: "SourceSans3_500Medium", color: "#DC2626" }}
                  >
                    {roleLabel === "ADMIN" ? "Remove (Admin)" : "Remove (Moderator)"}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => setShowModal(false)}
                className="mt-4 py-3 rounded-xl items-center border"
                style={{ borderColor: BORDER_SOFT }}
              >
                <Text
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

export default ContentActionsMenu;
