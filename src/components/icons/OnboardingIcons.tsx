/**
 * Custom SVG hero icons for onboarding modals.
 *
 * Standard: 64×64 circular container with a themed illustration.
 * Palette derived from app constants (DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, PARCHMENT).
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Rect, G, Line } from "react-native-svg";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
} from "../../constants/colors";

const CIRCLE_SIZE = 64;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;

// ─── Shared container ───────────────────────────────────────────────────────

interface ContainerProps {
  bgColor: string;
  children: React.ReactNode;
}

function IconCircle({ bgColor, children }: ContainerProps) {
  return <View style={[styles.circle, { backgroundColor: bgColor }]}>{children}</View>;
}

// ─── 1. Push Notifications ──────────────────────────────────────────────────
// A bell with a small signal arc — conveys "stay connected" without the
// generic Ionicons look.

export function PushNotificationIcon() {
  return (
    <IconCircle bgColor={DEEP_FOREST + "14"}>
      <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
        {/* Bell body */}
        <Path
          d="M17 4C17 4 12 4 10 9C8.5 12.5 8.5 16 8.5 18L7 21C7 21 7 22.5 8.5 22.5H25.5C27 22.5 27 21 27 21L25.5 18C25.5 16 25.5 12.5 24 9C22 4 17 4 17 4Z"
          fill={DEEP_FOREST}
          opacity={0.85}
        />
        {/* Bell rim */}
        <Path
          d="M8.5 22.5H25.5"
          stroke={DEEP_FOREST}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        {/* Clapper */}
        <Path
          d="M14 25C14 26.657 15.343 28 17 28C18.657 28 20 26.657 20 25"
          stroke={DEEP_FOREST}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        {/* Signal arcs — right side */}
        <Path
          d="M26 8C27.5 6.5 29.5 6.5 29.5 6.5"
          stroke={GRANITE_GOLD}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M27 11C28 10 30 9.5 30.5 9.5"
          stroke={GRANITE_GOLD}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.6}
        />
      </Svg>
    </IconCircle>
  );
}

// ─── 2. Email / Inbox ───────────────────────────────────────────────────────
// An open envelope with a small leaf peeking out — ties "email" to the
// camping/nature brand without feeling corporate.

export function EmailTipsIcon() {
  return (
    <IconCircle bgColor={EARTH_GREEN + "14"}>
      <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
        {/* Envelope body */}
        <Rect
          x={5}
          y={10}
          width={24}
          height={16}
          rx={3}
          fill={EARTH_GREEN}
          opacity={0.82}
        />
        {/* Envelope flap */}
        <Path
          d="M5 13L17 21L29 13"
          stroke={PARCHMENT}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner fold line */}
        <Path
          d="M5 10L17 19L29 10"
          stroke={EARTH_GREEN}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5}
        />
        {/* Small leaf accent — nature touch */}
        <G transform="translate(20, 5) rotate(25)">
          <Path
            d="M0 8C0 8 1 0 7 0C7 0 6 8 0 8Z"
            fill={EARTH_GREEN}
            opacity={0.55}
          />
          <Line
            x1={0}
            y1={8}
            x2={4}
            y2={3}
            stroke={EARTH_GREEN}
            strokeWidth={0.8}
            opacity={0.4}
          />
        </G>
      </Svg>
    </IconCircle>
  );
}

// ─── 3. My Campsite / Profile ───────────────────────────────────────────────
// A tent with a small flag — represents "your personal camp" and profile
// setup. Distinct from the generic person-circle icon.

export function MyCampsiteIcon() {
  return (
    <IconCircle bgColor={EARTH_GREEN + "14"}>
      <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
        {/* Ground line */}
        <Line
          x1={4}
          y1={26}
          x2={30}
          y2={26}
          stroke={EARTH_GREEN}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.35}
        />
        {/* Tent body */}
        <Path
          d="M17 7L7 26H27L17 7Z"
          fill={EARTH_GREEN}
          opacity={0.8}
        />
        {/* Tent opening */}
        <Path
          d="M14 26L17 18L20 26"
          fill={PARCHMENT}
          opacity={0.85}
        />
        {/* Tent ridge highlight */}
        <Path
          d="M17 7L17 18"
          stroke={PARCHMENT}
          strokeWidth={1}
          opacity={0.4}
        />
        {/* Small flag on pole */}
        <Line
          x1={24}
          y1={10}
          x2={24}
          y2={19}
          stroke={EARTH_GREEN}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <Path
          d="M24 10L28.5 12L24 14"
          fill={GRANITE_GOLD}
          opacity={0.75}
        />
      </Svg>
    </IconCircle>
  );
}

// ─── 4. Email Verification ──────────────────────────────────────────────────
// An envelope with a checkmark — conveys "confirm your email" clearly.

export function EmailVerificationIcon() {
  return (
    <IconCircle bgColor={EARTH_GREEN + "14"}>
      <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
        {/* Envelope body */}
        <Rect
          x={5}
          y={10}
          width={24}
          height={16}
          rx={3}
          fill={EARTH_GREEN}
          opacity={0.82}
        />
        {/* Envelope flap */}
        <Path
          d="M5 13L17 21L29 13"
          stroke={PARCHMENT}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Checkmark circle */}
        <Circle
          cx={25}
          cy={10}
          r={6}
          fill={DEEP_FOREST}
        />
        {/* Checkmark */}
        <Path
          d="M22.5 10L24.5 12L28 8"
          stroke={PARCHMENT}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </IconCircle>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
});
