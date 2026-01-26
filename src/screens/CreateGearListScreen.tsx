import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useGearStore } from "../state/gearStore";
import { Heading2 } from "../components/Typography";
import Button from "../components/Button";
import AccountButton from "../components/AccountButton";
import { RootStackParamList } from "../navigation/types";
import { GearCategory, GearItem } from "../types/camping";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

type CreateGearListScreenRouteProp = RouteProp<RootStackParamList, "CreateGearList">;
type CreateGearListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CreateGearList"
>;

const GEAR_TEMPLATES: GearCategory[] = [
  {
    id: "shelter",
    name: "Shelter",
    items: [
      { id: "tent", name: "Tent", packed: false },
      { id: "stakes", name: "Tent stakes", packed: false },
      { id: "sleeping-bag", name: "Sleeping bag", packed: false },
      { id: "sleeping-pad", name: "Sleeping pad", packed: false },
      { id: "pillow", name: "Pillow", packed: false },
    ],
  },
  {
    id: "cooking",
    name: "Cooking",
    items: [
      { id: "stove", name: "Camp stove", packed: false },
      { id: "fuel", name: "Fuel", packed: false },
      { id: "cookware", name: "Cookware", packed: false },
      { id: "utensils", name: "Utensils", packed: false },
      { id: "water-bottle", name: "Water bottles", packed: false },
    ],
  },
  {
    id: "clothing",
    name: "Clothing",
    items: [
      { id: "jacket", name: "Rain jacket", packed: false },
      { id: "layers", name: "Base layers", packed: false },
      { id: "pants", name: "Hiking pants", packed: false },
      { id: "socks", name: "Extra socks", packed: false },
      { id: "hat", name: "Hat", packed: false },
    ],
  },
  {
    id: "essentials",
    name: "Essentials",
    items: [
      { id: "first-aid", name: "First aid kit", packed: false },
      { id: "headlamp", name: "Headlamp", packed: false },
      { id: "knife", name: "Knife/multi-tool", packed: false },
      { id: "fire-starter", name: "Fire starter", packed: false },
      { id: "map", name: "Map & compass", packed: false },
    ],
  },
];

export default function CreateGearListScreen() {
  const navigation = useNavigation<CreateGearListScreenNavigationProp>();
  const route = useRoute<CreateGearListScreenRouteProp>();
  const { tripId } = route.params;

  const addPackingList = useGearStore((s) => s.addPackingList);
  const [listName, setListName] = useState("");

  const handleCreate = () => {
    if (!listName.trim()) {
      alert("Please enter a list name");
      return;
    }

    const listId = addPackingList({
      name: listName.trim(),
      tripId,
      categories: GEAR_TEMPLATES,
    });

    navigation.navigate("GearListDetail", { listId });
  };

  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 border-b border-parchmentDark">
          <View className="flex-row items-center justify-between">
            <Heading2>Create packing list</Heading2>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full bg-[#f0f9f4] items-center justify-center active:bg-[#dcf3e5]"
              >
                <Text className="text-forest text-lg" style={{ fontFamily: "SourceSans3_400Regular" }}>✕</Text>
              </Pressable>
              <AccountButton />
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {/* List Name */}
          <View className="mb-6">
            <Text className="text-[#16492f] text-base font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>List Name</Text>
            <TextInput
              value={listName}
              onChangeText={setListName}
              placeholder="e.g., Weekend Camping Essentials"
              placeholderTextColor="#999"
              className="bg-parchment border border-parchmentDark rounded-xl px-4 py-3 text-base text-[#16492f]"
            />
          </View>

          {/* Template Preview */}
          <View className="mb-6">
            <Text className="text-[#16492f] text-base font-semibold mb-3" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              Template includes:
            </Text>
            {GEAR_TEMPLATES.map((category) => (
              <View key={category.id} className="mb-3">
                <View className="flex-row items-center mb-2">
                  <View className="w-2 h-2 rounded-full bg-forest mr-2" />
                  <Text className="text-[#16492f] font-medium" style={{ fontFamily: "SourceSans3_600SemiBold" }}>{category.name}</Text>
                  <Text className="text-earthGreen ml-2" style={{ fontFamily: "SourceSans3_400Regular" }}>({category.items.length} items)</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="px-5 pb-5 pt-3 border-t border-parchmentDark">
          <Button onPress={handleCreate} fullWidth icon="checkmark-circle">
            Create List
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
