import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setError("");

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, email.trim());
      
      setSuccess(true);
      Alert.alert(
        "Check Your Email",
        "We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      
      if (error.code === "auth/user-not-found") {
        // Don't reveal if user exists for security
        setSuccess(true);
        Alert.alert(
          "Check Your Email",
          "If an account exists with this email, we've sent a password reset link.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/splash-screen.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <View style={styles.overlay}>
            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Reset Password</Text>
            </View>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#F4EBD0" />
            </TouchableOpacity>

            <View style={styles.spacer} />

            <View style={styles.content}>
              <Text style={styles.instructionText}>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#828872"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading && !success}
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (loading || success) && styles.disabledButton,
                ]}
                onPress={handleResetPassword}
                disabled={loading || success}
              >
                {loading ? (
                  <ActivityIndicator color="#F4EBD0" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backToSignInButton}
              >
                <Text style={styles.backToSignInText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  safeArea: {
    flex: 1,
    paddingBottom: 0,
  },

  flex: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 0,
  },

  titleContainer: {
    alignItems: "center",
    paddingTop: 20,
    gap: 8,
  },

  titleText: {
    fontFamily: "Raleway_700Bold",
    fontSize: 32,
    color: "#485952",
    textAlign: "center",
  },

  backButton: {
    paddingTop: 20,
    paddingBottom: 10,
  },

  spacer: {
    flex: 2,
  },

  content: {
    paddingBottom: 40,
  },

  instructionText: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: "#F4EBD0",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
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

  primaryButton: {
    backgroundColor: "#485952",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 18,
    color: "#F4EBD0",
    textAlign: "center",
  },

  backToSignInButton: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 8,
  },

  backToSignInText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#F4EBD0",
    textDecorationLine: "underline",
  },
});
