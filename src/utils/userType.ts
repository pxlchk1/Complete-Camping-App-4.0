import { useAuthStore } from "../state/authStore";

export type UserType = "guest" | "free" | "trial" | "premium";

export function useUserType(): UserType {
  const user = useAuthStore((state) => state.user);

  if (!user) return "guest";
  if (user.isPremium) return "premium";
  if (user.isTrial) return "trial";
  return "free";
}
