/**
 * Edit Profile Screen
 * Allows users to edit their profile information including:
 * - About section
 * - Favorite camping style
 * - Favorite gear
 * - Profile photo
 * - Cover photo
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Switch,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../config/firebase";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useCurrentUser, useUserStore } from "../state/userStore";
import ModalHeader from "../components/ModalHeader";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";
import { CampingStyle } from "../types/camping";
import { GearCategory, GEAR_CATEGORIES } from "../types/gear";

const CAMPING_STYLES: { value: CampingStyle; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "CAR_CAMPING", label: "Car camping", icon: "car-outline" },
  { value: "BACKPACKING", label: "Backpacking", icon: "bag-outline" },
  { value: "RV", label: "RV camping", icon: "bus-outline" },
  { value: "HAMMOCK", label: "Hammock camping", icon: "leaf-outline" },
  { value: "ROOFTOP_TENT", label: "Roof-top tent", icon: "triangle-outline" },
  { value: "OVERLANDING", label: "Overlanding", icon: "compass-outline" },
  { value: "BOAT_CANOE", label: "Boat or canoe", icon: "boat-outline" },
  { value: "BIKEPACKING", label: "Bikepacking", icon: "bicycle-outline" },
  { value: "WINTER", label: "Winter camping", icon: "snow-outline" },
  { value: "DISPERSED", label: "Dispersed camping", icon: "map-outline" },
];

const GEAR_ICONS: Partial<Record<GearCategory, keyof typeof Ionicons.glyphMap>> = {
  shelter: "home-outline",
  sleep: "bed-outline",
  kitchen: "restaurant-outline",
  clothing: "shirt-outline",
  lighting: "flashlight-outline",
  water: "water-outline",
  tools: "hammer-outline",
  safety: "medkit-outline",
  camp_comfort: "happy-outline",
  campFurniture: "easel-outline",
  electronics: "phone-portrait-outline",
  hygiene: "sparkles-outline",
  documents_essentials: "document-outline",
  optional_extras: "gift-outline",
  seating: "resize-outline",
};

// Reserved handles that cannot be used by regular users
const RESERVED_HANDLES = [
  // Brand and product
  "tentandlantern",
  "tentlantern",
  "tentandlanternapp",
  "completecampingapp",
  "completecamping",
  "thecompletecampingapp",
  "tentandlanternofficial",
  "tentandlanternhq",
  "tentandlanternteam",
  "tentandlanternsupport",

  // Variants people will try
  "tent_and_lantern",
  "tent_lantern",
  "complete_camping_app",
  "complete_camping",
  "camping_app",
  "campingapp",

  // Staff and authority impersonation
  "admin",
  "administrator",
  "root",
  "owner",
  "moderator",
  "mod",
  "staff",
  "team",
  "official",
  "support",
  "help",
  "security",
  "trust",
  "trustandsafety",
  "safety",
  "billing",
  "payments",
  "payment",
  "refund",
  "refunds",
  "subscriptions",
  "subscription",
  "premium",
  "pro",
  "plus",
  "developer",
  "dev",

  // App navigation and core features
  "plan",
  "trips",
  "trip",
  "newtrip",
  "packing",
  "packinglist",
  "packinglists",
  "gear",
  "gearcloset",
  "mygear",
  "meal",
  "meals",
  "mealplan",
  "mealplans",
  "shopping",
  "shoppinglist",
  "parks",
  "park",
  "campground",
  "campgrounds",
  "itinerary",
  "itinerarylinks",
  "links",
  "weather",
  "learn",
  "skills",
  "leavenotrace",
  "lnt",
  "connect",
  "community",
  "askacamper",
  "campfire",
  "mycampsite",
  "campsite",
  "profile",
  "account",
  "settings",
  "notifications",
  "favorites",
  "favorite",

  // System and technical words that cause confusion
  "api",
  "app",
  "system",
  "null",
  "undefined",
  "test",
  "tester",
  "demo",
  "staging",
  "production",
  "prod",
  "beta",
  "qa",

  // Messaging and contact
  "email",
  "mail",
  "sms",
  "text",
  "contact",
  "press",
  "media",
  "partnerships",
  "partners",

  // Avoid platform brand impersonation
  "apple",
  "appstore",
  "google",
  "android",
  "ios",
  "firebase",
  "revenuecat",
];

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const currentUser = useCurrentUser();
  const updateCurrentUser = useUserStore((s) => s.updateCurrentUser);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form state
  const [about, setAbout] = useState(currentUser?.about || "");
  const [favoriteCampingStyle, setFavoriteCampingStyle] = useState<CampingStyle | undefined>(
    currentUser?.favoriteCampingStyle as CampingStyle | undefined
  );
  const [favoriteGear, setFavoriteGear] = useState<Record<GearCategory, string>>(
    (currentUser?.favoriteGear as Record<GearCategory, string>) || {} as Record<GearCategory, string>
  );
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL);
  const [coverPhotoURL, setCoverPhotoURL] = useState(currentUser?.coverPhotoURL);

  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Danger Zone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [optOutNewsletter, setOptOutNewsletter] = useState(currentUser?.emailSubscribed === false);
  const [optOutNotifications, setOptOutNotifications] = useState(currentUser?.notificationsEnabled === false);
  
  // Privacy state - default to public (true)
  const [isProfileContentPublic, setIsProfileContentPublic] = useState(
    currentUser?.isProfileContentPublic !== false
  );

  // Account fields state
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Load account fields from users collection
  useEffect(() => {
    const loadAccountFields = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || "");
          setHandle(data.handle || "");
        }
      } catch (error) {
        console.error("[EditProfile] Error loading account fields:", error);
      }
    };

    loadAccountFields();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // Validate display name
    if (!displayName.trim()) {
      Alert.alert("Required Field", "Please enter a display name");
      return;
    }

    if (displayName.length < 1 || displayName.length > 50) {
      Alert.alert("Invalid Name", "Display name must be between 1 and 50 characters");
      return;
    }

    // Validate handle
    if (!handle.trim()) {
      Alert.alert("Required Field", "Please enter a handle");
      return;
    }

    const cleanHandle = handle.trim().toLowerCase();

    if (cleanHandle.length < 3 || cleanHandle.length > 30) {
      Alert.alert("Invalid Handle", "Handle must be between 3 and 30 characters");
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleanHandle)) {
      Alert.alert("Invalid Handle", "Handle can only contain lowercase letters, numbers, hyphens, and underscores");
      return;
    }

    // Check reserved handles (allow admin email to use reserved handles)
    const isAdminEmail = user.email?.toLowerCase() === "alana@tentandlantern.com";
    if (RESERVED_HANDLES.includes(cleanHandle) && !isAdminEmail) {
      Alert.alert("Reserved Handle", "This handle is reserved. Please choose a different one.");
      return;
    }

    try {
      setSaving(true);

      // Update users collection with account fields
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        handle: cleanHandle,
        updatedAt: serverTimestamp(),
      });

      // Update profiles collection with correct field names
      const profileRef = doc(db, "profiles", user.uid);
      
      // Filter out empty gear entries
      const gearToSave = Object.entries(favoriteGear).reduce((acc, [key, value]) => {
        if (value && value.trim()) {
          acc[key] = value.trim();
        }
        return acc;
      }, {} as Record<string, string>);
      
      await updateDoc(profileRef, {
        about: about.trim() || null,
        favoriteCampingStyle: favoriteCampingStyle || null,
        favoriteGear: Object.keys(gearToSave).length > 0 ? gearToSave : null,
        avatarUrl: photoURL || null,
        backgroundUrl: coverPhotoURL || null,
        updatedAt: serverTimestamp(),
      });

      // Update local store (keeping photoURL/coverPhotoURL for backward compatibility)
      updateCurrentUser({
        displayName: displayName.trim(),
        handle: cleanHandle,
        about: about.trim() || undefined,
        favoriteCampingStyle: favoriteCampingStyle || undefined,
        favoriteGear: Object.keys(gearToSave).length > 0 ? gearToSave : undefined,
        photoURL: photoURL || undefined,
        coverPhotoURL: coverPhotoURL || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("[EditProfile] Error saving:", error);
      if (error.code === "permission-denied") {
        Alert.alert("Error", "You do not have permission to update these settings. Please try signing out and back in.");
      } else {
        Alert.alert("Error", error.message || "Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingPhoto(true);
        const user = auth.currentUser;
        if (!user) return;

        // Upload to Firebase Storage
        const imageUri = result.assets[0].uri;
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        setPhotoURL(downloadURL);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("[EditProfile] Error uploading photo:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectCoverPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingCover(true);
        const user = auth.currentUser;
        if (!user) return;

        // Upload to Firebase Storage
        const imageUri = result.assets[0].uri;
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const storageRef = ref(storage, `profileBackgrounds/${user.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // Update local state
        setCoverPhotoURL(downloadURL);

        // Auto-save to Firestore immediately so the photo persists
        const profileRef = doc(db, "profiles", user.uid);
        await updateDoc(profileRef, {
          backgroundUrl: downloadURL,
          updatedAt: serverTimestamp(),
        });

        // Update local store for immediate reflection across app
        updateCurrentUser({
          coverPhotoURL: downloadURL,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("[EditProfile] Error uploading cover photo:", error);
      Alert.alert("Upload Failed", "Failed to save cover photo. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    // Verify email matches
    if (deleteConfirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      Alert.alert("Email Mismatch", "The email you entered doesn't match your account email.");
      return;
    }

    Alert.alert(
      "Final Confirmation",
      "This action is irreversible. All your data will be permanently deleted. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              // Delete user profile from Firestore
              await deleteDoc(doc(db, "profiles", user.uid));

              // Delete the user account
              await deleteUser(user);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
              
              setShowDeleteConfirm(false);
            } catch (error: any) {
              console.error("[EditProfile] Error deleting account:", error);
              
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Re-authentication Required",
                  "For security, please sign out and sign back in, then try again."
                );
              } else {
                Alert.alert("Delete Failed", "Unable to delete account. Please contact support.");
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = async () => {
    try {
      // Open app store subscription management
      if (Platform.OS === "ios") {
        await Linking.openURL("https://apps.apple.com/account/subscriptions");
      } else {
        await Linking.openURL("https://play.google.com/store/account/subscriptions");
      }
    } catch (error) {
      console.error("[EditProfile] Error opening subscription management:", error);
      Alert.alert("Error", "Unable to open subscription management.");
    }
  };

  const handleToggleNewsletter = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    setOptOutNewsletter(value);
    
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        emailSubscribed: !value,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[EditProfile] Error updating newsletter preference:", error);
      setOptOutNewsletter(!value); // Revert on error
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    setOptOutNotifications(value);
    
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        notificationsEnabled: !value,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[EditProfile] Error updating notifications preference:", error);
      setOptOutNotifications(!value); // Revert on error
    }
  };

  const handleToggleProfilePrivacy = async (isPublic: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsProfileContentPublic(isPublic);
    
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        isProfileContentPublic: isPublic,
        updatedAt: serverTimestamp(),
      });
      
      // Also update local store
      updateCurrentUser({
        isProfileContentPublic: isPublic,
      });
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("[EditProfile] Error updating profile privacy:", error);
      setIsProfileContentPublic(!isPublic); // Revert on error
    }
  };

  const handleViewPublicProfile = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to MyCampsite with the user's own ID to see the "public view"
    (navigation as any).navigate("MyCampsite", { userId: user.uid, viewAsPublic: true });
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    // Validate passwords
    if (!currentPassword.trim()) {
      Alert.alert("Required Field", "Please enter your current password");
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert("Required Field", "Please enter your new password");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "New password and confirmation do not match");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Same Password", "New password must be different from current password");
      return;
    }

    try {
      setUpdatingPassword(true);

      // Re-authenticate user first (security requirement)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been updated successfully");

      // Close modal and reset fields
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("[EditProfile] Error updating password:", error);

      if (error.code === "auth/wrong-password") {
        Alert.alert("Incorrect Password", "The current password you entered is incorrect");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Weak Password", "Please choose a stronger password");
      } else if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Re-authentication Required",
          "For security, please sign out and sign back in, then try again."
        );
      } else {
        Alert.alert("Error", error.message || "Failed to update password. Please try again.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <ModalHeader
          title="Edit Profile"
          showTitle
          rightAction={{
            icon: "checkmark",
            onPress: handleSave,
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-5 pb-8">
            {/* Account Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Account
            </Text>

            <View
              className="mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Display Name */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Display Name *
                </Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={TEXT_MUTED}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: PARCHMENT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* Handle */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Handle *
                </Text>
                <TextInput
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="username"
                  placeholderTextColor={TEXT_MUTED}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: PARCHMENT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
                <Text
                  className="mt-1 text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                >
                  Lowercase letters, numbers, hyphens, and underscores only
                </Text>
              </View>

              {/* Change Password */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPasswordModal(true);
                }}
                className="py-3 active:opacity-70"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Change Password
                    </Text>
                    <Text
                      className="mt-1"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Update your account password
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                </View>
              </Pressable>
            </View>

            {/* Photos Section */}
            <View
              className="mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Profile Photo */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Profile Photo
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="w-20 h-20 rounded-full mr-4"
                    style={{ backgroundColor: BORDER_SOFT }}
                  >
                    {photoURL ? (
                      <Image
                        source={{ uri: photoURL }}
                        className="w-full h-full rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full rounded-full items-center justify-center">
                        <Ionicons name="person" size={32} color={TEXT_MUTED} />
                      </View>
                    )}
                    {uploadingPhoto && (
                      <View className="absolute inset-0 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <ActivityIndicator color={PARCHMENT} />
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={handleSelectPhoto}
                    className="px-4 py-2 rounded-xl active:opacity-70"
                    style={{ backgroundColor: DEEP_FOREST }}
                    disabled={uploadingPhoto}
                  >
                    <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                      {photoURL ? "Change" : "Upload"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Cover Photo */}
              <View>
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Cover Photo
                </Text>
                <View>
                  <View
                    className="w-full rounded-xl mb-2"
                    style={{ height: 120, backgroundColor: BORDER_SOFT }}
                  >
                    {coverPhotoURL ? (
                      <Image
                        source={{ uri: coverPhotoURL }}
                        className="w-full h-full rounded-xl"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full rounded-xl items-center justify-center">
                        <Ionicons name="image-outline" size={48} color={TEXT_MUTED} />
                      </View>
                    )}
                    {uploadingCover && (
                      <View className="absolute inset-0 rounded-xl items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <ActivityIndicator color={PARCHMENT} />
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={handleSelectCoverPhoto}
                    className="px-4 py-2 rounded-xl active:opacity-70"
                    style={{ backgroundColor: DEEP_FOREST }}
                    disabled={uploadingCover}
                  >
                    <Text
                      className="text-center"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                    >
                      {coverPhotoURL ? "Change Cover Photo" : "Upload Cover Photo"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* About Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              About
            </Text>

            <View
              className="mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              <TextInput
                value={about}
                onChangeText={setAbout}
                placeholder="Tell us about yourself and your camping adventures..."
                placeholderTextColor={TEXT_MUTED}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="px-4 py-3 rounded-xl border"
                style={{
                  backgroundColor: PARCHMENT,
                  borderColor: BORDER_SOFT,
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_PRIMARY_STRONG,
                  minHeight: 100,
                }}
              />
            </View>

            {/* Favorite Camping Style */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Favorite Camping Style
            </Text>

            <View className="mb-6">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {CAMPING_STYLES.map((style) => (
                  <Pressable
                    key={style.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFavoriteCampingStyle(
                        favoriteCampingStyle === style.value ? undefined : style.value
                      );
                    }}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor:
                        favoriteCampingStyle === style.value ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                      borderColor:
                        favoriteCampingStyle === style.value ? DEEP_FOREST : BORDER_SOFT,
                    }}
                  >
                    <View className="items-center">
                      <Ionicons
                        name={style.icon}
                        size={20}
                        color={favoriteCampingStyle === style.value ? PARCHMENT : TEXT_PRIMARY_STRONG}
                      />
                      <Text
                        className="mt-1 text-xs"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          color:
                            favoriteCampingStyle === style.value ? PARCHMENT : TEXT_PRIMARY_STRONG,
                        }}
                      >
                        {style.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Favorite Gear */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Favorite Gear
            </Text>
            <Text
              className="mb-3 text-sm"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
            >
              Tell us about your favorite gear for each category
            </Text>

            <View className="mb-6 space-y-3">
              {GEAR_CATEGORIES.map((category) => (
                <View key={category.value} className="mb-3">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={GEAR_ICONS[category.value]}
                      size={18}
                      color={EARTH_GREEN}
                    />
                    <Text
                      className="ml-2"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      {category.label}
                    </Text>
                  </View>
                  <TextInput
                    value={favoriteGear[category.value] || ""}
                    onChangeText={(text) => setFavoriteGear({ ...favoriteGear, [category.value]: text })}
                    placeholder={`e.g., ${
                      category.value === "shelter" ? "REI Co-op Half Dome SL 2+" :
                      category.value === "sleep" ? "Therm-a-Rest NeoAir XLite" :
                      category.value === "kitchen" ? "Tent and Lantern BaseCamp Box" :
                      category.value === "clothing" ? "Patagonia Down Sweater" :
                      (category.value as string) === "bags" ? "Osprey Atmos AG 65" :
                      category.value === "lighting" ? "Black Diamond Spot 400" :
                      "Nalgene 32oz Bottle"
                    }`}
                    placeholderTextColor={TEXT_MUTED}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor: PARCHMENT,
                      borderColor: BORDER_SOFT,
                      fontFamily: "SourceSans3_400Regular",
                      color: TEXT_PRIMARY_STRONG,
                    }}
                  />
                </View>
              ))}
            </View>

            {/* Privacy Settings */}
            <View className="mt-8 mb-2">
              <Text
                className="text-lg mb-3"
                style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                Privacy Settings
              </Text>

              <View
                className="p-4 rounded-xl border"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                {/* Profile Content Visibility */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1 mr-3">
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Public profile content
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Show your activity, favorites, and saved places to others
                    </Text>
                  </View>
                  <Switch
                    value={isProfileContentPublic}
                    onValueChange={handleToggleProfilePrivacy}
                    trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                    thumbColor={PARCHMENT}
                  />
                </View>

                {/* View Public Profile Button */}
                <Pressable
                  onPress={handleViewPublicProfile}
                  className="py-3 px-4 rounded-xl border flex-row items-center justify-between active:opacity-70"
                  style={{ backgroundColor: PARCHMENT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="eye-outline" size={20} color={EARTH_GREEN} />
                    <Text
                      className="ml-3"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      View my public profile
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                </Pressable>
              </View>
            </View>

            {/* Danger Zone */}
            <View className="mt-8 mb-2">
              <Text
                className="text-lg mb-3"
                style={{ fontFamily: "Raleway_700Bold", color: "#dc2626" }}
              >
                Danger Zone
              </Text>

              <View
                className="p-4 rounded-xl border"
                style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
              >
                {/* Opt-out Toggles */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <Text
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                      >
                        Opt out of newsletters
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                      >
                        Stop receiving email updates
                      </Text>
                    </View>
                    <Switch
                      value={optOutNewsletter}
                      onValueChange={handleToggleNewsletter}
                      trackColor={{ false: BORDER_SOFT, true: "#dc2626" }}
                      thumbColor={PARCHMENT}
                    />
                  </View>

                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1 mr-3">
                      <Text
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                      >
                        Opt out of notifications
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                      >
                        Disable all push notifications
                      </Text>
                    </View>
                    <Switch
                      value={optOutNotifications}
                      onValueChange={handleToggleNotifications}
                      trackColor={{ false: BORDER_SOFT, true: "#dc2626" }}
                      thumbColor={PARCHMENT}
                    />
                  </View>
                </View>

                {/* Manage Subscription */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleManageSubscription();
                  }}
                  className="py-3 px-4 rounded-xl border mb-3 flex-row items-center justify-between active:opacity-70"
                  style={{ backgroundColor: PARCHMENT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={20} color={TEXT_PRIMARY_STRONG} />
                    <Text
                      className="ml-3"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Manage Subscription
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={TEXT_SECONDARY} />
                </Pressable>

                {/* Delete Account */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowDeleteConfirm(true);
                  }}
                  className="py-3 px-4 rounded-xl flex-row items-center justify-center active:opacity-70"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  <Ionicons name="trash-outline" size={20} color={PARCHMENT} />
                  <Text
                    className="ml-2"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                  >
                    Delete My Account
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Saving Overlay */}
      {saving && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <ActivityIndicator size="large" color={PARCHMENT} />
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-4"
          onPress={() => {
            setShowSuccessModal(false);
            navigation.goBack();
          }}
        >
          <Pressable
            className="bg-parchment rounded-2xl p-6 w-full max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                <Ionicons name="checkmark" size={32} color={PARCHMENT} />
              </View>
              <Text
                className="text-xl mb-2"
                style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                Profile Updated
              </Text>
              <Text
                className="text-center"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Your profile has been updated successfully.
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSuccessModal(false);
                navigation.goBack();
              }}
              className="bg-forest rounded-xl py-3 active:opacity-90"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Text
                className="text-center text-parchment"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 bg-black/50 items-center justify-end pb-8 px-4"
            onPress={() => setShowDeleteConfirm(false)}
          >
            <Pressable
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{ backgroundColor: PARCHMENT, maxHeight: "85%" }}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <View className="items-center mb-4">
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: "#dc2626" }}
                  >
                    <Ionicons name="warning" size={32} color={PARCHMENT} />
                  </View>
                  <Text
                    className="text-xl mb-2"
                    style={{ fontFamily: "Raleway_700Bold", color: "#dc2626" }}
                  >
                    Delete Account
                  </Text>
                  <Text
                    className="text-center mb-3"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, lineHeight: 20 }}
                  >
                    This action cannot be undone. All your data, trips, and preferences will be permanently deleted. For that reason, we require 2 factor authentication.
                  </Text>
                </View>

                <View className="mb-4">
                  <Text
                    className="mb-2"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                  >
                    Enter your email to confirm:
                  </Text>
                  <TextInput
                    value={deleteConfirmEmail}
                    onChangeText={setDeleteConfirmEmail}
                    placeholder={auth.currentUser?.email || "your@email.com"}
                    placeholderTextColor={TEXT_MUTED}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor: PARCHMENT,
                      borderColor: "#dc2626",
                      fontFamily: "SourceSans3_400Regular",
                      color: TEXT_PRIMARY_STRONG,
                    }}
                  />
                  <Text
                    className="mt-3"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 13, lineHeight: 18 }}
                  >
                    Look for a confirmation email at this address and follow instructions from there.
                  </Text>
                </View>

                <View 
                  className="mb-4 p-3 rounded-xl" 
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
                >
                  <Text
                    className="text-center"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 13, lineHeight: 18 }}
                  >
                    Happy trails! We&apos;ll miss you and hope to see you at the campground in the future. Come back anytime.
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmEmail("");
                    }}
                    className="flex-1 rounded-xl py-3 border active:opacity-70"
                    style={{ borderColor: BORDER_SOFT }}
                  >
                    <Text
                      className="text-center"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={deleting || !deleteConfirmEmail}
                    className="flex-1 rounded-xl py-3 active:opacity-70"
                    style={{ 
                      backgroundColor: deleteConfirmEmail ? "#dc2626" : "#f87171",
                      opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color={PARCHMENT} />
                    ) : (
                      <Text
                        className="text-center"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                      >
                        Delete
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={() => !updatingPassword && setShowPasswordModal(false)}
          >
            <Pressable
              className="rounded-t-3xl p-6"
              style={{ backgroundColor: PARCHMENT }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text
                  className="text-2xl"
                  style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                >
                  Change Password
                </Text>
                <Pressable
                  onPress={() => setShowPasswordModal(false)}
                  disabled={updatingPassword}
                  className="w-8 h-8 items-center justify-center active:opacity-70"
                >
                  <Ionicons name="close" size={28} color={DEEP_FOREST} />
                </Pressable>
              </View>

              {/* Current Password */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Current Password
                </Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  New Password
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter your new password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
                <Text
                  className="mt-2 text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                >
                  Must be at least 8 characters long
                </Text>
              </View>

              {/* Confirm New Password */}
              <View className="mb-6">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Confirm New Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* Update Button */}
              <Pressable
                onPress={handleChangePassword}
                disabled={updatingPassword}
                className="rounded-xl py-4 active:opacity-70"
                style={{
                  backgroundColor: DEEP_FOREST,
                  opacity: updatingPassword ? 0.5 : 1,
                }}
              >
                {updatingPassword ? (
                  <ActivityIndicator color={PARCHMENT} />
                ) : (
                  <Text
                    className="text-center"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 16 }}
                  >
                    Update Password
                  </Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
