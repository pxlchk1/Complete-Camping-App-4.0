import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import { SectionTitle, Heading3, Heading2 } from "../components/Typography";
import AccountButtonHeader from "../components/AccountButtonHeader";
import { XPBar } from "../components/XPBar";

// State
import { useLearningStore, SkillLevel } from "../state/learningStore";

// Constants
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  PARCHMENT_BACKGROUND,
  CARD_BACKGROUND_LIGHT,
  PARCHMENT_BORDER,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_ON_DARK,
  TEXT_MUTED,
} from "../constants/colors";
import { HERO_IMAGES } from "../constants/images";
import { RootStackParamList } from "../navigation/types";

type LearnScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Learn">;

const LODGE_FOREST = DEEP_FOREST;
const LODGE_AMBER = GRANITE_GOLD;

export default function LearnScreen() {
  const navigation = useNavigation<LearnScreenNavigationProp>();

  const {
    tracks,
    calculateModuleProgress,
    calculateTrackProgress,
    getModulesByTrack,
    isTrackUnlocked,
    getTotalXP,
    getCurrentLevel,
    getCompletedModules,
  } = useLearningStore();

  const [selectedTrack, setSelectedTrack] = useState<SkillLevel>("novice");

  const totalXP = getTotalXP();
  const currentLevel = getCurrentLevel();
  const completedModules = getCompletedModules();

  const currentTrackModules = getModulesByTrack(selectedTrack);
  const currentTrackProgress = calculateTrackProgress(selectedTrack);

  const handleModulePress = (moduleId: string) => {
    navigation.navigate("ModuleDetail", { moduleId });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-[#f0f9f4] text-forest";
      case "Intermediate":
        return "bg-[#fef3c7] text-[#92400e]";
      case "Advanced":
        return "bg-[#fee2e2] text-[#991b1b]";
      default:
        return "bg-[#f5f5f4] text-earthGreen";
    }
  };

  const insets = useSafeAreaInsets();
  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT_BACKGROUND }}>
      {/* Hero Image - full bleed */}
      <View style={{ height: 200 + insets.top }}>
        <ImageBackground
          source={HERO_IMAGES.LEARNING}
          style={{ flex: 1 }}
          resizeMode="cover"
          accessibilityLabel="Learning and education scene"
        >
          {/* Gradient Overlay - covers full image including safe area */}
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />
          <View className="flex-1" style={{ paddingTop: insets.top }}>
            {/* Account Button - Top Right */}
            <AccountButtonHeader color={TEXT_ON_DARK} />

            {/* Title at bottom left */}
            <View className="flex-1 justify-end px-6 pb-4">
              <Text className="text-3xl" style={{ fontFamily: "Raleway_700Bold", color: TEXT_ON_DARK, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, zIndex: 1 }}>
                Learn
              </Text>
              <Text className="mt-2" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_ON_DARK, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, zIndex: 1 }}>
                Master camping skills from novice to expert
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: bottomSpacer }}
        >
          {/* XP Bar */}
          <XPBar
            currentXP={totalXP}
            level={currentLevel}
            nextLevelXP={tracks.find((t) => !isTrackUnlocked(t.level))?.xpRequired}
          />

          {/* Track Tabs */}
          <View className="flex-row mb-4 bg-parchment rounded-xl p-1 border border-parchmentDark">
            {tracks.map((track) => {
              const unlocked = isTrackUnlocked(track.level);
              const isSelected = selectedTrack === track.level;

              return (
                <Pressable
                  key={track.id}
                  onPress={() => unlocked && setSelectedTrack(track.level)}
                  className={`flex-1 py-3 px-2 rounded-lg items-center justify-end ${
                    isSelected ? "" : unlocked ? "bg-parchment" : "bg-sierraSky/10"
                  }`}
                  style={[
                    { minHeight: 64 },
                    isSelected && { backgroundColor: EARTH_GREEN },
                  ]}
                  disabled={!unlocked}
                >
                  {isSelected && unlocked && (
                    <Text className="text-center text-2xl mb-1" style={{ fontFamily: "Raleway_700Bold" }}>🧭</Text>
                  )}
                  {!unlocked && <Text className="text-center text-lg mb-1" style={{ fontFamily: "SourceSans3_400Regular" }}>🔒</Text>}
                  {unlocked && !isSelected && <View style={{ height: 24 }} />}
                  <Text
                    className={`text-center font-semibold text-sm leading-tight ${
                      isSelected
                        ? "text-parchment"
                        : unlocked
                        ? "text-forest"
                        : "text-earthGreen"
                    }`}
                    style={{ lineHeight: 16 }}
                  >
                    {track.title === "Trail Leader" ? "Trail\nLeader" : track.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Track Overview Card */}
          {tracks.map((track) => {
            if (track.level !== selectedTrack) return null;
            return (
              <View key={track.id} className="mb-6">
                <View
                  className="rounded-xl p-4 mb-4 border"
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Heading3 color={TEXT_PRIMARY_STRONG}>Track progress</Heading3>
                    <View className="bg-sierraSky/20 rounded-full px-3 py-1 border border-sierraSky">
                      <Text className="text-riverRock font-medium" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                        {currentTrackProgress.completed}/{currentTrackProgress.total} Complete
                      </Text>
                    </View>
                  </View>
                  <View className="bg-parchmentDark/20 rounded-full h-3 mb-2">
                    <View
                      className="bg-granite h-3 rounded-full"
                      style={{
                        width: `${currentTrackProgress.percentage}%`,
                        backgroundColor: GRANITE_GOLD,
                      }}
                    />
                  </View>
                  <Text className="text-sm text-center" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                    {currentTrackProgress.xpEarned}/{currentTrackProgress.xpTotal} XP earned in
                    this track
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Modules */}
          <View className="space-y-4">
            {currentTrackModules.map((module) => {
              const isCompleted = completedModules.includes(module.id);
              const progress = calculateModuleProgress(module.id);

              return (
                <Pressable
                  key={module.id}
                  onPress={() => handleModulePress(module.id)}
                  className="rounded-xl p-4 border active:opacity-80"
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`rounded-full p-3 mr-4 ${
                        isCompleted ? "bg-forest" : "bg-sierraSky/20"
                      }`}
                    >
                      <Ionicons
                        name={module.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={isCompleted ? "white" : LODGE_FOREST}
                      />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-2">
                        <Heading3 color={TEXT_PRIMARY_STRONG} className="flex-1" numberOfLines={2}>
                          {module.title}
                        </Heading3>
                        {isCompleted && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={LODGE_FOREST}
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </View>

                      <Text className="mb-3" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }} numberOfLines={3}>
                        {module.description}
                      </Text>

                      <View className="flex-row items-center flex-wrap">
                        <View className={`rounded-full px-2 py-1 ${getDifficultyColor(module.difficulty)}`}>
                          <Text className="text-xs font-medium" style={{ fontFamily: "SourceSans3_600SemiBold" }}>{module.difficulty}</Text>
                        </View>
                        <Text className="text-sm ml-2" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                          {progress.completed}/{progress.total} complete
                        </Text>
                      </View>

                      <View className="flex-row items-center mt-2 space-x-3">
                        <View className="flex-row items-center">
                          <Ionicons name="time-outline" size={14} color={EARTH_GREEN} />
                          <Text className="text-sm ml-1" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>{module.duration}</Text>
                        </View>
                        {module.xpReward && (
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={14} color={GRANITE_GOLD} />
                            <Text className="text-sm font-semibold ml-1" style={{ fontFamily: "SourceSans3_600SemiBold", color: GRANITE_GOLD }}>
                              +{module.xpReward} XP
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Lessons Preview */}
                      <View className="mt-3 pt-3 border-t" style={{ borderColor: BORDER_SOFT }}>
                        <Text className="text-sm font-medium mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: GRANITE_GOLD }}>
                          What you&apos;ll learn:
                        </Text>
                        <View className="space-y-1">
                          {module.steps.slice(0, 2).map((step, index) => (
                            <View key={index} className="flex-row items-center">
                              <View
                                className="w-1.5 h-1.5 bg-granite rounded-full mr-2"
                                style={{ marginTop: 6 }}
                              />
                              <Text
                                className="text-sm"
                                style={{ flex: 1, flexShrink: 1, fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                              >
                                {step.title}
                              </Text>
                            </View>
                          ))}
                          {module.steps.length > 2 && (
                            <Text className="text-sm ml-3.5" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                              +{module.steps.length - 2} more topics
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Badge Preview */}
                      {module.badge && (
                        <View
                          className="mt-3 pt-3 border-t flex-row items-center"
                          style={{ borderColor: BORDER_SOFT }}
                        >
                          <Ionicons name={module.badge.icon as any} size={20} color={GRANITE_GOLD} />
                          <Text
                            className="text-sm font-medium ml-2"
                            style={{ flex: 1, flexShrink: 1, fontFamily: "SourceSans3_600SemiBold", color: GRANITE_GOLD }}
                          >
                            Earn Badge: {module.badge.name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
    </View>
  );
}
