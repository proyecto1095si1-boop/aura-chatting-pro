import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

const SMOKING_OPTIONS = ['no', 'social', 'yes'] as const;
const DRINKING_OPTIONS = ['never', 'socially', 'frequently'] as const;
const GOAL_OPTIONS = ['chat', 'friendship', 'informal', 'stable', 'life_partner', 'stable_flexible'] as const;
const RELIGION_OPTIONS = ['none', 'catholic', 'christian', 'jewish', 'muslim', 'buddhist', 'other'] as const;
const ZODIAC_OPTIONS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] as const;

export default function OnboardingLifestyle() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  
  const [hasChildren, setHasChildren] = useState<boolean | null>(user?.hasChildren ?? null);
  const [smokes, setSmokes] = useState<'yes' | 'no' | 'social' | null>(user?.smokes ?? null);
  const [drinks, setDrinks] = useState<'frequently' | 'socially' | 'never' | null>(user?.drinks ?? null);
  const [goal, setGoal] = useState<typeof GOAL_OPTIONS[number] | null>(user?.relationshipGoal ?? null);
  const [religion, setReligion] = useState<string | null>(user?.religion ?? null);
  const [zodiac, setZodiac] = useState<typeof ZODIAC_OPTIONS[number] | null>(user?.zodiac ?? null);
  const [personality, setPersonality] = useState<string>(user?.personalityType ?? '');

  const handleNext = async () => {
    await updateProfile({
      hasChildren,
      smokes,
      drinks,
      relationshipGoal: goal,
      religion,
      zodiac,
      personalityType: personality,
      onboardingStep: 5
    });
    router.push('/onboarding/photos' as any);
  };

  const OptionButton = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.option, active && styles.optionActive]}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <OnboardingLayout
      step={5}
      totalSteps={10}
      title={t('onboarding.lifestyle.title')}
      subtitle={t('onboarding.lifestyle.subtitle')}
      onNext={handleNext}
      nextDisabled={!goal} // We at least require the goal
      scrollable
    >
      <View style={styles.container}>
        {/* Relationship Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.relationship_goal.label')}</Text>
          <View style={styles.optionsGrid}>
            {GOAL_OPTIONS.map(opt => (
              <OptionButton
                key={opt}
                label={t(`common.lifestyle.relationship_goal.${opt}`)}
                active={goal === opt}
                onPress={() => setGoal(opt)}
              />
            ))}
          </View>
        </View>

        {/* Children */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.kids.label')}</Text>
          <View style={styles.optionsRow}>
            <OptionButton
              label={t('common.lifestyle.kids.no')}
              active={hasChildren === false}
              onPress={() => setHasChildren(false)}
            />
            <OptionButton
              label={t('common.lifestyle.kids.yes')}
              active={hasChildren === true}
              onPress={() => setHasChildren(true)}
            />
          </View>
        </View>

        {/* Smoking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.smoking.label')}</Text>
          <View style={styles.optionsRow}>
            {SMOKING_OPTIONS.map(opt => (
              <OptionButton
                key={opt}
                label={t(`common.lifestyle.smoking.${opt}`)}
                active={smokes === opt}
                onPress={() => setSmokes(opt)}
              />
            ))}
          </View>
        </View>

        {/* Drinking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.drinking.label')}</Text>
          <View style={styles.optionsRow}>
            {DRINKING_OPTIONS.map(opt => (
              <OptionButton
                key={opt}
                label={t(`common.lifestyle.drinking.${opt}`)}
                active={drinks === opt}
                onPress={() => setDrinks(opt)}
              />
            ))}
          </View>
        </View>

        {/* Religion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.religion.label')}</Text>
          <View style={styles.optionsGrid}>
            {RELIGION_OPTIONS.map(opt => (
              <OptionButton
                key={opt}
                label={t(`common.lifestyle.religion.${opt}`)}
                active={religion === opt}
                onPress={() => setReligion(opt)}
              />
            ))}
          </View>
        </View>

        {/* Zodiac Sign */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.zodiac.label')}</Text>
          <View style={styles.optionsGrid}>
             <View style={styles.optionsRow}>
                {ZODIAC_OPTIONS.map(opt => (
                  <Pressable 
                    key={opt} 
                    onPress={() => setZodiac(opt)}
                    style={[styles.smallOption, zodiac === opt && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, zodiac === opt && styles.optionTextActive]}>{t(`common.lifestyle.zodiac.${opt}`)}</Text>
                  </Pressable>
                ))}
             </View>
          </View>
        </View>

        {/* Personality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.personality.label')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.lifestyle.personality_placeholder', 'E.g.: INFJ')}
              placeholderTextColor="#8A8A8A"
              value={personality}
              onChangeText={setPersonality}
              maxLength={4}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionsGrid: {
    gap: 8,
  },
  option: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: '45%',
  },
  optionActive: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  optionText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#FF2D78',
    fontWeight: '700',
  },
  smallOption: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
