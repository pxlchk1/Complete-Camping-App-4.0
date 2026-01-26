import React, { useState } from "react";
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Platform, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Linking, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, linkWithCredential, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "../state/authStore";
import { useUserStore } from "../state/userStore";
import { Ionicons } from "@expo/vector-icons";
import { bootstrapNewAccount, getOnboardingErrorMessage, isPermissionDeniedError, isEmailInUseError } from "../onboarding";
import { identifyUser } from "../services/subscriptionService";

export default function AuthLanding({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState("");
  const [linkingPassword, setLinkingPassword] = useState("");
  const [pendingAppleCredential, setPendingAppleCredential] = useState<any>(null);
  const [linkingError, setLinkingError] = useState("");
  const setUser = useAuthStore((s) => s.setUser);
  const setCurrentUser = useUserStore((s) => s.setCurrentUser);

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        alert("Apple Sign In is not available on this device");
        return;
      }

      // Generate nonce for security
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      // Request Apple credential
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      // Extract email from Apple credential
      const appleEmail = appleCredential.email;
      
      if (!appleEmail) {
        // No email from Apple - proceed with direct sign-in
        console.log("[Apple Auth] No email from Apple, proceeding with direct sign-in");
        await completeAppleSignIn(appleCredential, nonce);
        return;
      }

      // Normalize email
      const emailNormalized = appleEmail.toLowerCase().trim();
      console.log("[Apple Auth] Checking for existing accounts with email:", emailNormalized);

      // Check for existing sign-in methods for this email
      const signInMethods = await fetchSignInMethodsForEmail(auth, emailNormalized);
      console.log("[Apple Auth] Existing sign-in methods:", signInMethods);

      // Check if password or other non-Apple methods exist
      const hasPasswordAuth = signInMethods.includes("password");
      const hasNonAppleAuth = signInMethods.some(method => method !== "apple.com");

      if (hasNonAppleAuth) {
        // Account exists with password - need to link
        console.log("[Apple Auth] Account exists with password, prompting for password to link");
        
        // Store Apple credential for later linking
        const { identityToken } = appleCredential;
        if (!identityToken) {
          throw new Error("No identity token received");
        }

        const provider = new OAuthProvider("apple.com");
        const firebaseCredential = provider.credential({
          idToken: identityToken,
          rawNonce: nonce,
        });

        setPendingAppleCredential({ credential: firebaseCredential, appleInfo: appleCredential });
        setLinkingEmail(emailNormalized);
        setShowLinkingModal(true);
        setLoading(false);
        return;
      }

      // No existing password account - proceed with Apple sign-in
      console.log("[Apple Auth] No conflicting accounts, proceeding with sign-in");
      await completeAppleSignIn(appleCredential, nonce);

    } catch (error: any) {
      if (error.code !== "ERR_REQUEST_CANCELED") {
        console.error("Apple Sign In Error:", error);
        alert("Failed to sign in with Apple. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const completeAppleSignIn = async (appleCredential: any, nonce: string) => {
    try {
      const { identityToken } = appleCredential;
      if (!identityToken) {
        throw new Error("No identity token received");
      }

      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      });

      const userCredential = await signInWithCredential(auth, firebaseCredential);
      const firebaseUser = userCredential.user;

      // Check if profile exists, if not create it using protected onboarding layer
      const userDoc = await getDoc(doc(db, "profiles", firebaseUser.uid));
      
      if (!userDoc.exists()) {
        // New user - create profile using protected onboarding layer
        const rawHandle = firebaseUser.displayName || appleCredential.fullName?.givenName || "user";
        const normalizedHandle = rawHandle.toLowerCase().replace(/[^a-z0-9]/g, "");
        const displayName = firebaseUser.displayName ||
          `${appleCredential.fullName?.givenName || ""} ${appleCredential.fullName?.familyName || ""}`.trim() ||
          "Anonymous User";

        const email = firebaseUser.email || appleCredential.email || "";

        // Force token refresh to ensure Firestore rules see the new auth state
        console.log("[Apple Auth] Refreshing auth token before Firestore writes...");
        await firebaseUser.getIdToken(true);
        console.log("[Apple Auth] Token refreshed successfully");

        // Use protected onboarding layer for all account creation writes
        const result = await bootstrapNewAccount({
          userId: firebaseUser.uid,
          email: email,
          displayName: displayName,
          handle: normalizedHandle,
          photoURL: firebaseUser.photoURL,
        });

        if (!result.success) {
          console.error("[Apple Auth] Bootstrap failed:", result.error, result.debugInfo);
          // Handle email-in-use error specifically
          if (result.emailInUse) {
            throw new Error("That email is already in use. Try signing in instead.");
          }
          throw new Error(result.error || "We couldn't finish setting up your account. Please try again.");
        }
        
        console.log("[Apple Auth] Account bootstrapped successfully");
      }

      await loadUserProfile(firebaseUser.uid);
    } catch (error: any) {
      console.error("Complete Apple Sign In Error:", error);
      // Map permission errors to user-friendly messages
      if (isPermissionDeniedError(error)) {
        throw new Error(getOnboardingErrorMessage(error));
      }
      // Map email-in-use errors
      if (isEmailInUseError(error)) {
        throw new Error("That email is already in use. Try signing in instead.");
      }
      throw error;
    }
  };

  const handlePasswordLinking = async () => {
    try {
      setLinkingError("");
      
      if (!linkingPassword.trim()) {
        setLinkingError("Please enter your password");
        return;
      }

      console.log("[Account Linking] Attempting password sign-in for:", linkingEmail);

      // Step 1: Sign in with password
      const passwordCredential = await signInWithEmailAndPassword(
        auth,
        linkingEmail,
        linkingPassword
      );

      console.log("[Account Linking] Password sign-in successful, linking Apple account");

      // Step 2: Link Apple credential to this account
      const linkedUser = await linkWithCredential(
        passwordCredential.user,
        pendingAppleCredential.credential
      );

      console.log("[Account Linking] Successfully linked Apple to existing account");

      // Close modal and complete sign-in
      setShowLinkingModal(false);
      setPendingAppleCredential(null);
      setLinkingPassword("");
      setLinkingEmail("");

      // Load user profile
      await loadUserProfile(linkedUser.user.uid);

    } catch (error: any) {
      console.error("Password Linking Error:", error);
      if (error.code === "auth/wrong-password") {
        setLinkingError("Incorrect password. Please try again.");
      } else if (error.code === "auth/invalid-credential") {
        setLinkingError("Incorrect password. Please try again.");
      } else if (error.code === "auth/provider-already-linked") {
        setLinkingError("This Apple account is already linked to another account.");
      } else if (error.code === "auth/credential-already-in-use") {
        setLinkingError("This Apple account is already in use by another account.");
      } else {
        setLinkingError("Failed to link accounts. Please try again.");
      }
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "profiles", userId));
      const userData = userDoc.data();
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error("No current user");
      }

      const userProfile = {
        id: userId,
        email: firebaseUser.email || "",
        handle: userData?.handle || "user",
        displayName: userData?.displayName || "User",
        avatarUrl: userData?.avatarUrl || firebaseUser.photoURL || undefined,
        createdAt: userData?.joinedAt || new Date().toISOString(),
      };

      if (__DEV__) console.log("🔐 [AuthLanding] User Profile:", JSON.stringify(userProfile, null, 2));

      setUser(userProfile);
      
      // Also update userStore
      const userStoreData = {
        id: userId,
        email: firebaseUser.email || "",
        handle: userData?.handle || "user",
        displayName: userData?.displayName || "User",
        photoURL: userData?.avatarUrl || firebaseUser.photoURL,
        coverPhotoURL: userData?.backgroundUrl,
        about: userData?.about,
        favoriteCampingStyle: userData?.favoriteCampingStyle,
        favoriteGear: userData?.favoriteGear,
        role: userData?.role || "user",
        membershipTier: userData?.membershipTier || "freeMember",
        isBanned: false,
        createdAt: userData?.joinedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentUser(userStoreData);
      
      // Identify user in RevenueCat to sync subscription status
      try {
        await identifyUser(userId);
        if (__DEV__) console.log("🔐 [AuthLanding] RevenueCat user identified:", userId);
      } catch (rcError) {
        if (__DEV__) console.warn("🔐 [AuthLanding] RevenueCat identify failed (non-blocking):", rcError);
      }
      
      navigation.navigate("HomeTabs");
    } catch (error) {
      if (__DEV__) console.error("Load User Profile Error:", error);
      throw error;
    }
  };

  const handleEmailAuth = async () => {
    try {
      setLoading(true);
      setError("");

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }

      // Validate password
      if (!password) {
        setError("Please enter a password.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      let userCredential;

      if (isSignUp) {
        // Create new account - validate additional fields
        if (!displayName.trim()) {
          setError("Please enter your display name.");
          return;
        }
        if (!handle.trim()) {
          setError("Please enter a handle (username).");
          return;
        }

        console.log("[Auth] Creating account for:", email.trim());
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

        // Force token refresh to ensure Firestore rules see the new auth state
        console.log("[Auth] Refreshing auth token before Firestore writes...");
        await userCredential.user.getIdToken(true);
        console.log("[Auth] Token refreshed successfully");

        // Create user profile using protected onboarding layer
        // Normalize handle - remove any @ prefix before saving
        const normalizedHandle = handle.trim().replace(/^@+/, "");

        // Use protected onboarding layer for all account creation writes
        const result = await bootstrapNewAccount({
          userId: userCredential.user.uid,
          email: email.trim(),
          displayName: displayName.trim(),
          handle: normalizedHandle,
          photoURL: null,
        });

        if (!result.success) {
          console.error("[Email Auth] Bootstrap failed:", result.error, result.debugInfo);
          // Handle email-in-use error specifically
          if (result.emailInUse) {
            setError("That email is already in use. Try signing in instead.");
          } else {
            setError(result.error || "We couldn't finish setting up your account. Please try again.");
          }
          return;
        }
        
        console.log("[Email Auth] Account bootstrapped successfully");

        // Send email verification
        try {
          await sendEmailVerification(userCredential.user);
          console.log("[Email Auth] Verification email sent to:", email.trim());
          
          // Notify user about verification email
          Alert.alert(
            "Verify Your Email",
            "We've sent a verification link to your email address. Please check your inbox and verify your email to complete your account setup.",
            [{ text: "OK" }]
          );
        } catch (verifyError) {
          console.warn("[Email Auth] Failed to send verification email:", verifyError);
          // Don't block sign-up if verification email fails
        }
      } else {
        // Sign in existing user
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      const firebaseUser = userCredential.user;

      // Load user profile from Firestore
      const userDoc = await getDoc(doc(db, "profiles", firebaseUser.uid));
      const userData = userDoc.data();

      const userProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email.trim(),
        handle: userData?.handle || firebaseUser.displayName || "user",
        displayName: userData?.displayName || firebaseUser.displayName || "User",
        avatarUrl: userData?.photoURL || firebaseUser.photoURL || undefined,
        createdAt: userData?.createdAt || new Date().toISOString(),
      };

      if (__DEV__) console.log("🔐 [AuthLanding - Email] User Profile:", JSON.stringify(userProfile, null, 2));
      if (__DEV__) console.log("🔐 [AuthLanding - Email] Firebase User Data:", JSON.stringify(userData, null, 2));

      setUser(userProfile);
      
      // Also update userStore for components that use it (like HomeScreen)
      const userStoreData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email.trim(),
        handle: userData?.handle || firebaseUser.displayName || "user",
        displayName: userData?.displayName || firebaseUser.displayName || "User",
        photoURL: userData?.avatarUrl || firebaseUser.photoURL,
        coverPhotoURL: userData?.backgroundUrl,
        about: userData?.about,
        favoriteCampingStyle: userData?.favoriteCampingStyle,
        favoriteGear: userData?.favoriteGear,
        role: userData?.role || "user",
        membershipTier: userData?.membershipTier || "freeMember",
        isBanned: false,
        createdAt: userData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (__DEV__) console.log("🔐 [AuthLanding - Email] Setting userStore:", JSON.stringify(userStoreData, null, 2));
      setCurrentUser(userStoreData);
      
      // Identify user in RevenueCat to sync subscription status
      try {
        await identifyUser(firebaseUser.uid);
        if (__DEV__) console.log("🔐 [AuthLanding - Email] RevenueCat user identified:", firebaseUser.uid);
      } catch (rcError) {
        if (__DEV__) console.warn("🔐 [AuthLanding - Email] RevenueCat identify failed (non-blocking):", rcError);
      }
      
      navigation.navigate("HomeTabs");
    } catch (error: any) {
      if (__DEV__) console.error("Email Auth Error:", error);
      if (__DEV__) console.error("Email Auth Error Code:", error.code);
      if (__DEV__) console.error("Email Auth Error Message:", error.message);
      
      // Handle Firestore permission errors from onboarding
      if (isPermissionDeniedError(error)) {
        setError(getOnboardingErrorMessage(error));
      } else if (error.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (error.code === "auth/missing-password") {
        setError("Please enter a password.");
      } else if (error.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === "auth/operation-not-allowed") {
        setError("Email/password sign-in is not enabled. Please contact support.");
      } else {
        // Log full error details for debugging
        if (__DEV__) console.error("Unhandled auth error:", JSON.stringify(error, null, 2));
        setError(getOnboardingErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  if (showEmailAuth) {
    return (
      <ImageBackground
        source={require('../../assets/images/splash-screen.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.overlay}>
                {/* Title at Top Center */}
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>{isSignUp ? "Create Account" : "Sign In"}</Text>
                </View>

                {/* Back Button */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setShowEmailAuth(false);
                    setError("");
                    setEmail("");
                    setPassword("");
                    setHandle("");
                    setDisplayName("");
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color="#F4EBD0" />
                </TouchableOpacity>

                <View style={styles.spacer} />

                <View style={styles.content}>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  {isSignUp && (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Display Name"
                        placeholderTextColor="#828872"
                        value={displayName}
                        onChangeText={setDisplayName}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Handle (e.g., @yourname)"
                        placeholderTextColor="#828872"
                        value={handle}
                        onChangeText={setHandle}
                        autoCapitalize="none"
                      />
                    </>
                  )}

                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#828872"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#828872"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleEmailAuth}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#F4EBD0" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {isSignUp ? "Create Account" : "Sign In"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Forgot Password Link - only show on Sign In */}
                  {!isSignUp && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate("ForgotPassword")}
                      style={styles.forgotPasswordButton}
                    >
                      <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                    }}
                    style={styles.switchButton}
                  >
                    <Text style={styles.switchButtonText}>
                      {isSignUp ? "Already have an account? Sign In" : "Need an account? Create One"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.footerText}>
                  By continuing, you agree to our{" "}
                  <Text
                    style={styles.footerLink}
                    onPress={() => Linking.openURL('https://tentandlantern.com/privacy/')}
                  >
                    Terms and Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-screen.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.overlay}>
          {/* Spacer to push buttons to bottom */}
          <View style={{ flex: 1 }} />

          {/* Button Stack at Bottom */}
          <View style={styles.content}>
            {/* 1. Create Account - Primary CTA */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsSignUp(true);
                setShowEmailAuth(true);
              }}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>

            {/* 2. Sign In - For existing users */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setIsSignUp(false);
                setShowEmailAuth(true);
              }}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            {/* 3. Sign in with Apple - Apple Standard Style */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={24} color="#FFFFFF" style={styles.appleIcon} />
                    <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* 4. Explore the App - Lowest priority */}
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => navigation.navigate("HomeTabs")}
            >
              <Text style={styles.ghostButtonText}>Explore the app</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            By continuing, you agree to our{" "}
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL('https://tentandlantern.com/privacy/')}
            >
              Terms and Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </SafeAreaView>

      {/* Account Linking Modal */}
      <Modal
        visible={showLinkingModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowLinkingModal(false);
          setPendingAppleCredential(null);
          setLinkingPassword("");
          setLinkingError("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Link your accounts</Text>
            <Text style={styles.modalMessage}>
              An account already exists with this email. Enter your password to link your Apple account.
            </Text>

            <View style={styles.linkingEmailContainer}>
              <Ionicons name="mail-outline" size={20} color="#828872" />
              <Text style={styles.linkingEmailText}>{linkingEmail}</Text>
            </View>

            {linkingError ? (
              <View style={styles.linkingErrorContainer}>
                <Ionicons name="alert-circle" size={20} color="#D84315" />
                <Text style={styles.linkingErrorText}>{linkingError}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#828872"
              value={linkingPassword}
              onChangeText={setLinkingPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowLinkingModal(false);
                  setPendingAppleCredential(null);
                  setLinkingPassword("");
                  setLinkingError("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalLinkButton}
                onPress={handlePasswordLinking}
                disabled={!linkingPassword.trim()}
              >
                <Text style={styles.modalLinkText}>Link accounts</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%"
  },

  safeArea: {
    flex: 1,
    paddingBottom: 0,
  },

  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  overlay: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 0,
  },

  titleContainer: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 8,
  },

  titleText: {
    fontFamily: "Raleway_700Bold",
    fontSize: 32,
    color: "#485952", // Deep Forest Green
    textAlign: "center",
  },

  spacer: {
    flex: 3,
  },

  content: {
    paddingBottom: 0,
  },

  backButton: {
    paddingTop: 20,
    paddingBottom: 10,
  },

  authTitle: {
    fontFamily: "Raleway_700Bold",
    fontSize: 32,
    color: "#F4EBD0",
    textAlign: "center",
    marginBottom: 24,
  },

  input: {
    backgroundColor: "rgba(244, 235, 208, 0.9)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: "#485952",
  },

  errorText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 12,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    padding: 12,
    borderRadius: 8,
  },

  switchButton: {
    marginTop: 16,
  },

  switchButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#F4EBD0",
    textAlign: "center",
    textDecorationLine: "underline",
  },

  forgotPasswordButton: {
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 8,
  },

  forgotPasswordText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#F4EBD0",
    textDecorationLine: "underline",
  },

  primaryButton: {
    backgroundColor: "#485952",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8
  },

  primaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 18,
    color: "#F4EBD0",
    textAlign: "center"
  },

  appleButton: {
    backgroundColor: "#000000",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },

  appleIcon: {
    marginRight: 8
  },

  appleButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center"
  },

  secondaryButton: {
    backgroundColor: "#828872",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8
  },

  secondaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 18,
    color: "#F4EBD0",
    textAlign: "center"
  },

  ghostButton: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#F4EBD0",
    marginBottom: 0
  },

  ghostButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 18,
    color: "#F4EBD0",
    textAlign: "center"
  },

  footerText: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 12,
    color: "#F4EBD0",
    opacity: 0.8,
    textAlign: "center",
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 0,
  },

  footerLink: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 12,
    color: "#F4EBD0",
    textDecorationLine: "underline",
  },

  // Account Linking Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalContainer: {
    backgroundColor: "#F4EBD0",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },

  modalTitle: {
    fontFamily: "Raleway_700Bold",
    fontSize: 24,
    color: "#485952",
    textAlign: "center",
    marginBottom: 12,
  },

  modalMessage: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: "#485952",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },

  linkingEmailContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(130, 136, 114, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },

  linkingEmailText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 15,
    color: "#485952",
    flex: 1,
  },

  linkingErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(216, 67, 21, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },

  linkingErrorText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#D84315",
    flex: 1,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#828872",
    backgroundColor: "transparent",
  },

  modalCancelText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: "#485952",
    textAlign: "center",
  },

  modalLinkButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#485952",
  },

  modalLinkText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: "#F4EBD0",
    textAlign: "center",
  },
});
