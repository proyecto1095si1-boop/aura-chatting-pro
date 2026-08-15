export const themeColors: {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  gradientStart: { light: string; dark: string };
  gradientEnd: { light: string; dark: string };
  accentBlue: { light: string; dark: string };
  accentGreen: { light: string; dark: string };
  gold: { light: string; dark: string };
  surfaceElevated: { light: string; dark: string };
  tint: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
