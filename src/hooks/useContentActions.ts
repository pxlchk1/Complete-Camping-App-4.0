/**
 * useContentActions Hook
 * 
 * Provides all necessary data and callbacks for ContentActionsAffordance.
 * Handles user permissions, role detection, and action routing.
 */

import { useCallback, useMemo } from "react";
import { useCurrentUser } from "../state/userStore";
import { isAdmin, isModerator, canModerateContent } from "../services/userService";
import { 
  ownerDeleteContent, 
  adminRemoveContent, 
  moderatorRemoveContent,
  deleteComment,
  ContentActionResult,
} from "../services/contentActionsService";
import { ContentItemType, RoleLabel } from "../components/contentActions";
import { User } from "../types/user";

export interface UseContentActionsOptions {
  itemId: string;
  itemType: ContentItemType;
  createdByUserId: string;
  /** Called after successful delete (for UI updates like removing from list) */
  onDeleteSuccess?: () => void;
  /** Called after successful moderation remove */
  onRemoveSuccess?: () => void;
  /** For comments: parent content type */
  parentType?: "tip" | "feedback" | "question" | "photo";
  /** For comments: parent content ID */
  parentId?: string;
}

export interface UseContentActionsResult {
  /** Current user ID */
  currentUserId: string | undefined;
  /** Whether current user is the content owner */
  isOwner: boolean;
  /** Whether current user can moderate */
  canModerate: boolean;
  /** Role label for UI */
  roleLabel: RoleLabel;
  /** Handler for owner delete */
  handleDelete: () => Promise<void>;
  /** Handler for moderation remove */
  handleRemove: () => Promise<void>;
  /** Whether any actions are available */
  hasActions: boolean;
}

export function useContentActions({
  itemId,
  itemType,
  createdByUserId,
  onDeleteSuccess,
  onRemoveSuccess,
  parentType,
  parentId,
}: UseContentActionsOptions): UseContentActionsResult {
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?.id;

  // Compute permissions
  const isOwner = useMemo(() => {
    return Boolean(currentUserId && createdByUserId === currentUserId);
  }, [currentUserId, createdByUserId]);

  const canModerate = useMemo(() => {
    if (!currentUser) return false;
    return canModerateContent(currentUser as User);
  }, [currentUser]);

  const roleLabel = useMemo((): RoleLabel => {
    if (!currentUser) return null;
    if (isAdmin(currentUser as User)) return "ADMIN";
    if (isModerator(currentUser as User)) return "MOD";
    return null;
  }, [currentUser]);

  const hasActions = useMemo(() => {
    return isOwner || (canModerate && !isOwner);
  }, [isOwner, canModerate]);

  // Delete handler (for owner)
  const handleDelete = useCallback(async () => {
    if (!currentUserId || !isOwner) {
      throw new Error("Not authorized to delete");
    }

    let result: ContentActionResult;

    // Handle comments specially (they're in subcollections)
    if (itemType === "comment" || itemType === "answer") {
      if (!parentType || !parentId) {
        throw new Error("Parent info required for comment deletion");
      }
      result = await deleteComment(parentType, parentId, itemId, "owner");
    } else {
      result = await ownerDeleteContent(itemType, itemId);
    }

    if (!result.success) {
      throw new Error(result.error || "Delete failed");
    }

    onDeleteSuccess?.();
  }, [currentUserId, isOwner, itemType, itemId, parentType, parentId, onDeleteSuccess]);

  // Remove handler (for moderators)
  const handleRemove = useCallback(async () => {
    if (!currentUserId || !canModerate) {
      throw new Error("Not authorized to remove");
    }

    let result: ContentActionResult;

    // Determine if admin or moderator
    const isAdminUser = currentUser && isAdmin(currentUser as User);

    // Handle comments specially
    if (itemType === "comment" || itemType === "answer") {
      if (!parentType || !parentId) {
        throw new Error("Parent info required for comment removal");
      }
      result = await deleteComment(
        parentType, 
        parentId, 
        itemId, 
        isAdminUser ? "admin" : "moderator"
      );
    } else {
      result = isAdminUser
        ? await adminRemoveContent(itemType, itemId)
        : await moderatorRemoveContent(itemType, itemId);
    }

    if (!result.success) {
      throw new Error(result.error || "Remove failed");
    }

    onRemoveSuccess?.();
  }, [currentUserId, canModerate, currentUser, itemType, itemId, parentType, parentId, onRemoveSuccess]);

  return {
    currentUserId,
    isOwner,
    canModerate,
    roleLabel,
    handleDelete,
    handleRemove,
    hasActions,
  };
}

export default useContentActions;
