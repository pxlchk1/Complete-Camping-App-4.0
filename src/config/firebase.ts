import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAuth, initializeAuth } from "firebase/auth";
// @ts-expect-error - getReactNativePersistence is exported at runtime in RN but not in types
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration
// Note: These are public API keys that are safe to expose in client-side code
const firebaseConfig = {
  apiKey: "AIzaSyDDsvWlMgXvG3Ll0Xy77qBKu9lfbZIFr5I",
  authDomain: "tentandlanternapp.firebaseapp.com",
  projectId: "tentandlanternapp",
  storageBucket: "tentandlanternapp.firebasestorage.app",
  messagingSenderId: "566740556205",
  appId: "1:566740556205:web:4de26b23f756d30d096924",
  measurementId: "G-JBLW75CBHT"
};

// Initialize Firebase (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Auth with React Native persistence
let auth: ReturnType<typeof getAuth>;
try {
  auth = getApps().length === 1
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);
} catch (error) {
  // If already initialized, just get the existing instance
  auth = getAuth(app);
}

export { auth };
export default app;
