import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { OnboardingTooltip } from '../types/onboarding';

// Theme colors from the app
const DEEP_FOREST = "#485952";
const PARCHMENT = "#F4EBD0";

interface OnboardingModalProps {
  visible: boolean;
  tooltip: OnboardingTooltip | null;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  tooltip,
  onDismiss,
}) => {
  if (!tooltip) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>
            {tooltip.title}
          </Text>
          <Text style={styles.message}>
            {tooltip.message}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'flex-start',
    backgroundColor: PARCHMENT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'SourceSans3_600SemiBold',
    fontWeight: '600',
    color: DEEP_FOREST,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontFamily: 'SourceSans3_400Regular',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 24,
    color: DEEP_FOREST,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: 'center',
    minWidth: 120,
    backgroundColor: DEEP_FOREST,
  },
  buttonText: {
    color: PARCHMENT,
    fontSize: 16,
    fontFamily: 'SourceSans3_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OnboardingModal;
