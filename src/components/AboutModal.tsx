import React from "react";
import { View, Text, Modal, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DEEP_FOREST, PARCHMENT } from "../constants/colors";

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutModal({ visible, onClose }: AboutModalProps) {
  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-parchment" edges={["bottom"]}>
        {/* Header - Deep Forest Green background */}
        <View
          style={{
            paddingTop: 30,
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: DEEP_FOREST,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text
              style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: PARCHMENT, flex: 1, marginRight: 12 }}
            >
              About
            </Text>
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={PARCHMENT} />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {/* Main Title */}
          <Text
            className="text-2xl text-center mb-6"
            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
          >
            About The Complete Camping App
          </Text>

          {/* Body Text */}
          <Text
            className="text-base mb-2 leading-6"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#3d3d3d", lineHeight: 24 }}
          >
            Nature has a way of steadying us. Even a simple night outside can reset your brain in the best way. I built this app to take some of the stress out of planning, packing, and getting started, so more people can experience that kind of calm.
          </Text>
          <Text
            className="text-base mb-2 leading-6"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#3d3d3d", lineHeight: 24 }}
          >
            I hope it helps. And if it does, I&apos;d be really grateful if you&apos;d leave a review or share the app with a friend.
          </Text>
          <Text
            className="text-base mb-8"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#3d3d3d", lineHeight: 24 }}
          >
            {"\n"}
            Stay wild and wander often!{"\n"}
            - Alana
          </Text>

          {/* Divider */}
          <View className="h-px bg-stone-300 mb-6" />

          {/* Find us online section */}
          <Text
            className="text-lg mb-4"
            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
          >
            Find us online
          </Text>

          <View className="mb-8 space-y-3">
            <View className="mb-3">
              <Text
                className="text-base mb-1"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Website
              </Text>
              <Pressable onPress={() => handleLinkPress("https://tentandlantern.com")}>
                <Text
                  className="text-base underline"
                  style={{ fontFamily: "SourceSans3_400Regular", color: "#2563eb" }}
                >
                  https://tentandlantern.com
                </Text>
              </Pressable>
            </View>

            <View className="mb-3">
              <Text
                className="text-base mb-1"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                YouTube
              </Text>
              <Pressable
                onPress={() => handleLinkPress("https://www.youtube.com/@TentAndLantern")}
              >
                <Text
                  className="text-base underline"
                  style={{ fontFamily: "SourceSans3_400Regular", color: "#2563eb" }}
                >
                  https://www.youtube.com/@TentAndLantern
                </Text>
              </Pressable>
            </View>

            <View className="mb-3">
              <Text
                className="text-base mb-1"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Instagram
              </Text>
              <Pressable
                onPress={() => handleLinkPress("https://www.instagram.com/tent.and.lantern")}
              >
                <Text
                  className="text-base underline"
                  style={{ fontFamily: "SourceSans3_400Regular", color: "#2563eb" }}
                >
                  https://www.instagram.com/tent.and.lantern
                </Text>
              </Pressable>
            </View>

            <View className="mb-3">
              <Text
                className="text-base mb-1"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Email
              </Text>
              <Pressable onPress={() => handleLinkPress("mailto:info@tentandlantern.com")}>
                <Text
                  className="text-base underline"
                  style={{ fontFamily: "SourceSans3_400Regular", color: "#2563eb" }}
                >
                  info@tentandlantern.com
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-stone-300 mb-6" />

          {/* Special thanks section */}
          <Text
            className="text-lg mb-4"
            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
          >
            Special thanks
          </Text>

          <View className="mb-8">
            <Text
              className="text-sm mb-2"
              style={{ fontFamily: "SourceSans3_400Regular", color: "#6b7280", lineHeight: 20 }}
            >
              Data collection and steady encouragement: Dave Piper
            </Text>
            <Text
              className="text-sm mb-2"
              style={{ fontFamily: "SourceSans3_400Regular", color: "#6b7280", lineHeight: 20 }}
            >
              QA testing and thoughtful UX feedback: Will Piper
            </Text>
          </View>

          {/* Divider */}
          <View className="h-px bg-stone-300 mb-6" />

          {/* Footer */}

          <Text
            className="text-base mb-4"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#3d3d3d" }}
          >
            Design and Development by{' '}
            <Text
              className="underline"
              style={{ color: '#2563eb' }}
              onPress={() => handleLinkPress('https://guyline.studio')}
            >
              Guyline.Studio
            </Text>
          </Text>

          <Text
            className="text-xs text-center mb-8"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#9ca3af" }}
          >
            All content and IP © Tent and Lantern
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
