import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useGearStore } from "../state/gearStore";
import { Heading2, BodyText } from "../components/Typography";
import Button from "../components/Button";
import AccountButton from "../components/AccountButton";
import { RootStackParamList } from "../navigation/types";
import { Pressable } from "react-native";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";
import { EMPTY_STATE_IMAGES } from "../constants/images";

type GearListsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "GearLists"
>;

export default function GearListsScreen() {
  const navigation = useNavigation<GearListsScreenNavigationProp>();
  const packingLists = useGearStore((s) => s.packingLists);
  const getPackingProgress = useGearStore((s) => s.getPackingProgress);

  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-parchmentDark">
        <View className="flex-row items-center justify-between mb-2">
          <Heading2>Packing lists</Heading2>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => navigation.navigate("CreateGearList", {})}
              className="w-10 h-10 rounded-full bg-forest items-center justify-center active:bg-forest"
            >
              <Ionicons name="add" size={24} color={PARCHMENT} />
            </Pressable>
            <AccountButton />
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {packingLists.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Image
              source={EMPTY_STATE_IMAGES.PACKING}
              style={{ width: 200, height: 200, marginBottom: 16 }}
              resizeMode="contain"
            />
            <Text className="text-[#16492f] text-lg font-semibold mb-2" style={{ fontFamily: "Raleway_600SemiBold" }}>
              No packing lists yet
            </Text>
            <BodyText className="text-center mb-6 px-8">
              Create a packing list to organize your camping gear
            </BodyText>
            <Button icon="add" onPress={() => navigation.navigate("CreateGearList", {})}>
              Create List
            </Button>
          </View>
        ) : (
          <View className="py-4">
            {packingLists.map((list) => {
              const progress = getPackingProgress(list.id);
              return (
                <Pressable
                  key={list.id}
                  onPress={() =>
                    navigation.navigate("GearListDetail", { listId: list.id })
                  }
                  className="bg-parchment rounded-2xl p-4 border border-parchmentDark mb-3 active:bg-parchment"
                >
                  <Text className="text-[#16492f] text-base font-semibold mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                    {list.name}
                  </Text>
                  <View className="flex-row items-center mb-3">
                    <Text className="text-earthGreen text-sm" style={{ fontFamily: "SourceSans3_400Regular" }}>
                      {progress.packed} / {progress.total} items packed
                    </Text>
                  </View>
                  {/* Progress Bar */}
                  <View className="h-2 bg-[#f0f9f4] rounded-full overflow-hidden">
                    <View
                      className="h-full bg-forest rounded-full"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </View>
                  <Text className="text-earthGreen text-xs mt-2" style={{ fontFamily: "SourceSans3_400Regular" }}>
                    {progress.percentage}% complete
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
