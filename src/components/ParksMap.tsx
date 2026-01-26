import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Park } from "../types/camping";
import { DEEP_FOREST, PARCHMENT, BORDER_SOFT, EARTH_GREEN } from "../constants/colors";

interface ParksMapProps {
  parks: Park[];
  userLocation: { latitude: number; longitude: number } | null;
  mode: "near" | "search" | "state" | "distance";
  onParkPress?: (park: Park) => void;
}

export default function ParksMap({ parks, userLocation, mode, onParkPress }: ParksMapProps) {
  const mapRef = useRef<MapView>(null);

  // Update map region when parks or mode changes
  useEffect(() => {
    if (!mapRef.current) return;

    // If there are parks, fit to show all of them
    if (parks.length > 0) {
      const coordinates = parks.map((park) => ({
        latitude: park.latitude,
        longitude: park.longitude,
      }));

      // Add user location if in "near me" mode
      if (mode === "near" && userLocation) {
        coordinates.push(userLocation);
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    } else if (mode === "near" && userLocation) {
      // If no parks but we have user location, center on user
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 3,
        longitudeDelta: 3,
      });
    }
  }, [parks, userLocation, mode]);

  // Default region (centered on US)
  const defaultRegion = {
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 30,
  };

  // Get initial region based on mode
  const getInitialRegion = () => {
    if (mode === "near" && userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 3,
        longitudeDelta: 3,
      };
    }
    return defaultRegion;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={mode === "near"}
        showsMyLocationButton={false}
      >
        {/* Render park markers */}
        {parks.map((park) => (
          <Marker
            key={park.id}
            coordinate={{
              latitude: park.latitude,
              longitude: park.longitude,
            }}
          >
            <TouchableOpacity
              onPress={() => onParkPress?.(park)}
              style={styles.markerContainer}
              activeOpacity={0.7}
            >
              <View style={styles.marker} />
            </TouchableOpacity>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DEEP_FOREST,
    borderWidth: 2,
    borderColor: PARCHMENT,
  },
});
