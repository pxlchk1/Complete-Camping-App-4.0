import "react-native-get-random-values";
import "./global.css";

import { LogBox } from "react-native";
import { registerRootComponent } from "expo";

import App from "./App";

// DO NOT REMOVE THIS CODE
// (Moved below imports to keep Metro/ESM parsing stable for EAS builds.)
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log("[index] Project ID is:", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
}

LogBox.ignoreLogs(["Expo AV has been deprecated", "Disconnected from Metro"]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
