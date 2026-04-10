import React, { useEffect } from "react";
import { View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../state/authStore";
import { isPremiumUser, setFreePremiumTripId, getFreePremiumTripId } from "../utils/entitlements";
import { trackTripCreated } from "../services/analyticsService";
import { trackCoreAction } from "../services/userActionTrackerService";
import CreateTripModal from "../components/CreateTripModal";
import { PARCHMENT } from "../constants/colors";

type CreateTripScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CreateTrip"
>;

type CreateTripScreenRouteProp = RouteProp<RootStackParamList, "CreateTrip">;

export default function CreateTripScreen() {
  const navigation = useNavigation<CreateTripScreenNavigationProp>();
  const route = useRoute<CreateTripScreenRouteProp>();
  const currentUser = useAuthStore((s) => s.user);
  const prefillLocation = route.params?.prefillLocation;

  // Gate: Redirect free users who already have a trip
  useEffect(() => {
    const checkEntitlement = async () => {
      if (!isPremiumUser() && currentUser?.id) {
        const existingTripId = await getFreePremiumTripId(currentUser.id);
        if (existingTripId) {
          navigation.replace("Paywall", { triggerKey: "second_trip" });
        }
      }
    };
    checkEntitlement();
  }, [currentUser?.id, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <CreateTripModal
        visible={true}
        prefillLocation={prefillLocation}
        onClose={() => navigation.goBack()}
        onTripCreated={async (tripId) => {
          if (!isPremiumUser() && currentUser?.id) {
            const existingId = await getFreePremiumTripId(currentUser.id);
            if (!existingId) {
              await setFreePremiumTripId(currentUser.id, tripId);
            }
          }
          trackTripCreated(tripId);
          if (currentUser?.id) {
            trackCoreAction(currentUser.id, "trip_created");
          }
          navigation.replace("TripDetail", { tripId });
        }}
      />
    </View>
  );
}
