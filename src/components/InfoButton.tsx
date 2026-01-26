import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Theme colors
const DEEP_FOREST = "#485952";
const PARCHMENT = "#F4EBD0";

interface InfoButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

export const InfoButton: React.FC<InfoButtonProps> = ({
  onPress,
  color = DEEP_FOREST,
  size = 22,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Ionicons name="information-circle-outline" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});

export default InfoButton;
