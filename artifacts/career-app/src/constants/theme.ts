/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Careerly brand palette, shared by the native screens. Mirrors the
 * job-marketplace-panel design language (navy headers, blue primary).
 */
export const APP_COLORS = {
  canvas: "#F6F8FC",
  header: "#0B1F44",
  surface: "#FFFFFF",
  surfaceElevated: "#F1F5F9",
  surfacePressed: "#E2E8F0",
  border: "#DBEAFE",
  divider: "#E2E8F0",
  text: "#0F172A",
  mutedText: "#64748B",
  subtleText: "#94A3B8",
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primarySoft: "#EFF6FF",
  onPrimary: "#FFFFFF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  success: "#16A34A",
  successSoft: "#F0FDF4",
  drawerGradientTop: "#24439C",
  drawerGradientBottom: "#2875EC",
} as const;

export type AppIconName = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};
