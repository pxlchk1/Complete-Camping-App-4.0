import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingState } from '../types/onboarding';

const ONBOARDING_STORAGE_KEY = '@onboarding_seen_screens';

export const getOnboardingState = async (): Promise<OnboardingState> => {
  try {
    const state = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    return state ? JSON.parse(state) : {};
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return {};
  }
};

export const markScreenAsSeen = async (screenName: string): Promise<void> => {
  try {
    const currentState = await getOnboardingState();
    const newState = { ...currentState, [screenName]: true };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
};

export const hasSeenScreen = async (screenName: string): Promise<boolean> => {
  const state = await getOnboardingState();
  return state[screenName] === true;
};

export const resetOnboardingState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting onboarding state:', error);
  }
};
