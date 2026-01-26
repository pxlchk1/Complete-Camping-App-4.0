import React, { useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useGearStore } from "../state/gearStore";
import { Heading2, BodyText } from "../components/Typography";
import Button from "../components/Button";
import AccountButton from "../components/AccountButton";
import { RootStackParamList } from "../navigation/types";
import { hapticLight } from "../utils/haptics";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

type GearListDetailScreenRouteProp = RouteProp<RootStackParamList, "GearListDetail">;
type GearListDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "GearListDetail"
>;

export default function GearListDetailScreen() {
  const navigation = useNavigation<GearListDetailScreenNavigationProp>();
  const route = useRoute<GearListDetailScreenRouteProp>();
  const { listId } = route.params;

  const list = useGearStore((s) => s.getPackingListById(listId));
  const toggleItemPacked = useGearStore((s) => s.toggleItemPacked);
  const getPackingProgress = useGearStore((s) => s.getPackingProgress);

  useEffect(() => {
    if (!list) {
      navigation.goBack();
    }
  }, [list, navigation]);

  if (!list) {
    return null;
  }

  const progress = getPackingProgress(listId);

  const handleToggleItem = async (categoryId: string, itemId: string) => {
    await hapticLight();
    toggleItemPacked(listId, categoryId, itemId);
  };

  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-parchmentDark">
        <View className="flex-row items-center mb-2 justify-between">
          <View className="flex-row items-center flex-1">
            <Button
              variant="ghost"
              size="sm"
              icon="arrow-back"
              onPress={() => navigation.goBack()}
              className="mr-2"
            >
              Back
            </Button>
          </View>
          <AccountButton />
        </View>
        <Heading2>{list.name}</Heading2>
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-earthGreen text-sm" style={{ fontFamily: "SourceSans3_400Regular" }}>
              {progress.packed} / {progress.total} items packed
            </Text>
            <Text className="text-forest text-sm font-semibold" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              {progress.percentage}%
            </Text>
          </View>
          {/* Progress Bar */}
          <View className="h-2 bg-[#f0f9f4] rounded-full overflow-hidden">
            <View
              className="h-full bg-forest rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="py-4">
          {list.categories.map((category) => (
            <View key={category.id} className="mb-6">
              <Text className="text-[#16492f] text-lg font-semibold mb-3" style={{ fontFamily: "Raleway_600SemiBold" }}>
                {category.name}
              </Text>
              {category.items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggleItem(category.id, item.id)}
                  className="flex-row items-center py-3 border-b border-parchmentDark active:bg-parchment"
                >
                  <View
                    className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                      item.packed
                        ? "bg-forest border-[#1e5f3f]"
                        : "bg-parchment border-[#b9e7cb]"
                    }`}
                  >
                    {item.packed && <Ionicons name="checkmark" size={16} color={PARCHMENT} />}
                  </View>
                  <Text
                    className={`flex-1 text-base ${
                      item.packed ? "text-earthGreen line-through" : "text-[#16492f]"
                    }`}
                  >
                    {item.name}
                  </Text>
                  {item.quantity && (
                    <Text className="text-earthGreen text-sm ml-2" style={{ fontFamily: "SourceSans3_400Regular" }}>×{item.quantity}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
