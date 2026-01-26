/**
 * Add Itinerary Link Modal
 * Modal for adding trail maps, routes, permits organized by trip day
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, parseISO } from 'date-fns';
import {
  ItineraryLink,
  ItineraryMoment,
  MOMENT_OPTIONS,
  CreateItineraryLinkData,
} from '../types/itinerary';
import { sniffProvider, normalizeUrl, ProviderInfo } from '../utils/providerSniffer';
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from '../constants/colors';

interface DayOption {
  value: number;
  label: string;
  date: Date;
}

interface AddItineraryLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CreateItineraryLinkData) => Promise<void>;
  tripStartDate: string;
  tripEndDate: string;
  /** For edit mode - prefill with existing link */
  editingLink?: ItineraryLink | null;
}

export default function AddItineraryLinkModal({
  visible,
  onClose,
  onSave,
  tripStartDate,
  tripEndDate,
  editingLink,
}: AddItineraryLinkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dayIndex, setDayIndex] = useState(1);
  const [moment, setMoment] = useState<ItineraryMoment | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);

  // Generate day options from trip dates
  const dayOptions = useMemo((): DayOption[] => {
    const start = parseISO(tripStartDate);
    const end = parseISO(tripEndDate);
    const options: DayOption[] = [];
    
    let current = start;
    let day = 1;
    while (current <= end) {
      options.push({
        value: day,
        label: `Day ${day} · ${format(current, 'EEE, MMM d')}`,
        date: current,
      });
      current = addDays(current, 1);
      day++;
    }
    
    // Ensure at least one day
    if (options.length === 0) {
      options.push({
        value: 1,
        label: `Day 1 · ${format(start, 'EEE, MMM d')}`,
        date: start,
      });
    }
    
    return options;
  }, [tripStartDate, tripEndDate]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (editingLink) {
        setUrl(editingLink.url);
        setTitle(editingLink.title);
        setNote(editingLink.note || '');
        setDayIndex(editingLink.dayIndex);
        setMoment(editingLink.moment);
        setProviderInfo(sniffProvider(editingLink.url));
      } else {
        setUrl('');
        setTitle('');
        setNote('');
        setDayIndex(1);
        setMoment(undefined);
        setProviderInfo(null);
      }
      setError('');
      setSaving(false);
    }
  }, [visible, editingLink]);

  // Detect provider when URL changes
  useEffect(() => {
    if (url.trim()) {
      const info = sniffProvider(url);
      setProviderInfo(info);
      
      // Auto-suggest title if empty
      if (!title.trim() && !editingLink) {
        setTitle(info.suggestedTitle);
      }
    } else {
      setProviderInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleSave = async () => {
    // Validate URL
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('Please enter a valid URL (e.g., https://alltrails.com/...)');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await onSave({
        url: normalized,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        dayIndex,
        moment,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = !!editingLink;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.modal}>
          {/* Header - Deep Forest Green background */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit itinerary link' : 'Add itinerary link'}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={PARCHMENT} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* URL Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Link</Text>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="Paste URL (e.g., alltrails.com/trail/...)"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus={!isEditMode}
              />
              
              {/* Provider preview */}
              {providerInfo && url.trim() && (
                <View style={styles.providerPreview}>
                  <Ionicons
                    name={providerInfo.icon as any}
                    size={16}
                    color={EARTH_GREEN}
                  />
                  <Text style={styles.providerLabel}>{providerInfo.label}</Text>
                </View>
              )}
            </View>

            {/* Title Field (optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>Title (optional)</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={providerInfo?.suggestedTitle || 'e.g., Morning hike to summit'}
                placeholderTextColor={TEXT_MUTED}
              />
            </View>

            {/* Day Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Trip day</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dayScroller}
              >
                {dayOptions.map((day) => (
                  <Pressable
                    key={day.value}
                    onPress={() => setDayIndex(day.value)}
                    style={[
                      styles.dayChip,
                      dayIndex === day.value && styles.dayChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        dayIndex === day.value && styles.dayChipTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Moment Selector (optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>When (optional)</Text>
              <View style={styles.momentContainer}>
                {MOMENT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMoment(moment === opt.value ? undefined : opt.value)}
                    style={[
                      styles.momentChip,
                      moment === opt.value && styles.momentChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.momentChipText,
                        moment === opt.value && styles.momentChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Note Field (optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g., After lunch, we'll hike to Half Dome..."
                placeholderTextColor={TEXT_MUTED}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Error */}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={PARCHMENT} />
                  <Text style={styles.saveText}>Save link</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modal: {
    backgroundColor: PARCHMENT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: DEEP_FOREST,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 24,
    color: PARCHMENT,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 8,
  },
  input: {
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_PRIMARY_STRONG,
  },
  noteInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  providerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  providerLabel: {
    fontSize: 13,
    fontFamily: 'SourceSans3_400Regular',
    color: EARTH_GREEN,
    marginLeft: 6,
  },
  dayScroller: {
    marginHorizontal: -4,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    marginHorizontal: 4,
  },
  dayChipSelected: {
    backgroundColor: DEEP_FOREST,
    borderColor: DEEP_FOREST,
  },
  dayChipText: {
    fontSize: 13,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_SECONDARY,
  },
  dayChipTextSelected: {
    color: PARCHMENT,
  },
  momentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  momentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    margin: 4,
  },
  momentChipSelected: {
    backgroundColor: EARTH_GREEN,
    borderColor: EARTH_GREEN,
  },
  momentChipText: {
    fontSize: 13,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_SECONDARY,
  },
  momentChipTextSelected: {
    color: PARCHMENT,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    fontFamily: 'SourceSans3_400Regular',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_SOFT,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_MUTED,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DEEP_FOREST,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontFamily: 'SourceSans3_600SemiBold',
    color: PARCHMENT,
    marginLeft: 6,
  },
});
