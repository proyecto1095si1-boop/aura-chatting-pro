import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface GradientButtonProps {
  onPress: () => void;
  label: string;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'gradient' | 'outline' | 'ghost';
}

export function GradientButton({
  onPress,
  label,
  colors = ['#FF2D78', '#FF6B35'] as readonly [string, string],
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'gradient',
}: GradientButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.outlineButton,
          style,
          pressed && { opacity: 0.7 },
          (disabled || loading) && { opacity: 0.4 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FF2D78" />
        ) : (
          <Text style={[styles.outlineText, textStyle]}>{label}</Text>
        )}
      </Pressable>
    );
  }

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.ghostButton,
          style,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.ghostText, textStyle]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.container,
        style,
        pressed && { transform: [{ scale: 0.97 }] },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      <LinearGradient
        colors={colors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.text, textStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineButton: {
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  outlineText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '500',
  },
});
