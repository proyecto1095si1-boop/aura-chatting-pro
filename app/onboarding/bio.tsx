import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';

const MAX_CHARS = 500;

import { useTranslation } from 'react-i18next';

export default function OnboardingBio() {
  const { t } = useTranslation();
  const [bio, setBio] = useState('');
  const { updateProfile, completeOnboarding } = useAuth();

  const handleNext = async () => {
    await updateProfile({ bio: bio.trim() });
    router.push('/onboarding/verification');
  };

  return (
    <OnboardingLayout
      step={9}
      totalSteps={10}
      title={t('onboarding.bio.title')}
      subtitle={t('onboarding.bio.subtitle')}
      onNext={handleNext}
      nextLabel={t('onboarding.bio.start_btn')}
      scrollable
    >
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={bio}
          onChangeText={(text) => {
            if (text.length <= MAX_CHARS) setBio(text);
          }}
          placeholder={t('onboarding.bio.placeholder')}
          placeholderTextColor="#8A8A8A"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={MAX_CHARS}
        />
        <Text style={[styles.counter, bio.length > MAX_CHARS * 0.9 && styles.counterWarning]}>
          {bio.length}/{MAX_CHARS}
        </Text>
      </View>

      <Text style={styles.hint}>
        {t('onboarding.bio.hint')}
      </Text>

      {bio.length === 0 && (
        <View style={styles.skipHint}>
          <Text style={styles.skipText}>{t('onboarding.bio.skip_text')}</Text>
        </View>
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 160,
  },
  counter: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '500',
  },
  counterWarning: {
    color: '#FF6B35',
  },
  hint: {
    color: '#8A8A8A',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  skipHint: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  skipText: {
    color: '#8A8A8A',
    fontSize: 13,
    textAlign: 'center',
  },
});
