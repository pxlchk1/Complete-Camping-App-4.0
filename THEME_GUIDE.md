# Complete Camping App - Master Theme Guide

## Overview

This document defines the complete design system for the Complete Camping App. **All screens and components MUST use the shared theme.** Do not define ad-hoc colors, fonts, or spacing values.

## Theme Location

**Import from:** `src/theme/theme.ts`

```typescript
import { colors, fonts, spacing, radius, textStyles, componentStyles } from "../theme/theme";
```

---

## Colors

### Primary Palette

```typescript
colors.deepForest    // #485952 - Primary text, headings, icons, buttons
colors.earthGreen    // #828872 - Secondary text, muted labels
colors.graniteGold   // #AC9A6D - Accents, highlights (use sparingly)
colors.riverRock     // #607A77 - Status badges, card accents
colors.sierraSky     // #92AFB1 - Soft backgrounds, dividers
colors.parchment     // #F4EBD0 - Universal background
```

### Derived Neutrals

```typescript
colors.borderSoft    // #D5C8A2 - Card borders, dividers
colors.cardFill      // #F7EFD8 - Card backgrounds (warmer than parchment)
```

### ❌ NEVER USE

- Pure white (`#FFFFFF`)
- Pure black (`#000000`)
- Generic grays
- Any colors not in this palette

---

## Typography

### Font Families

```typescript
// Display fonts (Raleway) - for headers and titles
fonts.displayBold         // Raleway_700Bold - Hero titles
fonts.displaySemibold     // Raleway_600SemiBold - Section headers
fonts.displayRegular      // Raleway_600SemiBold - Card titles

// Body fonts (Source Sans 3) - for body text, labels, buttons
fonts.bodyBold            // SourceSans3_700Bold
fonts.bodySemibold        // SourceSans3_600SemiBold - Buttons, labels
fonts.bodyRegular         // SourceSans3_400Regular - Body text

// Accent font (Satisfy) - decorative only, use VERY sparingly
fonts.accent              // Satisfy_400Regular
```

### Font Sizes

```typescript
fontSizes.xl    // 38px - Hero titles
fontSizes.lg    // 30px - Section headers
fontSizes.md    // 20px - Card titles
fontSizes.sm    // 16px - Body text
fontSizes.xs    // 13px - Labels, metadata
```

### Pre-defined Text Styles

**Always use these instead of creating custom styles:**

```typescript
import { textStyles } from "../theme/theme";

<Text style={textStyles.headingHero}>Welcome</Text>
<Text style={textStyles.headingSection}>Getting Started</Text>
<Text style={textStyles.headingCard}>Yosemite Trip</Text>
<Text style={textStyles.body}>This is body text</Text>
<Text style={textStyles.bodySecondary}>Secondary text</Text>
<Text style={textStyles.label}>DIFFICULTY</Text>
<Text style={textStyles.labelSoft}>45 min</Text>
```

### Typography Components

**Preferred approach - use these when possible:**

```typescript
import { Heading1, Heading2, SectionTitle, BodyText, Caption } from "../components/Typography";

<Heading1>Hero Title</Heading1>           // headingHero style
<Heading2>Section Title</Heading2>        // headingSection style
<SectionTitle>Section</SectionTitle>      // headingSection style
<BodyText>Body copy</BodyText>            // body style
<Caption>Small text</Caption>             // labelSoft style
```

---

## Spacing

```typescript
spacing.xxs    // 4px
spacing.xs     // 8px
spacing.sm     // 12px
spacing.md     // 16px
spacing.lg     // 24px
spacing.xl     // 32px
```

### Layout Constants

```typescript
import { layout } from "../theme/theme";

layout.screenPadding          // 24 - Horizontal padding
layout.sectionMarginTop       // 24 - Space between sections
layout.cardSpacing            // 16 - Space between cards
layout.scrollBottomPadding    // 32 - Bottom padding in ScrollView
layout.minTapTarget           // 44 - Minimum touch target size
```

---

## Border Radius

```typescript
radius.sm      // 8px
radius.md      // 12px
radius.lg      // 16px
radius.pill    // 999px - Full rounded (buttons, pills)
```

---

## Component Styles

### Screen Container

```typescript
import { componentStyles } from "../theme/theme";

<View style={componentStyles.screen}>
  <View style={componentStyles.screenInner}>
    {/* Content */}
  </View>
</View>
```

### Cards

```typescript
<View style={componentStyles.card}>
  <View style={componentStyles.cardHeader}>
    <Ionicons name="map" size={24} color={iconColors.default} />
    <Text style={textStyles.headingCard}>Trip Name</Text>
  </View>
  <View style={componentStyles.cardDivider} />
  <Text style={textStyles.body}>Card content</Text>
</View>
```

### Buttons

```typescript
import Button from "../components/Button";

<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="text">Text Link</Button>
```

Pre-styled using `componentStyles.buttonPrimary` and `componentStyles.buttonSecondary`.

