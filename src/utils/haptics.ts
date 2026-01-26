import * as Haptics from "expo-haptics";

export const hapticLight = () => {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const hapticMedium = () => {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const hapticHeavy = () => {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export const hapticSuccess = () => {
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

export const hapticWarning = () => {
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

export const hapticError = () => {
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

export const hapticSelection = () => {
  return Haptics.selectionAsync();
};
