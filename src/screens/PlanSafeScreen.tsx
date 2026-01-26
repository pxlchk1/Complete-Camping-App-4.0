import React from "react";
import { View, Text } from "react-native";

export default function PlanSafeScreen() {
  console.log("[PLAN_TRACE] Enter PlanSafeScreen");
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F4EBD0" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", color: "#1e293b" }}>Plan Safe Screen</Text>
      <Text style={{ fontSize: 16, color: "#475569", marginTop: 12 }}>This is a crash isolation placeholder.</Text>
    </View>
  );
}
