import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OnboardingState } from '../types/onboarding';
import { getOnboardingState, markScreenAsSeen, resetOnboardingState } from '../services/onboardingStorage';

interface OnboardingContextType {
  seenScreens: OnboardingState;
  hasSeenScreen: (screenName: string) => boolean;
  markAsSeen: (screenName: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [seenScreens, setSeenScreens] = useState<OnboardingState>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    const state = await getOnboardingState();
    setSeenScreens(state);
    setIsLoading(false);
  };

  const hasSeenScreen = (screenName: string): boolean => {
    return seenScreens[screenName] === true;
  };

  const markAsSeen = async (screenName: string): Promise<void> => {
    await markScreenAsSeen(screenName);
    setSeenScreens((prev) => ({ ...prev, [screenName]: true }));
  };

  const resetOnboarding = async (): Promise<void> => {
    await resetOnboardingState();
    setSeenScreens({});
  };

  return (
    <OnboardingContext.Provider
      value={{
        seenScreens,
        hasSeenScreen,
        markAsSeen,
        resetOnboarding,
        isLoading,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingContext = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};
