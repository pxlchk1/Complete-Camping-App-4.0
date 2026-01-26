import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { colors, spacing, radius, fonts, fontSizes } from "../theme/theme";
import { DEEP_FOREST, EARTH_GREEN, CARD_BACKGROUND_LIGHT, BORDER_SOFT, TEXT_PRIMARY_STRONG, TEXT_SECONDARY, PARCHMENT } from "../constants/colors";

export type FilterMode = "distance" | "state";
export type ParkType = "all" | "state_park" | "national_park" | "national_forest";
export type DriveTime = 2 | 4 | 6 | 8 | 12;
export type SortOption = "distance" | "name";

// All US States and Territories - alphabetically sorted
export const US_STATES: { value: string; label: string }[] = [
  { value: "", label: "Select a state" },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AS", label: "American Samoa" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "GU", label: "Guam" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "MP", label: "Northern Mariana Islands" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "PR", label: "Puerto Rico" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "VI", label: "U.S. Virgin Islands" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

interface ParkFilterBarProps {
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  driveTime: DriveTime;
  onDriveTimeChange: (time: DriveTime) => void;
  parkType: ParkType;
  onParkTypeChange: (type: ParkType) => void;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  zipCode?: string;
  onZipCodeChange?: (zip: string) => void;
  onZipCodeSubmit?: () => void;
  onLocationRequest: (location: { latitude: number; longitude: number }) => void;
  onLocationError: (error: string) => void;
  hasLocation?: boolean;
  viewMode?: "map" | "list";
  onViewModeChange?: (mode: "map" | "list") => void;
}

const DRIVE_TIME_OPTIONS: { value: DriveTime; label: string }[] = [
  { value: 2, label: "2 hr" },
  { value: 4, label: "4 hr" },
  { value: 6, label: "6 hr" },
  { value: 8, label: "8 hr" },
  { value: 12, label: "12 hr" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "distance", label: "distance" },
  { value: "name", label: "name" },
];

const PARK_TYPE_OPTIONS: { value: ParkType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "all", label: "All Parks", icon: "leaf" },
  { value: "state_park", label: "State Parks", icon: "flag" },
  { value: "national_park", label: "National Parks", icon: "shield" },
  { value: "national_forest", label: "National Forests", icon: "leaf-outline" },
];

