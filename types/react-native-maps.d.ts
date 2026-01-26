declare module "react-native-maps" {
  import { Component } from "react";
  import { ViewProps, ViewStyle } from "react-native";

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface MapViewProps extends ViewProps {
    provider?: "google" | null;
    style?: ViewStyle;
    region?: Region;
    initialRegion?: Region;
    showsUserLocation?: boolean;
    showsMyLocationButton?: boolean;
    onRegionChange?: (region: Region) => void;
    onRegionChangeComplete?: (region: Region) => void;
    children?: React.ReactNode;
  }

  export interface MarkerProps {
    coordinate: LatLng;
    title?: string;
    description?: string;
    pinColor?: string;
    children?: React.ReactNode;
  }

  export class MapView extends Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
    fitToCoordinates(coordinates: LatLng[], options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }): void;
  }

  export class Marker extends Component<MarkerProps> {}

  export const PROVIDER_DEFAULT: null;
  export const PROVIDER_GOOGLE: "google";

  export default MapView;
}
