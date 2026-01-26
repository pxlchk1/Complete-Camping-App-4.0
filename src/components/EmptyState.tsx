import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEEP_FOREST, EARTH_GREEN, PARCHMENT } from '../constants/colors';

type EmptyStateProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export default function EmptyState({
  iconName,
  title,
  message,
  ctaLabel,
  onPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={iconName} size={64} color={EARTH_GREEN} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {ctaLabel && onPress && (
        <Pressable
          onPress={onPress}
          style={styles.button}
          className="active:opacity-90"
        >
          <Text style={styles.buttonText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginTop: 32,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 20,
    color: DEEP_FOREST,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 16,
    color: EARTH_GREEN,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: DEEP_FOREST,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14,
    color: PARCHMENT,
  },
});