### Status Pills

```typescript
<View style={componentStyles.pill}>
  <Text style={componentStyles.pillText}>DRAFT</Text>
</View>
```

---

## Icons

### Icon Colors

```typescript
import { iconColors } from "../theme/theme";

<Ionicons name="home" size={24} color={iconColors.default} />    // Deep Forest
<Ionicons name="star" size={20} color={iconColors.muted} />      // Earth Green
<Ionicons name="award" size={18} color={iconColors.accent} />    // Granite Gold
<Ionicons name="check" size={16} color={iconColors.active} />    // Deep Forest (filled)
```

### Icon Guidelines

- Use **outline icons** with medium stroke
- Slightly rounded ends (not sharp or hairline)
- Default color: `iconColors.default` (Deep Forest)
- Active/selected: Use filled version with `iconColors.active`
- Inactive: Use `iconColors.muted` (Earth Green)
- ❌ Never use gradients or neon colors
- ❌ Never use hairline strokes

---

## Shadows

```typescript
import { shadows } from "../theme/theme";

const styles = StyleSheet.create({
  myCard: {
    ...shadows.card,
  },
});
```

Soft, print-inspired shadow for cards and elevated elements.

---

## Layout Rules

### Screen Layout

1. **Horizontal padding:** Always use `layout.screenPadding` (24px) on each side
2. **Section spacing:** `layout.sectionMarginTop` (24px) between sections
3. **Header-to-body gap:** 8-12px between header and body text
4. **Card spacing:** `layout.cardSpacing` (12-16px) between stacked cards
5. **ScrollView bottom:** `layout.scrollBottomPadding` (32px) so content doesn't hit edge

### Example Screen Structure

```typescript
import { componentStyles, layout, textStyles } from "../theme/theme";

<SafeAreaView style={componentStyles.screen}>
  <ScrollView
    contentContainerStyle={{
      paddingHorizontal: layout.screenPadding,
      paddingBottom: layout.scrollBottomPadding
    }}
  >
    <Text style={[textStyles.headingSection, { marginTop: layout.sectionMarginTop }]}>
      Section Title
    </Text>
    <Text style={[textStyles.body, { marginTop: spacing.sm }]}>
      Body content here
    </Text>
  </ScrollView>
</SafeAreaView>
```

---

## Accessibility Rules

### Enforced by Theme

1. ✅ **Body text uses `deepForest` on `parchment`** for maximum contrast
2. ✅ **Minimum body size: 16px** (`fontSizes.sm`)
3. ✅ **Minimum tap target: 44px** (`layout.minTapTarget`)
4. ❌ **Never use `graniteGold` for body copy** - only for accents/headings
5. ❌ **Never place light text on mid-tone backgrounds**
6. ❌ **Never use text on patterned backgrounds**

---

## Migration Guide

### Before (Ad-hoc styles)

```typescript
// ❌ DON'T DO THIS
<View style={{ backgroundColor: "#F4EBD0", padding: 24 }}>
  <Text style={{ fontSize: 20, fontFamily: "Raleway_600SemiBold", color: "#485952" }}>
    Title
  </Text>
  <Text style={{ fontSize: 16, color: "#828872" }}>
    Body text
  </Text>
</View>
```

### After (Theme-based)

```typescript
// ✅ DO THIS
import { componentStyles, textStyles, layout } from "../theme/theme";

<View style={[componentStyles.screen, { padding: layout.screenPadding }]}>
  <Text style={textStyles.headingCard}>Title</Text>
  <Text style={textStyles.bodySecondary}>Body text</Text>
</View>
```

---

## Quick Reference

### Common Patterns

**Screen wrapper:**
```typescript
<View style={componentStyles.screen}>
  <View style={componentStyles.screenInner}>
```

**Section header:**
```typescript
<Text style={textStyles.headingSection}>Section</Text>
```

**Body text:**
```typescript
<Text style={textStyles.body}>Content</Text>
```

**Card:**
```typescript
<View style={componentStyles.card}>
```

**Primary button:**
```typescript
<Button variant="primary">Action</Button>
```

**Icon:**
```typescript
<Ionicons name="icon-name" size={24} color={iconColors.default} />
```

---

## Rules Summary

### ✅ ALWAYS

- Import from `src/theme/theme.ts`
- Use pre-defined `textStyles` for all text
- Use `componentStyles` for common components
- Use `colors` object for all color values
- Use `spacing` object for all padding/margin
- Use `radius` object for all border radius
- Use `iconColors` for all icon colors

### ❌ NEVER

- Define custom colors (no hex codes outside theme)
- Define custom font sizes outside `fontSizes`
- Use pure white or black
- Use generic gray values
- Create ad-hoc spacing values
- Use `Satisfy` font for functional UI
- Use `graniteGold` for body text

---

**This theme is the single source of truth. All screens must conform to these rules.**
