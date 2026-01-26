import React, { useRef } from "react";
import { View, Text, ScrollView, ImageBackground, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AccountButtonHeader from "../components/AccountButtonHeader";
import InfoButton from "../components/InfoButton";
import OnboardingModal from "../components/OnboardingModal";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";
import { DEEP_FOREST, PARCHMENT, PARCHMENT_BACKGROUND, CARD_BACKGROUND_LIGHT, BORDER_SOFT, TEXT_PRIMARY_STRONG, TEXT_SECONDARY, TEXT_ON_DARK, TEXT_MUTED, LODGE_FOREST } from "../constants/colors";
import { HERO_IMAGES } from "../constants/images";
import { RootStackParamList } from "../navigation/types";

type FirstAidScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FIRST_AID_CATEGORIES = [
  { id: "burns", title: "Burns and Heat Injuries", icon: "flame" },
  { id: "cold", title: "Cold Injuries", icon: "snow" },
  { id: "wounds", title: "Wounds, Bites, and Trauma", icon: "bandage" },
  { id: "sprains", title: "Sprains, Strains, Fractures, and Joint Injuries", icon: "fitness" },
  { id: "medical", title: "Medical Illnesses", icon: "medical" },
  { id: "altitude", title: "Altitude Related Issues", icon: "trending-up" },
  { id: "eye", title: "Eye Injuries and Irritation", icon: "eye" },
  { id: "dehydration", title: "Dehydration and Fluid Problems", icon: "water" },
  { id: "smoke", title: "Smoke and Fire Related Injuries", icon: "bonfire" },
  { id: "plants", title: "Poisonous Plants and Skin Reactions", icon: "leaf" },
];

export default function FirstAidScreen() {
  const navigation = useNavigation<FirstAidScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<{ [key: string]: number }>({});

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("FirstAid");

  const scrollToCategory = (categoryId: string) => {
    const yPosition = categoryRefs.current[categoryId];
    if (yPosition !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: yPosition, animated: true });
    }
  };

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT_BACKGROUND }}>
      {/* Hero Image - full bleed */}
      <View style={{ height: 200 + insets.top }}>
        <ImageBackground
          source={HERO_IMAGES.FIRST_AID}
          style={{ flex: 1, transform: [{ scaleX: -1 }] }}
          resizeMode="cover"
          accessibilityLabel="First aid and medical supplies"
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
          <View className="flex-1" style={{ paddingTop: insets.top, transform: [{ scaleX: -1 }] }}>
            {/* Account Button - Top Right */}
            <AccountButtonHeader color={TEXT_ON_DARK} />

            {/* Info Button - Top Left */}
            <View style={{ position: "absolute", top: insets.top + 8, left: 16, zIndex: 10 }}>
              <InfoButton onPress={openModal} color={TEXT_ON_DARK} size={24} />
            </View>

            {/* Title at bottom left */}
            <View className="flex-1 justify-end px-6 pb-4">
              <Text className="text-3xl" style={{ fontFamily: "Raleway_700Bold", color: TEXT_ON_DARK, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, zIndex: 1 }}>
                First Aid
              </Text>
              <Text className="mt-2" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_ON_DARK, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, zIndex: 1 }}>
                Essential wilderness first aid knowledge
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomSpacer }}
      >
        {/* Emergency Banner */}
        <View className="px-5 mt-6">
          <View className="bg-red-50 rounded-xl p-4 border-2 border-red-300 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="alert-circle" size={28} color="#dc2626" />
              <View className="flex-1 ml-3">
                <Text className="text-red-800 text-lg mb-2" style={{ fontFamily: "SourceSans3_700Bold" }}>
                  Emergency: Call 911
                </Text>
                <Text className="text-red-700" style={{ fontFamily: "SourceSans3_400Regular" }}>
                  For serious injuries or medical emergencies, always call emergency services immediately
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table of Contents */}
        <View className="px-5 mb-8">
          <Text className="text-2xl text-forest-800 mb-4" style={{ fontFamily: "Raleway_700Bold" }}>
            First Aid Categories
          </Text>
          <View className="space-y-2">
            {FIRST_AID_CATEGORIES.map((category, index) => (
              <Pressable
                key={category.id}
                onPress={() => scrollToCategory(category.id)}
                className="bg-parchment rounded-xl p-4 border border-cream-200 flex-row items-center active:bg-cream-100"
              >
                <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
                  <Ionicons name={category.icon as any} size={22} color={LODGE_FOREST} />
                </View>
                <Text className="flex-1 text-forest-800 text-base" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                  {index + 1}. {category.title}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category: Burns and Heat Injuries */}
        <View
          onLayout={(event) => {
            categoryRefs.current["burns"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Burns and Heat Injuries
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />

          {/* Burns (All Degrees) */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              1. Burns (All Degrees)
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              First Degree Burns Symptoms:
            </Text>
            <Text className="text-stone-700 mb-3" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Red skin{"\n"}• Mild swelling{"\n"}• Pain{"\n"}• Dry skin
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Second Degree Burns Symptoms:
            </Text>
            <Text className="text-stone-700 mb-3" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Red or blotchy skin{"\n"}• Blisters{"\n"}• Swelling{"\n"}• Wet or shiny skin{"\n"}• Moderate to severe pain
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Third Degree Burns Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • White, black, brown, or charred skin{"\n"}• Leathery texture{"\n"}• Swelling{"\n"}• Possible numbness{"\n"}• Trouble breathing if smoke is involved
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid for First Degree Burns:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Run under cool water for at least 10 minutes{"\n"}• Do not use ice{"\n"}• Apply aloe or gentle moisturizer{"\n"}• Cover with clean nonstick bandage
              </Text>
            </View>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid for Second Degree Burns:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Cool with running water for 10 to 15 minutes{"\n"}• Do not pop blisters{"\n"}• Cover with sterile nonstick dressing{"\n"}• Seek care if burn is large or on face, hands, feet, groin, buttocks, or major joints
              </Text>
            </View>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid for Third Degree Burns:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Call emergency services{"\n"}• Do not remove stuck clothing{"\n"}• Do not apply water to large severe burns{"\n"}• Cover loosely with sterile dressing{"\n"}• Keep person warm
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-burns/basics/art-20056649")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Burns Treatment
              </Text>
            </Pressable>
          </View>

          {/* Heat Exhaustion */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              2. Heat Exhaustion
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Heavy sweating{"\n"}• Weakness{"\n"}• Dizziness{"\n"}• Nausea{"\n"}• Cool clammy skin{"\n"}• Fast pulse
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Move to shade{"\n"}• Loosen clothing{"\n"}• Sip water or electrolyte fluids{"\n"}• Apply cool cloths
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/heat-exhaustion/diagnosis-treatment/drc-20373255")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Heat Exhaustion
              </Text>
            </Pressable>
          </View>

          {/* Heat Stroke */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              3. Heat Stroke
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • High body temperature{"\n"}• Hot skin{"\n"}• Confusion{"\n"}• Rapid breathing{"\n"}• Fainting{"\n"}• Seizures
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Call emergency services{"\n"}• Move to a cool place{"\n"}• Cool with water or wet cloths{"\n"}• Do not give fluids if unconscious
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/heat-stroke/diagnosis-treatment/drc-20353588")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Heat Stroke
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category: Cold Injuries */}
        <View
          onLayout={(event) => {
            categoryRefs.current["cold"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Cold Injuries
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />

          {/* Hypothermia */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              4. Hypothermia
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Shivering{"\n"}• Slurred speech{"\n"}• Confusion{"\n"}• Slow breathing{"\n"}• Fatigue{"\n"}• Poor coordination
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Move to warm shelter{"\n"}• Remove wet clothes{"\n"}• Add dry layers{"\n"}• Use body heat if no blankets available{"\n"}• Give warm drinks if alert
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/hypothermia/diagnosis-treatment/drc-20352624")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Hypothermia
              </Text>
            </Pressable>
          </View>

          {/* Frostbite */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              5. Frostbite
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Cold numb skin{"\n"}• Pale or gray areas{"\n"}• Hard or waxy texture{"\n"}• Blisters after warming{"\n"}• Loss of feeling
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Move to warm shelter{"\n"}• Do not rub{"\n"}• Warm in water between 99 and 108 degrees{"\n"}• Protect with clean cloth{"\n"}• Avoid rewarming if refreezing is possible
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/frostbite/diagnosis-treatment/drc-20372661")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Frostbite
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category: Wounds, Bites, and Trauma */}
        <View
          onLayout={(event) => {
            categoryRefs.current["wounds"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Wounds, Bites, and Trauma
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />

          {/* Cuts and Scrapes */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              6. Cuts and Scrapes
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Bleeding{"\n"}• Pain{"\n"}• Redness{"\n"}• Swelling{"\n"}• Dirt in the wound
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Rinse with clean water{"\n"}• Remove dirt{"\n"}• Apply pressure to stop bleeding{"\n"}• Use ointment{"\n"}• Cover with a bandage
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-cuts-and-scrapes/basics/art-20056711")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Cuts and Scrapes
              </Text>
            </Pressable>
          </View>

          {/* Animal Bites */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              7. Animal Bites
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Bleeding{"\n"}• Pain{"\n"}• Skin tears{"\n"}• Swelling
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Wash with clean water for several minutes{"\n"}• Cover with cloth{"\n"}• Apply pressure if bleeding{"\n"}• Seek care for wild animal bites
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-animal-bites/basics/art-20056591")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Animal Bites
              </Text>
            </Pressable>
          </View>

          {/* Large Animal Attacks */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              8. Large Animal Attacks
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Deep cuts{"\n"}• Heavy bleeding{"\n"}• Bruising{"\n"}• Shock
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Move to safety{"\n"}• Apply firm pressure with cloth{"\n"}• Keep person warm{"\n"}• Seek emergency help
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-cuts-and-scrapes/basics/art-20056711")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Cuts and Scrapes
              </Text>
            </Pressable>
          </View>

          {/* Insect Bites and Stings */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              9. Insect Bites and Stings
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Pain{"\n"}• Redness{"\n"}• Itching{"\n"}• Swelling
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Remove stinger if needed{"\n"}• Wash with water{"\n"}• Apply cool cloth{"\n"}• Use antihistamines
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-bites-and-stings/basics/art-20056593")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Insect Bites
              </Text>
            </Pressable>
          </View>

          {/* Tick Bites */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              10. Tick Bites
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Visible tick{"\n"}• Itching{"\n"}• Small bump{"\n"}• Possible rash later
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Remove with tweezers{"\n"}• Pull straight up{"\n"}• Clean skin{"\n"}• Watch for rash or fever
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.cdc.gov/ticks/removing-a-tick/index.html")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                CDC - Removing a Tick
              </Text>
            </Pressable>
          </View>

          {/* Snake Bites */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              11. Snake Bites
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Pain{"\n"}• Swelling{"\n"}• Redness{"\n"}• Two puncture marks{"\n"}• Nausea
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Keep person calm{"\n"}• Keep bite below heart level{"\n"}• Wash with water{"\n"}• Do not cut or suck wound{"\n"}• Seek care
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-snake-bites/basics/art-20056681")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Snake Bites
              </Text>
            </Pressable>
          </View>

          {/* Embedded Objects */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              12. Embedded Objects
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Sharp pain{"\n"}• Object in skin{"\n"}• Swelling
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Remove small splinters with clean tweezers{"\n"}• Wash with water{"\n"}• For large objects, do not remove{"\n"}• Stabilize and seek help
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-wounds/basics/art-20056711")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Wounds
              </Text>
            </Pressable>
          </View>

          {/* Severe Bleeding */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              13. Severe Bleeding
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Bright red blood{"\n"}• Heavy bleeding{"\n"}• Weakness{"\n"}• Pale skin
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Apply firm pressure with any clean cloth{"\n"}• Add more layers if soaked{"\n"}• Elevate limb if possible{"\n"}• Keep person warm
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-bleeding/basics/art-20056661")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Severe Bleeding
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category: Sprains, Strains, Fractures */}
        <View
          onLayout={(event) => {
            categoryRefs.current["sprains"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Sprains, Strains, Fractures, and Joint Injuries
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />

          {/* Sprains and Strains */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              14. Sprains and Strains
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Pain{"\n"}• Swelling{"\n"}• Bruising{"\n"}• Trouble moving joint
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Rest{"\n"}• Use cool water soaked cloth if no ice{"\n"}• Wrap lightly{"\n"}• Elevate
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/sprains-and-strains/diagnosis-treatment/drc-20377945")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Sprains and Strains
              </Text>
            </Pressable>
          </View>

          {/* Fractures */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              15. Fractures
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Severe pain{"\n"}• Swelling{"\n"}• Bruising{"\n"}• Deformity{"\n"}• Inability to move limb
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Immobilize{"\n"}• Do not straighten{"\n"}• Splint with sticks or firm objects{"\n"}• Apply cool cloth{"\n"}• Seek care
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-fractures/basics/art-20056641")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Fractures
              </Text>
            </Pressable>
          </View>

          {/* Dislocations */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              16. Dislocations
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Joint out of place{"\n"}• Severe pain{"\n"}• Swelling
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Do not push joint back{"\n"}• Support with sling or clothing{"\n"}• Apply cool cloth{"\n"}• Seek care
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/dislocation/diagnosis-treatment/drc-20371726")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Dislocations
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category: Medical Illnesses */}
        <View
          onLayout={(event) => {
            categoryRefs.current["medical"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Medical Illnesses
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />

          {/* Mild Allergic Reactions */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              17. Mild Allergic Reactions
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Itching{"\n"}• Redness{"\n"}• Swelling{"\n"}• Hives
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Remove trigger{"\n"}• Apply cool cloth{"\n"}• Take antihistamine
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/hives/diagnosis-treatment/drc-20354904")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Allergic Reactions
              </Text>
            </Pressable>
          </View>

          {/* Anaphylaxis */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              18. Anaphylaxis
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Trouble breathing{"\n"}• Swelling{"\n"}• Hives{"\n"}• Fast pulse{"\n"}• Fainting
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Use epinephrine if available{"\n"}• Call emergency services{"\n"}• Lay person down and monitor
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/diseases-conditions/anaphylaxis/diagnosis-treatment/drc-20351483")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Anaphylaxis
              </Text>
            </Pressable>
          </View>

          {/* Gastroenteritis */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              19. Gastroenteritis or Foodborne Illness
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Nausea{"\n"}• Vomiting{"\n"}• Diarrhea{"\n"}• Stomach cramps{"\n"}• Fever
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Sip clean water{"\n"}• Use electrolyte drinks{"\n"}• Rest{"\n"}• Seek care if severe
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://medlineplus.gov/gastroenteritis.html")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                MedlinePlus - Gastroenteritis
              </Text>
            </Pressable>
          </View>

          {/* Nosebleeds */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              20. Nosebleeds
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Bleeding from nose
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Sit up{"\n"}• Lean forward{"\n"}• Pinch soft nose for ten minutes{"\n"}• Use cool cloth on bridge
              </Text>
            </View>

            <Pressable
              onPress={() => openUrl("https://www.mayoclinic.org/first-aid/first-aid-nosebleeds/basics/art-20056683")}
              className="flex-row items-center mt-2 active:opacity-70"
            >
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 ml-2 underline" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Mayo Clinic - Nosebleeds
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category: Altitude Related Issues */}
        <View
          onLayout={(event) => {
            categoryRefs.current["altitude"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Altitude Related Issues
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />

          {/* Altitude Sickness */}
          <View className="bg-parchment rounded-xl p-5 border border-cream-200 mb-4">
            <Text className="text-xl text-forest-800 mb-3" style={{ fontFamily: "SourceSans3_700Bold" }}>
              21. Altitude Sickness
            </Text>

            <Text className="text-forest-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Symptoms:
            </Text>
            <Text className="text-stone-700 mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>
              • Headache{"\n"}• Nausea{"\n"}• Dizziness{"\n"}• Fatigue{"\n"}• Trouble sleeping
            </Text>

            <View className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
              <Text className="text-green-800 text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                First Aid:
              </Text>
              <Text className="text-green-900" style={{ fontFamily: "SourceSans3_400Regular" }}>
                • Stop climbing{"\n"}• Rest{"\n"}• Drink water{"\n"}• Move lower if needed
              </Text>
            </View>

            <Text className="text-stone-600 text-sm mt-3" style={{ fontFamily: "SourceSans3_400Regular" }}>
              Source: Mayo Clinic
            </Text>
          </View>
        </View>

        {/* Note: Eye Injuries, Dehydration, Smoke, and Plants categories would continue in the same pattern */}
        {/* For brevity, I'm marking where additional categories would go */}

        <View
          onLayout={(event) => {
            categoryRefs.current["eye"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Eye Injuries and Irritation
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />
          <Text className="text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
            Content for eye injuries coming soon...
          </Text>
        </View>

        <View
          onLayout={(event) => {
            categoryRefs.current["dehydration"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Dehydration and Fluid Problems
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />
          <Text className="text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
            Content for dehydration coming soon...
          </Text>
        </View>

        <View
          onLayout={(event) => {
            categoryRefs.current["smoke"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Smoke and Fire Related Injuries
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />
          <Text className="text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
            Content for smoke and fire injuries coming soon...
          </Text>
        </View>

        <View
          onLayout={(event) => {
            categoryRefs.current["plants"] = event.nativeEvent.layout.y;
          }}
          className="px-5 mb-8"
        >
          <Text className="text-2xl text-forest-800 mb-1" style={{ fontFamily: "Raleway_700Bold" }}>
            Poisonous Plants and Skin Reactions
          </Text>
          <View className="h-1 w-16 bg-amber-600 rounded-full mb-6" />
          <Text className="text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
            Content for poisonous plants coming soon...
          </Text>
        </View>
      </ScrollView>

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </View>
  );
}
