import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Park } from "../types/camping";
import { fonts, fontSizes, spacing } from "../theme/theme";
import { DEEP_FOREST, LIST_ROW_DEFAULT, LIST_ROW_ALT } from "../constants/colors";

interface ParkListItemProps {
  park: Park;
  onPress?: (park: Park) => void;
  index?: number;
}

const getParkTypeLabel = (filter: string): string => {
  switch (filter) {
    case "national_park":
      return "National Park";
    case "state_park":
      return "State Park";
    case "national_forest":
      return "National Forest";
    default:
      return filter;
  }
};

export default function ParkListItem({ park, onPress, index = 0 }: ParkListItemProps) {
  // Alternate background: even rows get default, odd rows get 10% darker
  const isOddRow = index % 2 === 1;
  const backgroundColor = isOddRow ? LIST_ROW_ALT : LIST_ROW_DEFAULT;

  return (
    <Pressable
      onPress={() => onPress?.(park)}
      style={({ pressed }) => ({
        backgroundColor: backgroundColor,
        paddingVertical: 10,
        paddingHorizontal: 14,
        opacity: pressed ? 0.7 : 1,
        // Separator line inside the item container at bottom
        borderBottomWidth: 1,
        borderBottomColor: "#DDD6C4",
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {/* Content block - tightly grouped */}
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          {/* Park Name */}
          <Text
            style={{
              fontFamily: fonts.displaySemibold,
              fontSize: fontSizes.md,
              color: DEEP_FOREST,
              lineHeight: fontSizes.md * 1.25,
            }}
            numberOfLines={2}
          >
            {park.name}
          </Text>

          {/* Meta row: State pill + Park type - small gap from name */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            {park.state && (
              <View
                style={{
                  backgroundColor: "#E8F4E8",
                  borderRadius: 999,
                  paddingHorizontal: 7,
                  paddingVertical: 1,
                  marginRight: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyRegular,
                    fontSize: 11,
                    color: "#5A7856",
                  }}
                >
                  {park.state}
                </Text>
              </View>
            )}
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: 11,
                color: "#5A7856",
              }}
            >
              {getParkTypeLabel(park.filter)}
            </Text>
          </View>

          {/* Address row - very tight to meta row */}
          {park.address ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 3 }}>
              <Ionicons 
                name="location-outline" 
                size={11} 
                color="#8A9580" 
                style={{ marginTop: 1 }} 
              />
              <Text
                style={{
                  fontFamily: fonts.bodyRegular,
                  fontSize: 11,
                  color: "#8A9580",
                  marginLeft: 3,
                  lineHeight: 14,
                  flex: 1,
                }}
                numberOfLines={2}
              >
                {park.address}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action icon - vertically centered to the grouped block */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "#EBE7DC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="compass-outline" size={18} color={DEEP_FOREST} />
        </View>
      </View>
    </Pressable>
  );
}
