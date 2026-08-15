import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';

import { useTranslation } from 'react-i18next';

export default function OnboardingBirth() {
  const { t } = useTranslation();
  const MONTHS = t('onboarding.birth.months', { returnObjects: true }) as string[];
  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
  const YEARS = Array.from({ length: 82 }, (_, i) => new Date().getFullYear() - 18 - i);

  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const { updateProfile } = useAuth();

  const isValid = day !== null && month !== null && year !== null;

  const calculateAge = () => {
    if (!isValid) return 0;
    const today = new Date();
    const birth = new Date(year!, month!, day!);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleNext = async () => {
    if (!isValid) return;
    const birthDate = `${year}-${String(month! + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const age = calculateAge();
    await updateProfile({ birthDate, age });
    router.push('/onboarding/gender' as any);
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={10}
      title={t('onboarding.birth.title')}
      subtitle={t('onboarding.birth.subtitle')}
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      <View style={styles.pickerRow}>
        {/* Day */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>{t('onboarding.birth.day')}</Text>
          <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
            {DAYS.map(d => (
              <Pressable
                key={d}
                style={[styles.pickerItem, day === d && styles.pickerItemSelected]}
                onPress={() => setDay(d)}
              >
                <Text style={[styles.pickerText, day === d && styles.pickerTextSelected]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Month */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>{t('onboarding.birth.month')}</Text>
          <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
            {MONTHS.map((m, i) => (
              <Pressable
                key={m}
                style={[styles.pickerItem, month === i && styles.pickerItemSelected]}
                onPress={() => setMonth(i)}
              >
                <Text style={[styles.pickerText, month === i && styles.pickerTextSelected]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Year */}
        <View style={[styles.pickerColumn, { flex: 1.4 }]}>
          <Text style={styles.pickerLabel}>{t('onboarding.birth.year')}</Text>
          <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
            {YEARS.map(y => (
              <Pressable
                key={y}
                style={[styles.pickerItem, year === y && styles.pickerItemSelected]}
                onPress={() => setYear(y)}
              >
                <Text style={[styles.pickerText, year === y && styles.pickerTextSelected]}>
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {isValid && (
        <Text style={styles.ageDisplay}>
          {t('onboarding.birth.age_display', { age: calculateAge() })}
        </Text>
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  pickerColumn: {
    flex: 1,
    gap: 8,
  },
  pickerLabel: {
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  picker: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  pickerItemSelected: {
    backgroundColor: '#1A0A12',
  },
  pickerText: {
    color: '#8A8A8A',
    fontSize: 15,
  },
  pickerTextSelected: {
    color: '#FF2D78',
    fontWeight: '700',
  },
  ageDisplay: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
});