export default function ParkFilterBar({
  mode,
  onModeChange,
  selectedState,
  onStateChange,
  driveTime,
  onDriveTimeChange,
  parkType,
  onParkTypeChange,
  sortBy = "distance",
  onSortChange,
  zipCode = "",
  onZipCodeChange,
  onZipCodeSubmit,
  onLocationRequest,
  onLocationError,
  hasLocation = false,
  viewMode = "list",
  onViewModeChange,
}: ParkFilterBarProps) {
  const [locationLoading, setLocationLoading] = useState(false);
  const [showWithinModal, setShowWithinModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showParkTypeModal, setShowParkTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

  const handleLocationPress = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        onLocationError("Location permission not granted");
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      onLocationRequest({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      onLocationError("Failed to get location");
    } finally {
      setLocationLoading(false);
    }
  };

  const getStateLabel = () => {
    if (!selectedState) return "Select a state";
    const state = US_STATES.find((s) => s.value === selectedState);
    return state?.label || selectedState;
  };

  const getParkTypeLabel = () => {
    const type = PARK_TYPE_OPTIONS.find((t) => t.value === parkType);
    return type?.label || "All Parks";
  };

  return (
    <View style={{ marginBottom: spacing.sm }}>
      {/* Mode Toggle - Segmented Control Style */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: PARCHMENT,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: BORDER_SOFT,
          padding: 2,
          marginBottom: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => onModeChange("distance")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: radius.sm,
            backgroundColor: mode === "distance" ? DEEP_FOREST : "transparent",
            gap: 4,
          }}
        >
          <Ionicons
            name="location"
            size={14}
            color={mode === "distance" ? PARCHMENT : TEXT_SECONDARY}
          />
          <Text
            style={{
              fontFamily: fonts.bodySemibold,
              fontSize: 11,
              lineHeight: 13,
              color: mode === "distance" ? PARCHMENT : TEXT_SECONDARY,
            }}
          >
            Location +{"\n"}Drive Time
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onModeChange("state")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: radius.sm,
            backgroundColor: mode === "state" ? DEEP_FOREST : "transparent",
            gap: 4,
          }}
        >
          <Ionicons
            name="map"
            size={14}
            color={mode === "state" ? PARCHMENT : TEXT_SECONDARY}
          />
          <Text
            style={{
              fontFamily: fonts.bodySemibold,
              fontSize: 11,
              lineHeight: 13,
              color: mode === "state" ? PARCHMENT : TEXT_SECONDARY,
            }}
          >
            Browse by{"\n"}State
          </Text>
        </Pressable>

        {/* Map/List Toggle Icons */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderLeftWidth: 1,
            borderLeftColor: BORDER_SOFT,
            marginLeft: 6,
            paddingLeft: 6,
          }}
        >
          <Pressable
            onPress={() => onViewModeChange?.("list")}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: viewMode === "list" ? DEEP_FOREST : "transparent",
            }}
          >
            <Ionicons name="list" size={16} color={viewMode === "list" ? PARCHMENT : TEXT_SECONDARY} />
          </Pressable>
          <Pressable
            onPress={() => onViewModeChange?.("map")}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 2,
              backgroundColor: viewMode === "map" ? DEEP_FOREST : "transparent",
            }}
          >
            <Ionicons name="map-outline" size={16} color={viewMode === "map" ? PARCHMENT : TEXT_SECONDARY} />
          </Pressable>
        </View>
      </View>

      {/* Location Mode Controls */}
      {mode === "distance" && (
        <View
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            padding: spacing.sm,
          }}
        >
          {/* Location Row */}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
            {/* Use My Location Button */}
            <Pressable
              onPress={handleLocationPress}
              disabled={locationLoading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                backgroundColor: hasLocation ? DEEP_FOREST : PARCHMENT,
                borderWidth: 1,
                borderColor: hasLocation ? DEEP_FOREST : BORDER_SOFT,
                gap: 6,
              }}
            >
              <Ionicons
                name={locationLoading ? "hourglass-outline" : "navigate"}
                size={16}
                color={hasLocation ? PARCHMENT : EARTH_GREEN}
              />
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: fontSizes.sm,
                  color: hasLocation ? PARCHMENT : EARTH_GREEN,
                }}
              >
                {locationLoading ? "Getting..." : "Use my location"}
              </Text>
            </Pressable>

            {/* Zip Code Input with Search Button */}
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={zipCode}
                onChangeText={onZipCodeChange}
                onSubmitEditing={onZipCodeSubmit}
                placeholder="or zip"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="number-pad"
                maxLength={5}
                returnKeyType="search"
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingRight: 36,
                  borderRadius: radius.md,
                  backgroundColor: PARCHMENT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  fontFamily: fonts.bodyRegular,
                  fontSize: fontSizes.sm,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
              {zipCode.length === 5 && (
                <Pressable
                  onPress={onZipCodeSubmit}
                  style={{
                    position: "absolute",
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: EARTH_GREEN,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="search" size={16} color={PARCHMENT} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Within & Sort Dropdowns */}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {/* Within Dropdown */}
            <Pressable
              onPress={() => setShowWithinModal(true)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 8,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: PARCHMENT,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: fontSizes.sm,
                  color: TEXT_SECONDARY,
                }}
              >
                Within
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyRegular,
                    fontSize: fontSizes.sm,
                    color: TEXT_PRIMARY_STRONG,
                  }}
                >
                  {driveTime} hr
                </Text>
                <Ionicons name="chevron-down" size={14} color={TEXT_SECONDARY} />
              </View>
            </Pressable>

            {/* Sort Dropdown */}
            <Pressable
              onPress={() => setShowSortModal(true)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 8,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: PARCHMENT,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: fontSizes.sm,
                  color: TEXT_SECONDARY,
                }}
              >
                Sort
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyRegular,
                    fontSize: fontSizes.sm,
                    color: TEXT_PRIMARY_STRONG,
                  }}
                >
                  {sortBy}
                </Text>
                <Ionicons name="chevron-down" size={14} color={TEXT_SECONDARY} />
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* State Mode Controls */}
      {mode === "state" && (
        <Pressable
          onPress={() => setShowStateModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
          }}
        >
          <Text
            style={{
              fontFamily: selectedState ? fonts.bodyRegular : fonts.bodySemibold,
              fontSize: fontSizes.sm,
              color: selectedState ? TEXT_PRIMARY_STRONG : TEXT_SECONDARY,
            }}
          >
            {getStateLabel()}
          </Text>
          <Ionicons name="chevron-down" size={16} color={TEXT_SECONDARY} />
        </Pressable>
      )}

      {/* Park type Filter - Label + Dropdown */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: fontSizes.sm,
            color: TEXT_PRIMARY_STRONG,
          }}
        >
          Park type
        </Text>
        <Pressable
          onPress={() => setShowParkTypeModal(true)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 8,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={PARK_TYPE_OPTIONS.find(o => o.value === parkType)?.icon || "leaf"}
              size={14}
              color={EARTH_GREEN}
            />
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.sm,
                color: TEXT_PRIMARY_STRONG,
              }}
            >
              {getParkTypeLabel()}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      {/* Within Modal */}
      <Modal
        visible={showWithinModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowWithinModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowWithinModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: PARCHMENT,
              borderRadius: radius.lg,
              width: "80%",
              maxWidth: 400,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: fontSizes.md,
                  color: DEEP_FOREST,
                }}
              >
                Willing to drive
              </Text>
              <Pressable onPress={() => setShowWithinModal(false)}>
                <Ionicons name="close" size={28} color={DEEP_FOREST} />
              </Pressable>
            </View>

            <View style={{ padding: spacing.lg }}>
              {DRIVE_TIME_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onDriveTimeChange(option.value);
                    setShowWithinModal(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: BORDER_SOFT,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.sm,
                      color: DEEP_FOREST,
                    }}
                  >
                    {option.label}
                  </Text>
                  {driveTime === option.value && (
                    <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowSortModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: PARCHMENT,
              borderRadius: radius.lg,
              width: "80%",
              maxWidth: 400,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: fontSizes.md,
                  color: DEEP_FOREST,
                }}
              >
                Sort by
              </Text>
              <Pressable onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={28} color={DEEP_FOREST} />
              </Pressable>
            </View>

            <View style={{ padding: spacing.lg }}>
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSortChange?.(option.value);
                    setShowSortModal(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: BORDER_SOFT,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.sm,
                      color: DEEP_FOREST,
                    }}
                  >
                    {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Park Type Modal - Keep as fallback */}
      <Modal
        visible={showParkTypeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowParkTypeModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowParkTypeModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: PARCHMENT,
              borderRadius: radius.lg,
              width: "80%",
              maxWidth: 400,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: fontSizes.md,
                  color: DEEP_FOREST,
                }}
              >
                Park type
              </Text>
              <Pressable onPress={() => setShowParkTypeModal(false)}>
                <Ionicons name="close" size={28} color={DEEP_FOREST} />
              </Pressable>
            </View>

            <View style={{ padding: spacing.lg }}>
              {PARK_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onParkTypeChange(option.value);
                    setShowParkTypeModal(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: BORDER_SOFT,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Ionicons name={option.icon} size={18} color={DEEP_FOREST} />
                    <Text
                      style={{
                        fontFamily: fonts.bodyRegular,
                        fontSize: fontSizes.sm,
                        color: DEEP_FOREST,
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {parkType === option.value && (
                    <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStateModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowStateModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: PARCHMENT,
              borderRadius: radius.lg,
              width: "85%",
              maxWidth: 400,
              maxHeight: "70%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: fontSizes.md,
                  color: DEEP_FOREST,
                }}
              >
                Select State
              </Text>
              <Pressable onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={28} color={DEEP_FOREST} />
              </Pressable>
            </View>

            <ScrollView style={{ padding: spacing.lg }}>
              {US_STATES.filter((s) => s.value !== "").map((state) => (
                <Pressable
                  key={state.value}
                  onPress={() => {
                    onStateChange(state.value);
                    setShowStateModal(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: BORDER_SOFT,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.sm,
                      color: DEEP_FOREST,
                    }}
                  >
                    {state.label}
                  </Text>
                  {selectedState === state.value && (
                    <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
