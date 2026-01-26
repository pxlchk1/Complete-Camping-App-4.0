import { useState, useCallback } from "react";

/**
 * Shared hook for managing the Pro/Paywall modal state.
 * Use this in any screen to show/hide the Pro modal consistently.
 */
export function useProModal() {
  const [showProModal, setShowProModal] = useState(false);
  const openProModal = useCallback(() => setShowProModal(true), []);
  const closeProModal = useCallback(() => setShowProModal(false), []);
  return { showProModal, openProModal, closeProModal };
}
