import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from 'react-i18next';

export default function OnboardingGender() {
  const { t } = useTranslation();
  
  const GENDERS = [
    { id: 'man', label: t('onboarding.gender.options.man'), emoji: '👨' },
    { id: 'woman', label: t('onboarding.gender.options.woman'), emoji: '👩' },
    { id: 'nonbinary', label: t('onboarding.gender.options.nonbinary'), emoji: '🧑' },
    { id: 'other', label: t('onboarding.gender.options.other'), emoji: '✨' },
  ];

  const LOOKING_FOR = [
    { id: 'men', label: t('onboarding.gender.looking_for.men'), emoji: '👨' },
    { id: 'women', label: t('onboarding.gender.looking_for.women'), emoji: '👩' },
    { id: 'everyone', label: t('onboarding.gender.looking_for.everyone'), emoji: '💫' },
  ];

  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const { updateProfile } = useAuth();

  const handleNext = async () => {
    if (!gender || !lookingFor) return;
    await updateProfile({ gender, lookingFor });
    router.push('/onboarding/location' as any);
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={10}
      title={t('onboarding.gender.title')}
      subtitle={t('onboarding.gender.subtitle')}
      onNext={handleNext}
      nextDisabled={!gender || !lookingFor}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('onboarding.gender.soy')}</Text>
        <View style={styles.optionsGrid}>
          {GENDERS.map(g => (
            <Pressable
              key={g.id}
              onPress={() => setGender(g.id)}
              style={styles.optionWrapper}
            >
              {gender === g.id ? (
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35'] as const}
                  style={styles.optionSelected}
                >
                  <Text style={styles.optionEmoji}>{g.emoji}</Text>
                  <Text style={styles.optionLabelSelected}>{g.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.option}>
                  <Text style={styles.optionEmoji}>{g.emoji}</Text>
                  <Text style={styles.optionLabel}>{g.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('onboarding.gender.busco')}</Text>
        <View style={styles.optionsGrid}>
          {LOOKING_FOR.map(l => (
            <Pressable
              key={l.id}
              onPress={() => setLookingFor(l.id)}
              style={styles.optionWrapper}
            >
              {lookingFor === l.id ? (
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35'] as const}
                  style={styles.optionSelected}
                >
                  <Text style={styles.optionEmoji}>{l.emoji}</Text>
                  <Text style={styles.optionLabelSelected}>{l.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.option}>
                  <Text style={styles.optionEmoji}>{l.emoji}</Text>
                  <Text style={styles.optionLabel}>{l.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  option: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  optionSelected: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionLabel: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
