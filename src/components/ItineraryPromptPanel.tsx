/**
 * Itinerary Prompt Panel
 * Lightweight bottom sheet shown after trip creation to prompt adding itinerary links
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from '../constants/colors';

interface ItineraryPromptPanelProps {
  visible: boolean;
  onAddItinerary: () => void;
  onDismiss: () => void;
}

export default function ItineraryPromptPanel({
  visible,
  onAddItinerary,
  onDismiss,
}: ItineraryPromptPanelProps) {
  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddItinerary();
  };

  const handleDismissPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        
        <View style={styles.panel}>
          {/* Handle bar */}
          <View style={styles.handleBar} />
          
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="map-outline" size={28} color={EARTH_GREEN} />
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Want to add an itinerary?</Text>
          
          {/* Body */}
          <Text style={styles.body}>
            Drop in an AllTrails or onX link and we&apos;ll organize it by day.
          </Text>
          
          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable onPress={handleAddPress} style={styles.primaryButton}>
              <Ionicons name="add-circle-outline" size={18} color={PARCHMENT} />
              <Text style={styles.primaryButtonText}>Add itinerary link</Text>
            </Pressable>
            
            <Pressable onPress={handleDismissPress} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  panel: {
    backgroundColor: PARCHMENT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: BORDER_SOFT,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8f4ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Raleway_700Bold',
    color: TEXT_PRIMARY_STRONG,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DEEP_FOREST,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'SourceSans3_600SemiBold',
    color: PARCHMENT,
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_MUTED,
  },
});
