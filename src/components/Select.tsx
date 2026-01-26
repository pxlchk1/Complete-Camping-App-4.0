import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, ScrollView, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  options?: SelectOption[];
  "aria-label"?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedLabel?: string;
  setSelectedLabel: (label: string) => void;
} | null>(null);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select");
  }
  return context;
};

export function Select({
  value,
  onValueChange,
  placeholder,
  disabled,
  children,
  options,
  "aria-label": ariaLabel,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  useEffect(() => {
    if (options) {
      const selectedOption = options.find((opt) => opt.value === value);
      setSelectedLabel(selectedOption?.label || "");
    }
  }, [value, options]);

  const contextValue = {
    value,
    onValueChange: (newValue: string) => {
      onValueChange(newValue);
      setIsOpen(false);
    },
    isOpen,
    setIsOpen,
    disabled,
    placeholder,
    selectedLabel,
    setSelectedLabel,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
  className,
  disabled,
  "aria-label": ariaLabel,
}: SelectTriggerProps) {
  const { isOpen, setIsOpen, disabled: selectDisabled } = useSelectContext();
  const isDisabled = disabled || selectDisabled;

  return (
    <Pressable
      onPress={() => {
        if (!isDisabled) {
          Keyboard.dismiss();
          setIsOpen(!isOpen);
        }
      }}
      className={cn(
        "flex-row items-center justify-between rounded-xl border px-3 py-3 min-h-[48px] bg-parchment border-parchmentDark",
        isDisabled && "opacity-60",
        isOpen && "border-[#485952]",
        className
      )}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ expanded: isOpen, disabled: isDisabled }}
    >
      <View className="flex-1">{children}</View>
      <Ionicons
        name={isOpen ? "chevron-up" : "chevron-down"}
        size={20}
        color={isDisabled ? "#757575" : "#485952"}
      />
    </Pressable>
  );
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const { value, selectedLabel, placeholder: selectPlaceholder } =
    useSelectContext();

  const displayText =
    selectedLabel || value || placeholder || selectPlaceholder || "Select...";
  const isPlaceholder = !value;

  return (
    <Text
      className={cn(
        "text-base",
        isPlaceholder ? "text-earthGreen" : "text-forest",
        className
      )}
      numberOfLines={1}
    >
      {displayText}
    </Text>
  );
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { isOpen, setIsOpen } = useSelectContext();

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => setIsOpen(false)}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-center px-4"
        onPress={() => setIsOpen(false)}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className={cn(
              "rounded-2xl border shadow-lg max-h-80 overflow-hidden bg-parchment border-parchmentDark",
              className
            )}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {children}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SelectItem({
  value,
  children,
  disabled,
  className,
}: SelectItemProps) {
  const { value: selectedValue, onValueChange, setSelectedLabel } =
    useSelectContext();
  const isSelected = selectedValue === value;

  const handlePress = () => {
    if (!disabled) {
      onValueChange(value);
      if (typeof children === "string") {
        setSelectedLabel(children);
      }
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        "px-4 py-3 border-b last:border-b-0 border-parchmentDark",
        isSelected && "bg-parchment",
        disabled && "opacity-50",
        className
      )}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={cn(
            "text-base",
            isSelected ? "text-forest font-semibold" : "text-forest",
            disabled && "text-[#9a9a9a]"
          )}
        >
          {children}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
        )}
      </View>
    </Pressable>
  );
}
