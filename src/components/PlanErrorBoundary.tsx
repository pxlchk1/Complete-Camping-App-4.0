import React from "react";
import { View, Text, Pressable } from "react-native";

export class PlanErrorBoundary extends React.Component<{
  children: React.ReactNode;
  navigation?: any;
}, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("Plan stack crashed:", error, info);
    // TODO: send to Sentry/Crashlytics if available
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#F4EBD0" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12, color: "#1e293b" }}>Plan is having trouble loading</Text>
          <Text style={{ fontSize: 16, color: "#475569", marginBottom: 24, textAlign: "center" }}>
            Try again, or go back.
          </Text>
          <Pressable onPress={this.handleRetry} style={{ backgroundColor: "#166534", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Try again</Text>
          </Pressable>
          <Pressable onPress={() => this.props.navigation?.navigate?.("Home") || null} style={{ paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#166534" }}>
            <Text style={{ color: "#166534", fontWeight: "bold", fontSize: 16 }}>Back</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
