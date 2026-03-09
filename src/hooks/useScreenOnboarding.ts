import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnboardingContext } from '../context/OnboardingContext';
import { getTooltipsForScreen } from '../config/onboardingTooltips';
import { OnboardingTooltip } from '../types/onboarding';

interface UseScreenOnboardingResult {
  showModal: boolean;
  currentTooltip: OnboardingTooltip | null;
  dismissModal: () => void;
  openModal: () => void;
  isLoading: boolean;
}

export const useScreenOnboarding = (screenName: string): UseScreenOnboardingResult => {
  const { hasSeenScreen, markAsSeen, isLoading: contextLoading } = useOnboardingContext();
  const [showModal, setShowModal] = useState(false);
  const [currentTooltip, setCurrentTooltip] = useState<OnboardingTooltip | null>(null);

  // Guard: track which screen has been auto-evaluated so we only run the
  // first-visit check once per component mount, preventing re-shows caused
  // by unstable effect dependencies or provider re-renders.
  const autoShowCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    if (contextLoading) return;

    const tooltips = getTooltipsForScreen(screenName);
    
    if (tooltips.length > 0) {
      setCurrentTooltip(tooltips[0]);
      
      // Only run auto-show logic once per screen per mount
      if (autoShowCheckedRef.current !== screenName) {
        autoShowCheckedRef.current = screenName;
        if (!hasSeenScreen(screenName)) {
          setShowModal(true);
        }
      }
    }
  }, [screenName, contextLoading, hasSeenScreen]);

  const dismissModal = useCallback(async () => {
    setShowModal(false);
    await markAsSeen(screenName);
  }, [screenName, markAsSeen]);

  const openModal = useCallback(() => {
    const tooltips = getTooltipsForScreen(screenName);
    if (tooltips.length > 0) {
      setCurrentTooltip(tooltips[0]);
      setShowModal(true);
    }
  }, [screenName]);

  return {
    showModal,
    currentTooltip,
    dismissModal,
    openModal,
    isLoading: contextLoading,
  };
};
