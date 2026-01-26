/**
 * ContentActionsAffordance Component
 * 
 * Connect-only actions: This component handles Edit/Delete for owners and Remove for admins/mods.
 * ONLY use this component for Connect section content (Questions, Tips, Comments, Answers).
 * Do NOT reuse for Trips, Parks, Reviews, or other non-Connect content.
 * 
 * Drop-in wrapper that positions both ContentActionsMenu (kebab) and ModerationChip
 * correctly in any card/row header. Single component to use everywhere for UGC actions.
 */

import React, { useCallback, useState } from "react";
import { View, StyleSheet, ActionSheetIOS, Platform, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { ContentActionsMenu, ContentItemType, ConfirmCopy } from "./ContentActionsMenu";
import { ModerationChip, ModerationRoleLabel } from "./ModerationChip";
import { useToast } from "../ToastManager";

export type LayoutVariant = "cardHeader" | "commentRow" | "compact";
export type AlignmentVariant = "topRight" | "inlineRight";

export interface ContentActionsAffordanceProps {
  /** Unique ID of the content item */
  itemId: string;
  /** Type of content */
  itemType: ContentItemType;
  /** User ID who created this content */
  createdByUserId: string;
  /** Current logged-in user ID */
  currentUserId: string | undefined;
  /** Whether current user can moderate content */
  canModerate: boolean;
  /** Label for moderation role */
  roleLabel: ModerationRoleLabel | null;
  /** Callback when Edit is requested */
  onRequestEdit?: () => void;
  /** Callback when owner Delete is requested */
  onRequestDelete?: () => Promise<void>;
  /** Callback when moderation Remove is requested */
  onRequestRemove?: () => Promise<void>;
  /** Whether the content is deleted */
  isDeleted?: boolean;
  /** Layout variant */
  layout?: LayoutVariant;
  /** Alignment variant */
  alignment?: AlignmentVariant;
  /** Override confirmation copy */
  confirmCopy?: ConfirmCopy;
  /** Analytics tag */
  analyticsTag?: string;
  /** Icon size for kebab */
  iconSize?: number;
  /** Icon color for kebab */
  iconColor?: string;
}

export function ContentActionsAffordance({
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
  layout = "cardHeader",
  alignment = "topRight",
  confirmCopy,
  analyticsTag,
  iconSize = 20,
  iconColor,
}: ContentActionsAffordanceProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);

  // Compute permissions
  const isOwner = Boolean(currentUserId && createdByUserId === currentUserId);
  const showModChip = canModerate && !isOwner && !isDeleted && roleLabel !== null;
  const hasOwnerActions = isOwner && (onRequestEdit || onRequestDelete);
  const hasModActions = canModerate && !isOwner && onRequestRemove;
  const hasAnyActions = hasOwnerActions || hasModActions;

  // Don't render anything if deleted or no actions
  if (isDeleted) return null;
  if (!hasAnyActions && !showModChip) return null;

  // Handle mod chip press - open moderation actions directly
  const handleModChipPress = useCallback(() => {
    if (!onRequestRemove) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const removeLabel = roleLabel === "ADMIN" ? "Remove (Admin)" : "Remove (Moderator)";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [removeLabel, "Cancel"],
          cancelButtonIndex: 1,
          destructiveButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            confirmRemove();
          }
        }
      );
    } else {
      confirmRemove();
    }
  }, [onRequestRemove, roleLabel]);

  const confirmRemove = useCallback(() => {
    const copy = {
      title: confirmCopy?.removeTitle || "Remove This?",
      body: confirmCopy?.removeBody || "This removes it for everyone. This can't be undone.",
      confirm: confirmCopy?.removeConfirm || "Remove",
    };

    Alert.alert(
      copy.title,
      copy.body,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: copy.confirm,
          style: "destructive",
          onPress: async () => {
            if (!onRequestRemove) return;
            setLoading(true);
            try {
              await onRequestRemove();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess("Removed");
            } catch (error) {
              console.error(`[ContentActionsAffordance] Remove failed for ${itemType}:${itemId}`, error);
              showError("Failed to remove");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [onRequestRemove, confirmCopy, itemType, itemId, showSuccess, showError]);

  // Determine layout styles
  const containerStyle = [
    styles.container,
    layout === "commentRow" && styles.commentRow,
    layout === "compact" && styles.compact,
  ];

  return (
    <View style={containerStyle}>
      {/* Mod chip appears first (left) in cardHeader layout */}
      {showModChip && roleLabel && (
        <ModerationChip
          visible={true}
          label={roleLabel}
          onPress={handleModChipPress}
          disabled={loading}
          size={layout === "compact" ? "small" : "small"}
        />
      )}

      {/* Kebab menu */}
      {hasAnyActions && (
        <ContentActionsMenu
          itemId={itemId}
          itemType={itemType}
          createdByUserId={createdByUserId}
          currentUserId={currentUserId}
          canModerate={canModerate}
          roleLabel={roleLabel}
          onRequestEdit={onRequestEdit}
          onRequestDelete={onRequestDelete}
          onRequestRemove={onRequestRemove}
          isDeleted={isDeleted}
          confirmCopy={confirmCopy}
          analyticsTag={analyticsTag}
          iconSize={iconSize}
          iconColor={iconColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentRow: {
    gap: 6,
  },
  compact: {
    gap: 4,
  },
});

export default ContentActionsAffordance;
