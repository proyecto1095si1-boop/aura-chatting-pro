import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { INTERESTS_LIST } from '@/lib/mock-data';
import { LinearGradient } from 'expo-linear-gradient';

const MIN_INTERESTS = 5;

import { useTranslation } from 'react-i18next';

export default function OnboardingInterests() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const { updateProfile } = useAuth();

  const toggle = (interest: string) => {
    if (selected.includes(interest)) {
      setSelected(selected.filter(i => i !== interest));
    } else if (selected.length < 15) {
      setSelected([...selected, interest]);
    }
  };

  const handleNext = async () => {
    if (selected.length < MIN_INTERESTS) return;
    await updateProfile({ interests: selected });
    router.push('/onboarding/prompts' as any);
  };

  return (
    <OnboardingLayout
      step={7}
      totalSteps={10}
      title={t('onboarding.interests.title')}
      subtitle={t('onboarding.interests.subtitle', { min: MIN_INTERESTS })}
      onNext={handleNext}
      nextDisabled={selected.length < MIN_INTERESTS}
      nextLabel={t('onboarding.interests.continue_btn', { count: selected.length, min: MIN_INTERESTS })}
      scrollable
    >
      <View style={styles.chipsContainer}>
        {INTERESTS_LIST.map((interest) => {
          const isSelected = selected.includes(interest);
          const translatedInterest = t(`common.interests.${interest}`, { defaultValue: interest });
          return (
            <Pressable
              key={interest}
              onPress={() => toggle(interest)}
              style={styles.chipWrapper}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.chipSelected}
                >
                  <Text style={styles.chipTextSelected}>{translatedInterest}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{translatedInterest}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.counter}>
        {t('onboarding.interests.counter', { count: selected.length })} {selected.length >= MIN_INTERESTS ? '✓' : t('onboarding.interests.minimum', { min: MIN_INTERESTS })}
      </Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 16,
  },
  chipWrapper: {},
  chip: {
    backgroundColor: '#161616',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  counter: {
    color: '#FF2D78',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
