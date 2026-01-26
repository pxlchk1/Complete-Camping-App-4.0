import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { seedCommunityData } from "../scripts/seedCommunityData";

export default function SeedDataScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeedData = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const seedResult = await seedCommunityData();
      setResult(seedResult);

      Alert.alert(
        "Success!",
        `Seeded community data:\n• ${seedResult.counts.tips} tips\n• ${seedResult.counts.gearReviews} gear reviews\n• ${seedResult.counts.questions} questions\n• ${seedResult.counts.feedback} feedback posts`,
        [{ text: "OK" }]
      );
    } catch (err: any) {
      console.error("Seed error:", err);
      setError(err.message || "Failed to seed data");
      Alert.alert("Error", err.message || "Failed to seed data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#485952" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seed Community Data</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Community Data Seeder</Text>
          <Text style={styles.cardDescription}>
            This will populate your Firebase database with sample community content:
          </Text>

          <View style={styles.list}>
            <Text style={styles.listItem}>• 8 Camping Tips</Text>
            <Text style={styles.listItem}>• 4 Gear Reviews</Text>
            <Text style={styles.listItem}>• 4 Questions</Text>
            <Text style={styles.listItem}>• 4 Feedback Posts</Text>
          </View>

          <Text style={styles.warning}>
            ⚠️ Note: This will add data to your Firebase project. Only run this once.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSeedData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F4EBD0" />
            ) : (
              <Text style={styles.buttonText}>Seed Data Now</Text>
            )}
          </TouchableOpacity>

          {result && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              <Text style={styles.successText}>Data seeded successfully!</Text>
              <Text style={styles.successDetail}>
                {result.counts.tips} tips, {result.counts.gearReviews} reviews, {result.counts.questions} questions, {result.counts.feedback} feedback
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={24} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4EBD0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D5C8A2",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: "Raleway_700Bold",
    fontSize: 20,
    color: "#485952",
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 20,
    backgroundColor: "#FFF9EB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5C8A2",
  },
  cardTitle: {
    fontFamily: "Raleway_700Bold",
    fontSize: 24,
    color: "#485952",
    marginBottom: 12,
  },
  cardDescription: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: "#4F655F",
    marginBottom: 16,
    lineHeight: 24,
  },
  list: {
    marginBottom: 16,
  },
  listItem: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: "#485952",
    marginBottom: 8,
  },
  warning: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#d97706",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#485952",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 15,
    color: "#F4EBD0",
  },
  successBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#16a34a",
    alignItems: "center",
  },
  successText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: "#16a34a",
    marginTop: 8,
  },
  successDetail: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 14,
    color: "#15803d",
    marginTop: 4,
    textAlign: "center",
  },
  errorBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
    alignItems: "center",
  },
  errorText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: "#dc2626",
    marginTop: 8,
    textAlign: "center",
  },
});
