import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    if (contextLoading) return;

    const tooltips = getTooltipsForScreen(screenName);
    
    if (tooltips.length > 0) {
      setCurrentTooltip(tooltips[0]);
      
      // Only auto-show if user hasn't seen it
      if (!hasSeenScreen(screenName)) {
        setShowModal(true);
      }
    }
  }, [screenName, contextLoading, hasSeenScreen]);

  const dismissModal = async () => {
    setShowModal(false);
    await markAsSeen(screenName);
  };

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
