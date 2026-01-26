/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    extend: {
      colors: {
        // Official Complete Camping App Palette
        forest: "#485952",        // Deep Forest - primary text, headings, icons, buttons
        earthGreen: "#828872",    // Primary Earth Green - secondary text, muted labels
        granite: "#AC9A6D",       // Warm Granite Gold - accents, highlights
        riverRock: "#607A77",     // River Rock Blue Green - status badges, card accents
        sierraSky: "#92AFB1",     // Soft Sierra Sky - soft backgrounds, dividers
        parchment: "#F4EBD0",     // Parchment Cream - universal background
        parchmentDark: "#D5C8A2", // Derived border color
        brown: "#3D2817",         // Dark brown - primary body text (AA contrast)
      },
      fontFamily: {
        display: ["JosefinSlab_400Regular", "JosefinSlab_600SemiBold", "JosefinSlab_700Bold"],
        body: ["SourceSans3_400Regular", "SourceSans3_600SemiBold", "SourceSans3_700Bold"],
        accent: ["Satisfy_400Regular"],
      },
      fontSize: {
        xs: "10px",
        sm: "12px",
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
        "7xl": "64px",
        "8xl": "72px",
        "9xl": "80px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};
