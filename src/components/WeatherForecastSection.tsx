/**
 * Weather Forecast Section
 * Displays trip weather forecast in a boxed format similar to Itinerary Links
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { WeatherForecast } from '../types/camping';
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

interface WeatherForecastSectionProps {
  forecast: WeatherForecast[];
  locationName: string;
  lastUpdated: string;
  onViewMore: () => void;
  onChangeLocation?: () => void;
  tripStartDate?: string; // ISO date string
}

const getWeatherIcon = (condition: string): keyof typeof Ionicons.glyphMap => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('rain')) return 'rainy';
  if (lower.includes('cloud')) return 'cloudy';
  if (lower.includes('sun') || lower.includes('clear')) return 'sunny';
  if (lower.includes('snow')) return 'snow';
  if (lower.includes('thunder')) return 'thunderstorm';
  if (lower.includes('wind')) return 'cloudy';
  if (lower.includes('drizzle')) return 'rainy';
  return 'partly-sunny';
};

export default function WeatherForecastSection({
  forecast,
  locationName,
  lastUpdated,
  onViewMore,
  onChangeLocation,
  tripStartDate,
}: WeatherForecastSectionProps) {
  // Calculate days until trip
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripStart = tripStartDate ? new Date(tripStartDate) : null;
  if (tripStart) tripStart.setHours(0, 0, 0, 0);
  const daysUntilTrip = tripStart ? Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isTripFarAway = daysUntilTrip > 10;

  // Filter forecast based on trip timing
  let displayForecast: WeatherForecast[];
  if (isTripFarAway) {
    // More than 10 days away - only show today's weather
    displayForecast = forecast.slice(0, 1);
  } else {
    // Show up to 5 days
    displayForecast = forecast.slice(0, 5);
  }
  const isEmpty = !forecast || forecast.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="partly-sunny-outline" size={20} color={DEEP_FOREST} />
          <Text style={styles.headerTitle}>Weather Forecast</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onViewMore();
          }}
          style={styles.viewMoreButton}
        >
          <Text style={styles.viewMoreText}>View More</Text>
          <Ionicons name="chevron-forward" size={16} color={EARTH_GREEN} />
        </Pressable>
      </View>

      {/* Location */}
      <View style={styles.locationRow}>
        <Ionicons name="location" size={14} color={EARTH_GREEN} />
        <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
        {onChangeLocation && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChangeLocation();
            }}
            style={{ marginRight: 8 }}
          >
            <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: EARTH_GREEN }}>change</Text>
          </Pressable>
        )}
        <Text style={styles.updatedText}>
          Updated {format(new Date(lastUpdated), 'MMM d, h:mm a')}
        </Text>
      </View>

      {/* Content */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No forecast data available. Tap "View More" to check the weather.
          </Text>
        </View>
      ) : (
        <>
          {isTripFarAway && (
            <View style={styles.farAwayNote}>
              <Ionicons name="calendar-outline" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.farAwayText}>
                Your trip is {daysUntilTrip} days away. Full forecast will be available closer to your trip date.
              </Text>
            </View>
          )}
          <View style={styles.forecastList}>
            {displayForecast.map((day, index) => (
              <View key={day.date} style={[styles.forecastRow, index === displayForecast.length - 1 && styles.lastRow]}>
                <View style={styles.dateColumn}>
                  <Text style={styles.dayName}>
                    {index === 0 ? 'Today' : format(new Date(day.date), 'EEE')}
                  </Text>
                  <Text style={styles.dateText}>{format(new Date(day.date), 'MMM d')}</Text>
                </View>
              
                <View style={styles.conditionColumn}>
                  <Ionicons name={getWeatherIcon(day.condition)} size={24} color={DEEP_FOREST} />
                  <Text style={styles.conditionText} numberOfLines={1}>{day.condition}</Text>
                </View>
              
                <View style={styles.tempColumn}>
                  <Text style={styles.highTemp}>{Math.round(day.high)}°</Text>
                  <Text style={styles.lowTemp}>{Math.round(day.low)}°</Text>
                </View>
              
                {day.precipitation !== undefined && day.precipitation > 0 && (
                  <View style={styles.precipColumn}>
                    <Ionicons name="water" size={12} color="#5BA4E5" />
                    <Text style={styles.precipText}>{day.precipitation}%</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}
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
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 13,
    fontFamily: 'SourceSans3_600SemiBold',
    color: EARTH_GREEN,
    marginRight: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f7f2',
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_PRIMARY_STRONG,
    marginLeft: 6,
    flex: 1,
  },
  updatedText: {
    fontSize: 11,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_MUTED,
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
    lineHeight: 20,
  },
  farAwayNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#faf9f5',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  farAwayText: {
    fontSize: 13,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_SECONDARY,
    marginLeft: 8,
    flex: 1,
  },
  forecastList: {
    paddingVertical: 4,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  dateColumn: {
    width: 60,
  },
  dayName: {
    fontSize: 14,
    fontFamily: 'SourceSans3_600SemiBold',
    color: TEXT_PRIMARY_STRONG,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  conditionColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  conditionText: {
    fontSize: 13,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_SECONDARY,
    marginLeft: 8,
  },
  tempColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  highTemp: {
    fontSize: 16,
    fontFamily: 'SourceSans3_700Bold',
    color: TEXT_PRIMARY_STRONG,
    width: 36,
    textAlign: 'right',
  },
  lowTemp: {
    fontSize: 14,
    fontFamily: 'SourceSans3_400Regular',
    color: TEXT_MUTED,
    marginLeft: 4,
    width: 32,
  },
  precipColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    width: 40,
  },
  precipText: {
    fontSize: 12,
    fontFamily: 'SourceSans3_400Regular',
    color: '#5BA4E5',
    marginLeft: 2,
  },
});
