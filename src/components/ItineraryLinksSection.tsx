/**
 * Itinerary Links Section
 * Displays trip itinerary links grouped by day with empty state
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ItineraryLink,
  MOMENT_OPTIONS,
  CreateItineraryLinkData,
} from '../types/itinerary';
import {
  getItineraryLinks,
  createItineraryLink,
  updateItineraryLink,
  deleteItineraryLink,
  groupLinksByDay,
} from '../services/itineraryLinksService';
import { getProviderIcon } from '../utils/providerSniffer';
import AddItineraryLinkModal from './AddItineraryLinkModal';
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

interface ItineraryLinksSectionProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  onAddLink?: () => void;
}

export default function ItineraryLinksSection({
  tripId,
  tripStartDate,
  tripEndDate,
}: ItineraryLinksSectionProps) {
  const [links, setLinks] = useState<ItineraryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ItineraryLink | null>(null);

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getItineraryLinks(tripId);
      setLinks(data);
    } catch (error) {
      console.error('Failed to load itinerary links:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleAddLink = async (data: CreateItineraryLinkData) => {
    if (editingLink) {
      await updateItineraryLink(tripId, editingLink.id, data);
    } else {
      await createItineraryLink(tripId, data);
    }
    await loadLinks();
    setEditingLink(null);
  };

  const handleOpenLink = async (link: ItineraryLink) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const canOpen = await Linking.canOpenURL(link.url);
      if (canOpen) {
        await Linking.openURL(link.url);
      } else {
        Alert.alert('Cannot open link', 'Unable to open this URL.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open link.');
    }
  };

  const handleEditLink = (link: ItineraryLink) => {
    setEditingLink(link);
    setShowAddModal(true);
  };

  const handleDeleteLink = (link: ItineraryLink) => {
    Alert.alert(
      'Delete link',
      `Are you sure you want to delete "${link.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItineraryLink(tripId, link.id);
              await loadLinks();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Error', 'Failed to delete link.');
            }
          },
        },
      ]
    );
  };

  const handleCopyLink = async (link: ItineraryLink) => {
    try {
      await Clipboard.setStringAsync(link.url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied', 'Link copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy link.');
    }
  };

  const handleLinkActions = (link: ItineraryLink) => {
    Alert.alert(
      link.title,
      undefined,
      [
        { text: 'Open', onPress: () => handleOpenLink(link) },
        { text: 'Edit', onPress: () => handleEditLink(link) },
        { text: 'Copy link', onPress: () => handleCopyLink(link) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteLink(link) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getDayLabel = (dayIndex: number): string => {
    const start = parseISO(tripStartDate);
    const date = addDays(start, dayIndex - 1);
    return `Day ${dayIndex} · ${format(date, 'EEE, MMM d')}`;
  };

  const getMomentLabel = (moment?: string): string => {
    if (!moment) return '';
    const option = MOMENT_OPTIONS.find((m) => m.value === moment);
    return option?.label || '';
  };

  const groupedLinks = groupLinksByDay(links);
  const isEmpty = links.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="map-outline" size={20} color={DEEP_FOREST} />
          <Text style={styles.headerTitle}>Itinerary Links</Text>
        </View>
        {!isEmpty && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEditingLink(null);
              setShowAddModal(true);
            }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={18} color={DEEP_FOREST} />
            <Text style={styles.addButtonText}>Add link</Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={EARTH_GREEN} />
        </View>
      ) : isEmpty ? (
        /* Empty State */
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Trail maps, routes, permits, and plans, organized by day.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setEditingLink(null);
              setShowAddModal(true);
            }}
            style={styles.emptyButton}
          >
            <Ionicons name="add-circle-outline" size={18} color={PARCHMENT} />
            <Text style={styles.emptyButtonText}>Add link</Text>
          </Pressable>
        </View>
      ) : (
        /* Populated State - Links grouped by day */
        <View style={styles.linksList}>
          {Array.from(groupedLinks.entries()).map(([dayIndex, dayLinks]) => (
            <View key={dayIndex} style={styles.dayGroup}>
              <Text style={styles.dayHeader}>{getDayLabel(dayIndex)}</Text>
              {dayLinks.map((link) => (
                <Pressable
                  key={link.id}
                  onPress={() => handleOpenLink(link)}
                  onLongPress={() => handleLinkActions(link)}
                  style={styles.linkRow}
                >
                  <View style={styles.linkIcon}>
                    <Ionicons
                      name={getProviderIcon(link.provider) as any}
                      size={18}
                      color={EARTH_GREEN}
                    />
                  </View>
                  <View style={styles.linkContent}>
                    <Text style={styles.linkTitle} numberOfLines={1}>
                      {link.title}
                    </Text>
                    {link.note && (
                      <Text style={styles.linkNote} numberOfLines={1}>
                        {link.note}
                      </Text>
                    )}
                    <View style={styles.linkMeta}>
                      <View style={styles.providerChip}>
                        <Text style={styles.providerChipText}>{link.providerLabel}</Text>
                      </View>
                      {link.moment && (
                        <Text style={styles.momentText}>{getMomentLabel(link.moment)}</Text>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleLinkActions(link)}
                    style={styles.moreButton}
                    hitSlop={8}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color={TEXT_MUTED} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Add/Edit Modal */}
      <AddItineraryLinkModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingLink(null);
        }}
        onSave={handleAddLink}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        editingLink={editingLink}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_PRIMARY_STRONG,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f9f4',
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: 'SourceSans3_600SemiBold',
    color: DEEP_FOREST,
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DEEP_FOREST,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'SourceSans3_600SemiBold',
    color: PARCHMENT,
    marginLeft: 6,
  },
  linksList: {
    paddingVertical: 8,
  },
  dayGroup: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayHeader: {
    fontSize: 13,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_MUTED,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f9f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
    marginRight: 8,
  },
  linkTitle: {
    fontSize: 15,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 2,
  },
  linkNote: {
    fontSize: 13,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerChip: {
    backgroundColor: '#e8f4ec',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  providerChipText: {
    fontSize: 11,
    fontFamily: 'SourceSans3_600SemiBold',
    color: EARTH_GREEN,
  },
  momentText: {
    fontSize: 12,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_MUTED,
    marginLeft: 8,
  },
  moreButton: {
    padding: 4,
  },
});
