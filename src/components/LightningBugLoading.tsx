import React from "react";
import { View, ActivityIndicator, Text, StyleSheet, Modal } from "react-native";
import { EARTH_GREEN, PARCHMENT } from "../constants/colors";

/**
 * LightningBugLoading
 * A full-screen loading overlay for entitlement loading (Pro/Paywall gating).
 * Replace ActivityIndicator with a Lottie animation if desired.
 */
export default function LightningBugLoading({ visible = false, message = "Checking your Pro access..." }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Replace this with a Lottie animation if available */}
        <ActivityIndicator size="large" color={EARTH_GREEN} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 18,
    color: PARCHMENT,
    fontSize: 18,
    fontFamily: "SourceSans3_600SemiBold",
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
