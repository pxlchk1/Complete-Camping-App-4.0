import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useDerivedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFireflyTime } from '../../context/FireflyTimeContext';

const fireflyImg =
  'https://us.chat-img.sintra.ai/eaaa7422-d90b-4566-ae9c-fbb0bb6700a6/f0a7ca2b-8edc-4824-bbda-44bc7b9893de/firefly.png';

const FIREFLY_WIDTH = 19;
const FIREFLY_HEIGHT = 20;

export default function FireflyLoader() {
  const frameShared = useFireflyTime();
  
  // Container dimensions - use shared values for smooth updates
  const containerWidth = useSharedValue(200);
  const containerHeight = useSharedValue(200);
  const [isReady, setIsReady] = useState(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    containerWidth.value = width;
    containerHeight.value = height;
    if (!isReady) setIsReady(true);
  };

  // Calculate positions using useDerivedValue for smooth animation
  const animatedValues = useDerivedValue(() => {
    'worklet';
    const frame = frameShared.value;
    const width = containerWidth.value;
    const height = containerHeight.value;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 36;

    // Path point calculation within the container
    const getPathPoint = (t: number) => {
      return {
        x: centerX + radius * Math.sin(t),
        y: centerY + (radius / 2) * Math.sin(t) * Math.cos(t),
      };
    };

    // Head (yellow side) is at the leading point on the path
    const tHead = frame;

    // Abdomen (green side) trails behind the head along the path
    const BODY_LENGTH = FIREFLY_WIDTH - 4;
    let tAbdomen = tHead;
    let dist = 0;
    let last = getPathPoint(tHead);

    while (dist < BODY_LENGTH) {
      tAbdomen -= 0.0025;
      const pt = getPathPoint(tAbdomen);
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      dist += Math.sqrt(dx * dx + dy * dy);
      last = pt;
    }

    const head = getPathPoint(tHead);
    const abdomen = getPathPoint(tAbdomen);

    const angleRad = Math.atan2(abdomen.y - head.y, abdomen.x - head.x);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Center the image so the left edge (head) visually leads
    const imgCenterX = head.x + (FIREFLY_WIDTH / 2) * Math.cos(angleRad);
    const imgCenterY = head.y + (FIREFLY_WIDTH / 2) * Math.sin(angleRad);

    // Glow at the abdomen
    const GLOW_OFFSET = FIREFLY_WIDTH * 0.6;
    const glowX = head.x + GLOW_OFFSET * Math.cos(angleRad);
    const glowY = head.y + GLOW_OFFSET * Math.sin(angleRad);

    // Pulse the glow over time
    const glowOpacity = 0.4 + 0.6 * Math.abs(Math.sin(frame * 2));

    return {
      centerX: imgCenterX,
      centerY: imgCenterY,
      glowX,
      glowY,
      angleDeg,
      glowOpacity,
    };
  });

  // Animated styles for glow
  const glowStyle = useAnimatedStyle(() => {
    return {
      left: animatedValues.value.glowX - 13,
      top: animatedValues.value.glowY - 9,
      opacity: animatedValues.value.glowOpacity,
      shadowOpacity: animatedValues.value.glowOpacity,
    };
  });

  // Animated styles for firefly image
  const fireflyStyle = useAnimatedStyle(() => {
    return {
      left: animatedValues.value.centerX - FIREFLY_WIDTH / 2,
      top: animatedValues.value.centerY - FIREFLY_HEIGHT / 3,
      transform: [{ rotate: `${animatedValues.value.angleDeg}deg` }],
    };
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Semi-transparent overlay to ensure visibility over native components */}
      <View style={styles.overlay} />
      {isReady && (
        <>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.Image
            source={{ uri: fireflyImg }}
            style={[
              {
                position: 'absolute',
                width: FIREFLY_WIDTH,
                height: FIREFLY_HEIGHT,
                zIndex: 10000,
              },
              fireflyStyle,
            ]}
            resizeMode="contain"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'none', // do not block touches
    zIndex: 9999,
    elevation: 9999, // for Android to ensure it renders above native views like MapView
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // semi-transparent overlay for visibility
  },
  glow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 247, 0, 0.33)',
    shadowColor: '#FFF700',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
