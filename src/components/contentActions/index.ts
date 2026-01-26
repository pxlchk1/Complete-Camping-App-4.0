/**
 * Content Actions Components
 * 
 * Reusable UGC action components for consistent edit/delete/moderation across the app.
 * 
 * Usage:
 * ```tsx
 * import { ContentActionsAffordance } from "@/components/contentActions";
 * 
 * <ContentActionsAffordance
 *   itemId={post.id}
 *   itemType="feedback"
 *   createdByUserId={post.authorId}
 *   currentUserId={currentUser?.id}
 *   canModerate={canModerateContent(currentUser)}
 *   roleLabel={isAdmin(currentUser) ? "ADMIN" : isModerator(currentUser) ? "MOD" : null}
 *   onRequestEdit={() => navigation.navigate("EditFeedback", { postId: post.id })}
 *   onRequestDelete={handleDelete}
 *   onRequestRemove={handleModRemove}
 * />
 * ```
 */

export { ContentActionsMenu } from "./ContentActionsMenu";
export type { 
  ContentActionsMenuProps, 
  ContentItemType, 
  RoleLabel,
  ConfirmCopy,
} from "./ContentActionsMenu";

export { ModerationChip } from "./ModerationChip";
export type { 
  ModerationChipProps, 
  ModerationRoleLabel,
} from "./ModerationChip";

export { ContentActionsAffordance } from "./ContentActionsAffordance";
export type { 
  ContentActionsAffordanceProps,
  LayoutVariant,
  AlignmentVariant,
} from "./ContentActionsAffordance";
