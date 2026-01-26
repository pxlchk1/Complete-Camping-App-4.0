import { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

/**
 * PrefillLocation - Used when creating a trip from a saved place
 * Allows pre-populating the destination from Favorites or Saved Places
 */
export interface PrefillLocation {
  source: "favorites" | "saved_places";
  placeType: "park" | "campground" | "custom";
  placeId: string | null;
  name: string;
  subtitle: string | null; // e.g., "State Park • Indiana" or address
  state: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export type RootStackParamList = {
  HomeTabs: undefined;
  Home: undefined;
  Learn: undefined;
  Plan: undefined;
  Connect: undefined;
  FirstAid: undefined;
  MyTrips: undefined;
  CreateTrip: { prefillLocation?: PrefillLocation } | undefined;
  TripDetail: { tripId: string; showItineraryPrompt?: boolean; destinationJustSet?: boolean };
  Parks: undefined;
  ParksBrowse: { selectedParkId?: string; tripId?: string; returnTo?: string } | undefined;
  ParkDetail: { parkId: string; tripId?: string; returnTo?: string };
  GearLists: undefined;
  GearListDetail: { listId: string };
  CreateGearList: { tripId?: string };
  Account: undefined;
  MyCampsite: { userId?: string; viewAsPublic?: boolean } | undefined;
  MyCampground: undefined;
  AddCamper: undefined;
  EditCamper: { contactId: string };
  AddPeopleToTrip: { tripId: string };
  Notifications: undefined;
  Settings: undefined;
  Auth: undefined;
  Paywall: { triggerKey?: string; variant?: "standard" | "nudge_trial" } | undefined;
  SeedData: undefined;

  // Gear Closet
  MyGearCloset: undefined;
  AddGear: undefined;
  EditGear: { gearId: string };
  GearDetail: { gearId: string };
  EditProfile: undefined;

  // Learning
  ModuleDetail: { moduleId: string };

  // Plan section with trip context
  MealPlan: { tripId: string };

  // Packing List screens (local-first store-based)
  PackingListCreate: { 
    tripId?: string; 
    tripName?: string;
    tripStartDate?: string;
    tripEndDate?: string;
    tripCampingStyle?: string;
    tripWinterCamping?: boolean;
    tripPackingSeasonOverride?: "winter" | "spring" | "summer" | "fall";
  } | undefined;
  PackingListEditor: { listId: string };
  MealPlanning: { tripId: string };
  ShoppingList: { tripId: string };
  AddMeal: { tripId: string; category?: "breakfast" | "lunch" | "dinner" | "snack" };
  MealLibrary: { tripId: string; category?: "breakfast" | "lunch" | "dinner" | "snack" };

  // Community screens
  Community: { initialTab?: "tips" | "connect" | "images" | "feedback" | "gear" };

  // Tips
  TipDetail: { tipId: string };
  CreateTip: undefined;
  TipsListScreen: undefined;

  // Gear Reviews
  GearReviewDetail: { reviewId: string };
  CreateGearReview: undefined;
  EditGearReview: { reviewId: string };
  SubmitGearReview: undefined;
  GearReviewsListScreen: { filterByTag?: string } | undefined;

  // Questions/Ask
  QuestionDetail: { questionId: string };
  CreateQuestion: undefined;
  AskQuestion: undefined;
  AskQuestionModal: undefined;
  ThreadDetail: { questionId: string };
  QuestionsListScreen: undefined;

  // Photos/Stories
  PhotoDetail: { storyId?: string; photoId?: string };
  UploadPhoto: undefined;
  PhotoComposer: { postType?: string };
  PhotosListScreen: undefined;

  // Feedback
  FeedbackDetail: { postId: string };
  CreateFeedback: undefined;
  FeedbackListScreen: undefined;

  // Admin screens
  AdminDashboard: undefined;
  AdminReports: undefined;
  AdminUsers: undefined;
  AdminSubscriptions: undefined;
  AdminPhotos: undefined;
  AdminContent: undefined;
  AdminBanned: undefined;
  AdminGatingReport: undefined;

  // Invitation
  AcceptInvitation: { invitationToken: string };
  AcceptInvite: { token: string };

  // Main tabs
  MainTabs: { screen: string; params?: any };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type MainTabParamList = {
  Home: undefined;
  Learn: undefined;
  Plan: undefined;
  Community: { initialTab?: "tips" | "connect" | "images" | "feedback" | "gear" };
  FirstAid: undefined;
  Profile: { screen?: string };
};

export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type MainTabRouteProp<T extends keyof MainTabParamList> = RouteProp<MainTabParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
