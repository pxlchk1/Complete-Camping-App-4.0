import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type EmptyStateProps = {
  title: string;
  body: string;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
};

export default function EmptyState({
  title,
  body,
  primaryLabel,
  onPrimaryPress,
}: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {primaryLabel && onPrimaryPress && (
          <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryPress}>
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  title: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16,
    color: '#485952',
    marginBottom: 8,
  },
  body: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14,
    color: '#485952',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#485952',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    color: '#F4EBD0',
  },
});
