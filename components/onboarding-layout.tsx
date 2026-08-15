import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { GradientButton } from './gradient-button';
import { LinearGradient } from 'expo-linear-gradient';

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  showBack?: boolean;
  scrollable?: boolean;
}

export function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  nextLabel = 'Continuar',
  nextDisabled = false,
  nextLoading = false,
  showBack = true,
  scrollable = false,
}: OnboardingLayoutProps) {
  const progress = step / totalSteps;

  const content = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {showBack && (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#FF2D78', '#FF6B35'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.stepText}>{step}/{totalSteps}</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleArea}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Next button */}
      <GradientButton
        label={nextLabel}
        onPress={onNext}
        disabled={nextDisabled}
        loading={nextLoading}
        style={styles.nextButton}
      />
    </View>
  );

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#0A0A0A' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0A0A0A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepText: {
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 30,
  },
  titleArea: {
    marginBottom: 28,
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  nextButton: {
    width: '100%',
    marginTop: 16,
  },
});
