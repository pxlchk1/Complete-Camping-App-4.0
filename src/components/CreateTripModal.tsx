import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useCreateTrip } from "../state/tripsStore";
import { CampingStyle } from "../types/camping";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
  onTripCreated: (tripId: string) => void;
}

const CAMPING_STYLES: { value: CampingStyle; label: string; emoji: string }[] = [
  { value: "CAR_CAMPING", label: "Car camping", emoji: "🚗" },
  { value: "BACKPACKING", label: "Backpacking", emoji: "🎒" },
  { value: "RV", label: "RV camping", emoji: "🚐" },
  { value: "HAMMOCK", label: "Hammock camping", emoji: "🌳" },
  { value: "ROOFTOP_TENT", label: "Roof-top tent", emoji: "🏕️" },
  { value: "OVERLANDING", label: "Overlanding", emoji: "🚙" },
  { value: "BOAT_CANOE", label: "Boat/canoe", emoji: "🛶" },
  { value: "BIKEPACKING", label: "Bikepacking", emoji: "🚴" },
  { value: "WINTER", label: "Winter camping", emoji: "❄️" },
  { value: "DISPERSED", label: "Dispersed", emoji: "🏞️" },
];

export default function CreateTripModal({ visible, onClose, onTripCreated }: CreateTripModalProps) {
  const createTrip = useCreateTrip();

  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // NOTE: Destination removed - users will set destination via Plan > Parks after trip creation
  const [partySize, setPartySize] = useState("4");
  const [description, setDescription] = useState("");
  const [campingStyle, setCampingStyle] = useState<CampingStyle | undefined>(undefined);

  const getDuration = () => {
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Helper to derive season from a date
  function getSeason(date: Date): 'winter' | 'spring' | 'summer' | 'fall' {
    const month = date.getMonth();
    if (month === 11 || month === 0 || month === 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'fall';
  }

  const handleCreateTrip = async () => {
    if (!tripName.trim()) {
      return;
    }

    if (endDate <= startDate) {
      return;
    }

    const size = parseInt(partySize);
    if (isNaN(size) || size < 1 || size > 50) {
      return;
    }

    // Derive season from start date
    const season = getSeason(startDate);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // NOTE: No destination set here - users set destination via Plan > Parks after trip creation
      const tripId = await createTrip({
        name: tripName.trim(),
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        campingStyle,
        partySize: size,
        description: description.trim() || "", // Use empty string, not undefined (Firestore rejects undefined)
        status: "planning",
        season,
      });

      // Reset form
      setTripName("");
      setStartDate(new Date());
      setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setPartySize("4");
      setDescription("");
      setCampingStyle(undefined);

      onTripCreated(tripId);
    } catch (error) {
      console.error("Error creating trip:", error);
    }
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    setShowStartPicker(false);
    if (date) {
      setStartDate(date);
      // Auto-adjust end date if it's before the new start date
      if (endDate < date) {
        setEndDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleEndDateChange = (event: any, date?: Date) => {
    setShowEndPicker(false);
    if (date) {
      setEndDate(date);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black/40 justify-end"
      >
        <View className="bg-parchment rounded-t-3xl max-h-[90%]">
          {/* Header - Deep Forest Green background */}
          <View
            style={{
              paddingTop: 30,
              paddingHorizontal: 20,
              paddingBottom: 20,
              backgroundColor: DEEP_FOREST,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: PARCHMENT, flex: 1, marginRight: 12 }}>Plan New Trip</Text>
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

          <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
            {/* Trip Name */}
            <View className="mb-4">
              <Text className="text-forest text-sm font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Trip Name *</Text>
              <TextInput
                value={tripName}
                onChangeText={setTripName}
                placeholder="e.g., Yosemite Summer Adventure"
                placeholderTextColor="#999"
                className="bg-parchment border border-parchmentDark rounded-xl px-4 py-3 text-base text-forest"
              />
            </View>

            {/* Camping Style */}
            <View className="mb-4">
              <Text className="text-forest text-sm font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Camping Style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                <View className="flex-row gap-2 px-1">
                  {CAMPING_STYLES.map((style) => (
                    <Pressable
                      key={style.value}
                      onPress={() => setCampingStyle(style.value)}
                      className={`px-4 py-3 rounded-xl border ${
                        campingStyle === style.value
                          ? "bg-forest border-[#485952]"
                          : "bg-parchment border-parchmentDark"
                      }`}
                    >
                      <Text className="text-2xl mb-1" style={{ fontFamily: "Raleway_700Bold" }}>{style.emoji}</Text>
                      <Text
                        className={`text-sm font-medium ${
                          campingStyle === style.value ? "text-parchment" : "text-forest"
                        }`}
                      >
                        {style.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Dates */}
            <View className="mb-4">
              <Text className="text-forest text-sm font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Trip Dates *</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowStartPicker(true);
                  }}
                  className="flex-1 bg-parchment border border-parchmentDark rounded-xl px-4 py-3"
                >
                  <Text className="text-xs text-[#999] mb-1" style={{ fontFamily: "SourceSans3_400Regular" }}>Start</Text>
                  <Text className="text-base text-forest" style={{ fontFamily: "SourceSans3_400Regular" }}>
                    {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowEndPicker(true);
                  }}
                  className="flex-1 bg-parchment border border-parchmentDark rounded-xl px-4 py-3"
                >
                  <Text className="text-xs text-[#999] mb-1" style={{ fontFamily: "SourceSans3_400Regular" }}>End</Text>
                  <Text className="text-base text-forest" style={{ fontFamily: "SourceSans3_400Regular" }}>
                    {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </Pressable>
              </View>
              <Text className="text-xs text-[#999] mt-1" style={{ fontFamily: "SourceSans3_400Regular" }}>
                {getDuration()} {getDuration() === 1 ? "day" : "days"}
              </Text>
            </View>

            {/* NOTE: Destination field removed - users set destination via Plan > Parks after trip creation */}

            {/* Party Size */}
            <View className="mb-4">
              <Text className="text-forest text-sm font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Party Size *</Text>
              <TextInput
                value={partySize}
                onChangeText={setPartySize}
                placeholder="Number of people (1-50)"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                className="bg-parchment border border-parchmentDark rounded-xl px-4 py-3 text-base text-forest"
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-forest text-sm font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add notes about this trip..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-parchment border border-parchmentDark rounded-xl px-4 py-3 text-base text-forest min-h-[80px]"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-5 pb-5 pt-3 border-t border-parchmentDark">
            <Pressable
              onPress={handleCreateTrip}
              className="bg-[#AC9A6D] rounded-2xl px-4 py-4 items-center justify-center active:bg-[#9a8860]"
            >
              <Text className="text-parchment font-semibold text-base" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Create Trip</Text>
            </Pressable>
          </View>
        </View>

        {/* Start Date Picker Modal */}
        {showStartPicker && (
          <Modal visible transparent animationType="fade">
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={() => setShowStartPicker(false)}
            >
              <Pressable
                className="bg-parchment rounded-t-3xl p-5"
                onPress={(e) => e.stopPropagation()}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold text-forest" style={{ fontFamily: "Raleway_700Bold" }}>
                    Select Start Date
                  </Text>
                  <Pressable
                    onPress={() => setShowStartPicker(false)}
                    className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                    style={{ backgroundColor: "#f0f9f4" }}
                  >
                    <Ionicons name="close" size={24} color={DEEP_FOREST} />
                  </Pressable>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="inline"
                  onChange={handleStartDateChange}
                  themeVariant="light"
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* End Date Picker Modal */}
        {showEndPicker && (
          <Modal visible transparent animationType="fade">
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={() => setShowEndPicker(false)}
            >
              <Pressable
                className="bg-parchment rounded-t-3xl p-5"
                onPress={(e) => e.stopPropagation()}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold text-forest" style={{ fontFamily: "Raleway_700Bold" }}>
                    Select End Date
                  </Text>
                  <Pressable
                    onPress={() => setShowEndPicker(false)}
                    className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                    style={{ backgroundColor: "#f0f9f4" }}
                  >
                    <Ionicons name="close" size={24} color={DEEP_FOREST} />
                  </Pressable>
                </View>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="inline"
                  onChange={handleEndDateChange}
                  themeVariant="light"
                  minimumDate={startDate}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
