import React, { createContext, useContext, useState, useCallback } from "react";
import { View, Text, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info";

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const [opacity] = useState(new Animated.Value(0));

  const show = useCallback((msg: string, toastType: ToastType = "info") => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacity]);

  const showError = useCallback((msg: string) => show(msg, "error"), [show]);
  const showSuccess = useCallback((msg: string) => show(msg, "success"), [show]);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#16a34a";
      case "error":
        return "#dc2626";
      default:
        return "#3b82f6";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      default:
        return "information-circle";
    }
  };

  return (
    <ToastContext.Provider value={{ show, showError, showSuccess }}>
      {children}
      {visible && (
        <SafeAreaView
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
          edges={["top"]}
        >
          <Animated.View
            style={{
              opacity,
              marginHorizontal: 16,
              marginTop: 8,
              backgroundColor: getBackgroundColor(),
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Ionicons name={getIcon()} size={24} color="white" />
            <Text
              style={{
                color: "white",
                fontSize: 14,
                fontFamily: "SourceSans3_600SemiBold",
                marginLeft: 12,
                flex: 1,
              }}
            >
              {message}
            </Text>
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastContext.Provider>
  );
};
