export interface OnboardingTooltip {
  id: string;
  screenName: string;
  title: string;
  message: string;
  order: number;
}

export interface OnboardingState {
  [screenName: string]: boolean; // true = user has seen the onboarding for this screen
}
