import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Heading2, BodyText } from "../components/Typography";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

export default function ConnectScreen() {
  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-parchmentDark">
        <Heading2>Connect</Heading2>
      </View>

      <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
        {/* Coming Soon */}
        <View className="flex-1 items-center justify-center py-20">
          <View className="w-20 h-20 rounded-full bg-[#f0f9f4] items-center justify-center mb-4">
            <Ionicons name="people-outline" size={40} color={DEEP_FOREST} />
          </View>
          <Text className="text-[#16492f] text-lg font-semibold mb-2" style={{ fontFamily: "Raleway_600SemiBold" }}>
            Community
          </Text>
          <BodyText className="text-center px-8 mb-4">
            Share photos, connect with fellow campers, and discover camping stories
          </BodyText>

          {/* Preview Features */}
          <View className="w-full mt-4">
            <View className="bg-parchment rounded-2xl p-4 border border-parchmentDark mb-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="camera" size={20} color={DEEP_FOREST} />
                <Text className="text-[#16492f] text-base font-semibold ml-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                  Photo Sharing
                </Text>
              </View>
              <BodyText>Share your camping adventures and inspiration</BodyText>
            </View>

            <View className="bg-parchment rounded-2xl p-4 border border-parchmentDark mb-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="chatbubbles" size={20} color={DEEP_FOREST} />
                <Text className="text-[#16492f] text-base font-semibold ml-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                  Trip Stories
                </Text>
              </View>
              <BodyText>Read and share camping experiences</BodyText>
            </View>

            <View className="bg-parchment rounded-2xl p-4 border border-parchmentDark">
              <View className="flex-row items-center mb-2">
                <Ionicons name="star" size={20} color={DEEP_FOREST} />
                <Text className="text-[#16492f] text-base font-semibold ml-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                  Reviews & Tips
                </Text>
              </View>
              <BodyText>Get recommendations from the community</BodyText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
