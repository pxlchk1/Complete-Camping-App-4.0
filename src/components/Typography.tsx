import React from "react";
import { Text, TextProps } from "react-native";
import { textStyles } from "../theme/theme";

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

// Hero titles - welcome and section landings
export function Heading1({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.headingHero, style]} {...props}>
      {children}
    </Text>
  );
}

// Section titles on content screens
export function Heading2({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.headingSection, style]} {...props}>
      {children}
    </Text>
  );
}

// Card titles, list item titles
export function Heading3({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.headingCard, style]} {...props}>
      {children}
    </Text>
  );
}

// Section titles (same as Heading2)
export function SectionTitle({ children, style, color, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.headingSection, color ? { color } : undefined, style]} {...props}>
      {children}
    </Text>
  );
}

// Normal body copy
export function BodyText({ children, style, color, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.body, color ? { color } : undefined, style]} {...props}>
      {children}
    </Text>
  );
}

// Secondary body (subtle text, helper copy)
export function BodyTextMedium({ children, style, color, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.bodySecondary, color ? { color } : undefined, style]} {...props}>
      {children}
    </Text>
  );
}

// Button text
export function ButtonText({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.buttonPrimary, style]} {...props}>
      {children}
    </Text>
  );
}

// Labels and small text
export function Caption({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[textStyles.labelSoft, style]} {...props}>
      {children}
    </Text>
  );
}
