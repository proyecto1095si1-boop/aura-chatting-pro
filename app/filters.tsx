import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/screen-container';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/lib/subscription-context';
import { useAuth } from '@/lib/auth-context';
import * as Haptics from 'expo-haptics';
import { Platform, Alert } from 'react-native';

const { width } = Dimensions.get('window');

const GENDERS = ['woman', 'man', 'nonbinary'] as const;
const INTERESTS = ['travel', 'coffee', 'photography', 'yoga', 'music', 'movies', 'reading', 'gym', 'hiking'];

interface FilterState {
  ageMin: number;
  ageMax: number;
  distanceMax: number;
  genders: string[];
  interests: string[];
  hasPhotos: boolean;
  verified: boolean;
  online: boolean;
  goldOnly: boolean;
  distanceUnit: 'km' | 'mi';
  hasChildren: boolean | 'indifferent';
  smokes: 'yes' | 'no' | 'social' | 'indifferent';
  drinks: 'frequently' | 'socially' | 'never' | 'indifferent';
  relationshipGoal: string[];
  heightMin: number;
  heightMax: number;
  heightFilterActive: boolean;
  languages: string[];
  religion: string[];
  exercise: string[];
  education: string[];
  pets: string[];
  zodiacs: string[];
  personalities: string[];
  isDoubleMode: boolean;
}

export default function FiltersScreen() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>({
    ageMin: 18,
    ageMax: 50,
    distanceMax: 50,
    genders: ['woman'],
    interests: [],
    hasPhotos: false,
    verified: false,
    online: false,
    goldOnly: false,
    distanceUnit: 'km',
    hasChildren: 'indifferent',
    smokes: 'indifferent',
    drinks: 'indifferent',
    relationshipGoal: [],
    heightMin: 140,
    heightMax: 210,
    heightFilterActive: false,
    languages: [],
    religion: [],
    exercise: [],
    education: [],
    pets: [],
    zodiacs: [],
    personalities: [],
    isDoubleMode: false,
  });
  const { plan } = useSubscription();
  const { user, updateProfile } = useAuth();

  React.useEffect(() => {
    const loadFilters = async () => {
      try {
        const saved = await AsyncStorage.getItem('user_filters');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge with default state to prevent missing keys from old versions
          setFilters(prev => ({
            ...prev,
            ...parsed
          }));
        }
      } catch (e) {
        console.warn('Error load filters', e);
      }
    };
    loadFilters();
  }, []);

  const handleAgeMinChange = (value: number) => {
    if (value < filters.ageMax) {
      setFilters({ ...filters, ageMin: value });
    }
  };

  const handleAgeMaxChange = (value: number) => {
    if (value > filters.ageMin) {
      setFilters({ ...filters, ageMax: value });
    }
  };

  const handleDistanceChange = (value: number) => {
    setFilters({ ...filters, distanceMax: value });
  };

  const toggleGender = (gender: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const gendersArr = filters.genders || [];
    const newGenders = gendersArr.includes(gender)
      ? gendersArr.filter(g => g !== gender)
      : [...gendersArr, gender];
    setFilters({ ...filters, genders: newGenders });
  };

  const toggleInterest = (interest: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const interestsArr = filters.interests || [];
    const newInterests = interestsArr.includes(interest)
      ? interestsArr.filter(i => i !== interest)
      : [...interestsArr, interest];
    setFilters({ ...filters, interests: newInterests });
  };

  const toggleFilter = (key: keyof Omit<FilterState, 'ageMin' | 'ageMax' | 'distanceMax' | 'genders' | 'interests'>) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({ ...filters, [key]: !filters[key] });
  };

  const handleApply = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('user_filters', JSON.stringify(filters));
    router.back();
  };

  const handleReset = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFilters({
      ageMin: 18,
      ageMax: 50,
      distanceMax: 50,
      genders: ['woman'],
      interests: [],
      hasPhotos: false,
      verified: false,
      online: false,
      goldOnly: false,
      distanceUnit: 'km',
      hasChildren: 'indifferent',
      smokes: 'indifferent',
      drinks: 'indifferent',
      relationshipGoal: [],
      heightMin: 140,
      heightMax: 210,
      heightFilterActive: false,
      languages: [],
      religion: [],
      exercise: [],
      education: [],
      pets: [],
      zodiacs: [],
      personalities: [],
      isDoubleMode: false,
    });
  };

  const handleToggleGoldOnly = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (plan !== 'gold' && plan !== 'elite') {
       router.push('/paywall' as any);
       return;
    }
    setFilters({ ...filters, goldOnly: !filters.goldOnly });
  };

  const toggleMultiSelect = (key: 'relationshipGoal' | 'languages' | 'religion' | 'exercise' | 'education' | 'pets' | 'zodiacs' | 'personalities', value: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = (filters[key] || []) as string[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>← {t('filters.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('filters.title')}</Text>
          <Pressable onPress={handleReset}>
            <Text style={styles.resetButton}>{t('filters.reset')}</Text>
          </Pressable>
        </View>

        {/* Age Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.age')}: {filters.ageMin} - {filters.ageMax}</Text>
          <View style={styles.sliderContainer}>
            <View style={styles.slider}>
              <View
                style={[
                  styles.sliderTrack,
                  {
                    width: `${((filters.ageMin - 18) / (60 - 18)) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.sliderInputs}>
              <Pressable
                style={({ pressed }) => [styles.sliderButton, pressed ? { opacity: 0.7 } : {}]}
                onPress={() => handleAgeMinChange(Math.max(18, filters.ageMin - 1))}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </Pressable>
              <Text style={styles.sliderValue}>{filters.ageMin}</Text>
              <Pressable
                style={({ pressed }) => [styles.sliderButton, pressed ? { opacity: 0.7 } : {}]}
                onPress={() => handleAgeMinChange(Math.min(filters.ageMax - 1, filters.ageMin + 1))}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.slider}>
              <View
                style={[
                  styles.sliderTrack,
                  {
                    width: `${((filters.ageMax - 18) / (60 - 18)) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.sliderInputs}>
              <Pressable
                style={({ pressed }) => [styles.sliderButton, pressed ? { opacity: 0.7 } : {}]}
                onPress={() => handleAgeMaxChange(Math.max(filters.ageMin + 1, filters.ageMax - 1))}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </Pressable>
              <Text style={styles.sliderValue}>{filters.ageMax}</Text>
              <Pressable
                style={({ pressed }) => [styles.sliderButton, pressed ? { opacity: 0.7 } : {}]}
                onPress={() => handleAgeMaxChange(Math.min(60, filters.ageMax + 1))}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Distance and Units */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('filters.distance')}: {filters.distanceMax} {filters.distanceUnit}</Text>
            <View style={styles.unitToggle}>
              {(['km', 'mi'] as const).map(u => (
                <Pressable
                  key={u}
                  onPress={() => setFilters({ ...filters, distanceUnit: u })}
                  style={[styles.unitBtn, filters.distanceUnit === u && styles.unitBtnActive]}
                >
                  <Text style={[styles.unitText, filters.distanceUnit === u && styles.unitTextActive]}>{u.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.sliderContainer}>
            <View style={styles.slider}>
              <View
                style={[
                  styles.sliderTrack,
                  {
                    width: `${(filters.distanceMax / 100) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.sliderInputs}>
              <Pressable
                style={({ pressed }) => [styles.sliderButton, pressed ? { opacity: 0.7 } : {}]}
                onPress={() => handleDistanceChange(Math.max(1, filters.distanceMax - 5))}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </Pressable>
              <Text style={styles.sliderValue}>{filters.distanceMax}</Text>
              <Pressable
                style={({ pressed }) => [styles.sliderButton, pressed ? { opacity: 0.7 } : {}]}
                onPress={() => handleDistanceChange(Math.min(100, filters.distanceMax + 5))}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.gender')}</Text>
          <View style={styles.chipContainer}>
            {GENDERS.map(gender => (
              <Pressable
                key={gender}
                style={[
                  styles.chip,
                  filters.genders.includes(gender) && styles.chipActive,
                ]}
                onPress={() => toggleGender(gender)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.genders.includes(gender) && styles.chipTextActive,
                  ]}
                >
                  {t(`filters.genders.${gender}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.interests')}</Text>
          <View style={styles.chipContainer}>
            {INTERESTS.map(interest => (
              <Pressable
                key={interest}
                style={[
                  styles.chip,
                  filters.interests.includes(interest) && styles.chipActive,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.interests.includes(interest) && styles.chipTextActive,
                  ]}
                >
                  {t(`common.interests.${interest}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Relationship Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.relationship_goal.label')}</Text>
          <View style={styles.chipContainer}>
            {['chat', 'friendship', 'informal', 'stable', 'life_partner', 'stable_flexible'].map(goal => (
              <Pressable
                key={goal}
                style={[
                  styles.chip,
                  filters.relationshipGoal.includes(goal) && styles.chipActive,
                ]}
                onPress={() => toggleMultiSelect('relationshipGoal', goal)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.relationshipGoal.includes(goal) && styles.chipTextActive,
                  ]}
                >
                  {t(`common.lifestyle.relationship_goal.${goal}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Kids, Smoking, Drinking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.kids.label')}</Text>
          <View style={styles.chipContainer}>
            {['indifferent', 'no', 'yes'].map(opt => (
              <OptionChip
                key={opt}
                label={t(`common.lifestyle.kids.${opt}`)}
                active={filters.hasChildren === (opt === 'indifferent' ? 'indifferent' : opt === 'yes')}
                onPress={() => setFilters({ ...filters, hasChildren: opt === 'indifferent' ? 'indifferent' : opt === 'yes' })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.smoking.label')}</Text>
          <View style={styles.chipContainer}>
            {['indifferent', 'no', 'social', 'yes'].map(opt => (
              <OptionChip
                key={opt}
                label={opt === 'indifferent' ? t('common.lifestyle.kids.indifferent') : t(`common.lifestyle.smoking.${opt}`)}
                active={filters.smokes === opt}
                onPress={() => setFilters({ ...filters, smokes: opt as any })}
              />
            ))}
          </View>
        </View>

        {/* Height Range (Premium/Optional) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('filters.height_range')}</Text>
            <Pressable onPress={() => setFilters({ ...filters, heightFilterActive: !filters.heightFilterActive })}>
               <View style={[styles.toggle, filters.heightFilterActive && styles.toggleActive, { width: 44, height: 24 }]}>
                  {filters.heightFilterActive && <View style={[styles.toggleDot, { width: 18, height: 18 } ]} />}
               </View>
            </Pressable>
          </View>
          {filters.heightFilterActive && (
            <View style={styles.sliderContainer}>
              <Text style={{ color: '#8A8A8A', fontSize: 13, marginBottom: 8 }}>{filters.heightMin}cm - {filters.heightMax}cm</Text>
              {/* Simplified range inputs for demo purposes as we don't have a multi-slider component */}
              <View style={styles.sliderInputs}>
                 <Pressable style={styles.sliderButton} onPress={() => setFilters({...filters, heightMin: Math.max(140, filters.heightMin - 5)})}>
                   <Text style={styles.sliderButtonText}>-</Text>
                 </Pressable>
                 <Text style={styles.sliderValue}>{filters.heightMin}</Text>
                 <Pressable style={styles.sliderButton} onPress={() => setFilters({...filters, heightMin: Math.min(filters.heightMax - 5, filters.heightMin + 5)})}>
                   <Text style={styles.sliderButtonText}>+</Text>
                 </Pressable>
                 <View style={{ width: 20 }} />
                 <Pressable style={styles.sliderButton} onPress={() => setFilters({...filters, heightMax: Math.max(filters.heightMin + 5, filters.heightMax - 5)})}>
                   <Text style={styles.sliderButtonText}>-</Text>
                 </Pressable>
                 <Text style={styles.sliderValue}>{filters.heightMax}</Text>
                 <Pressable style={styles.sliderButton} onPress={() => setFilters({...filters, heightMax: Math.min(230, filters.heightMax + 5)})}>
                   <Text style={styles.sliderButtonText}>+</Text>
                 </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Religion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.religion')}</Text>
          <View style={styles.chipContainer}>
            {['none', 'catholic', 'christian', 'jewish', 'muslim', 'buddhist', 'other'].map(rel => (
              <OptionChip
                key={rel}
                label={t(`common.lifestyle.religion.${rel}`)}
                active={filters.religion.includes(rel)}
                onPress={() => toggleMultiSelect('religion', rel)}
              />
            ))}
          </View>
        </View>

        {/* Drinking & Smoking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.drinking')}</Text>
          <View style={styles.chipContainer}>
            {['never', 'socially', 'frequently'].map(opt => (
              <OptionChip
                key={opt}
                label={t(`common.lifestyle.drinking.${opt}`)}
                active={filters.drinks === opt}
                onPress={() => setFilters({ ...filters, drinks: opt as any })}
              />
            ))}
            <OptionChip
              label={t('common.lifestyle.kids.indifferent')}
              active={filters.drinks === 'indifferent'}
              onPress={() => setFilters({ ...filters, drinks: 'indifferent' })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.smoking')}</Text>
          <View style={styles.chipContainer}>
            {['no', 'social', 'yes'].map(opt => (
              <OptionChip
                key={opt}
                label={t(`common.lifestyle.smoking.${opt}`)}
                active={filters.smokes === opt}
                onPress={() => setFilters({ ...filters, smokes: opt as any })}
              />
            ))}
            <OptionChip
              label={t('common.lifestyle.kids.indifferent')}
              active={filters.smokes === 'indifferent'}
              onPress={() => setFilters({ ...filters, smokes: 'indifferent' })}
            />
          </View>
        </View>

        {/* Exercise habits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.exercise')}</Text>
          <View style={styles.chipContainer}>
            {['often', 'sometimes', 'never'].map(opt => (
              <OptionChip
                key={opt}
                label={t(`common.lifestyle.exercise.${opt}`)}
                active={filters.exercise.includes(opt)}
                onPress={() => toggleMultiSelect('exercise', opt)}
              />
            ))}
          </View>
        </View>

        {/* Education level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.education')}</Text>
          <View style={styles.chipContainer}>
            {['high_school', 'bachelors', 'masters', 'doctorate'].map(opt => (
              <OptionChip
                key={opt}
                label={t(`common.lifestyle.education.${opt}`)}
                active={filters.education.includes(opt)}
                onPress={() => toggleMultiSelect('education', opt)}
              />
            ))}
          </View>
        </View>

        {/* Pets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.pets')}</Text>
          <View style={styles.chipContainer}>
            {['dog', 'cat', 'birds', 'reptiles', 'no_pets', 'allergic'].map(opt => (
              <OptionChip
                key={opt}
                label={t(`common.lifestyle.pets.${opt}`)}
                active={filters.pets.includes(opt)}
                onPress={() => toggleMultiSelect('pets', opt)}
              />
            ))}
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.languages')}</Text>
          <View style={styles.chipContainer}>
            {['Spanish', 'English', 'Portuguese', 'French', 'German', 'Italian', 'Chinese', 'Japanese'].map(lang => (
              <OptionChip
                key={lang}
                label={lang}
                active={filters.languages.includes(lang)}
                onPress={() => toggleMultiSelect('languages', lang)}
              />
            ))}
          </View>
        </View>

        {/* Zodiac */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.zodiac.label')}</Text>
          <View style={styles.chipContainer}>
            {['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'].map(z => (
              <OptionChip
                key={z}
                label={t(`common.lifestyle.zodiac.${z}`)}
                active={filters.zodiacs.includes(z)}
                onPress={() => toggleMultiSelect('zodiacs', z)}
              />
            ))}
          </View>
        </View>

        {/* Personality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.lifestyle.personality.label')}</Text>
          <View style={styles.chipContainer}>
            {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(p => (
              <OptionChip
                key={p}
                label={p}
                active={filters.personalities.includes(p)}
                onPress={() => toggleMultiSelect('personalities', p)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
           <Text style={styles.sectionTitle}>{t('filters.travel.title')}</Text>
           <Text style={{ color: '#8A8A8A', fontSize: 13, marginBottom: 8 }}>
             {t('filters.travel.desc')}
           </Text>
           
           {plan === 'elite' || plan === 'gold' ? (
             <Pressable 
               style={styles.travelBtn}
               onPress={() => {
                 // For now, simple mock to a famous city (e.g. Paris)
                 // In a complete implementation, this would open a Google Places Autocomplete modal
                 Alert.alert(
                   t('filters.travel.change_title'), 
                   t('filters.travel.change_q'),
                   [
                     { text: t('filters.travel.real_loc'), onPress: () => updateProfile({ travelLocation: undefined, travelGeohash: undefined }) },
                     { text: "Roma, Italia", onPress: () => updateProfile({ travelLocation: { latitude: 41.9028, longitude: 12.4964, city: "Roma, Italia" }, travelGeohash: "sr2y" }) },
                     { text: "Tokio, Japón", onPress: () => updateProfile({ travelLocation: { latitude: 35.6762, longitude: 139.6503, city: "Tokio, Japón" }, travelGeohash: "xn76" }) },
                     { text: t('filters.travel.cancel'), style: "cancel" }
                   ]
                 );
               }}
             >
               <Text style={styles.travelBtnText}>
                 {user?.travelLocation 
                    ? t('filters.travel.current_dest', { city: user.travelLocation.city }) 
                    : t('filters.travel.gps_loc')}
               </Text>
             </Pressable>
           ) : (
             <Pressable style={[styles.travelBtn, { opacity: 0.5 }]} onPress={() => router.push('/paywall' as any)}>
                <Text style={styles.travelBtnText}>{t('filters.travel.available_premium')}</Text>
             </Pressable>
           )}
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          {[
            { key: 'hasPhotos', label: t('filters.only_photos') },
            { key: 'verified', label: t('filters.verified') },
            { key: 'online', label: t('filters.online_now') },
          ].map(item => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.toggleItem, pressed ? { opacity: 0.7 } : {}]}
              onPress={() => toggleFilter(item.key as any)}
            >
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <View
                style={[
                  styles.toggle,
                  filters[item.key as keyof typeof filters] ? styles.toggleActive : {},
                ]}
              >
                {filters[item.key as keyof typeof filters] && (
                  <View style={styles.toggleDot} />
                )}
              </View>
            </Pressable>
          ))}
          
          {/* Filtro Exclusivo Premium */}
          <Pressable
            style={({ pressed }) => [styles.toggleItem, pressed ? { opacity: 0.7 } : {}]}
            onPress={handleToggleGoldOnly}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <Text style={[styles.toggleLabel, { color: '#FFD700' }]}>{t('filters.gold_only')}</Text>
               {(plan !== 'gold' && plan !== 'elite') && (
                 <Text style={{ fontSize: 12 }}>🔒</Text>
               )}
            </View>
            <View
              style={[
                styles.toggle,
                filters.goldOnly ? styles.toggleActive : {},
              ]}
            >
              {filters.goldOnly && (
                <View style={styles.toggleDot} />
              )}
            </View>
          </Pressable>

          {/* Double Date Mode Toggle */}
          <Pressable
            style={({ pressed }) => [styles.toggleItem, pressed ? { opacity: 0.7 } : {}]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              
              if (!user?.doubleDate?.status || user.doubleDate.status !== 'linked') {
                Alert.alert(
                  t('double_date.mode_toggle'),
                  t('filters.link_profile_first'),
                  [
                    { text: t('common.cancel'), style: "cancel" },
                    { text: t('filters.configure_now'), onPress: () => router.push('/double-date/setup' as any) }
                  ]
                );
                return;
              }

              if (plan === 'free') {
                router.push('/paywall' as any);
                return;
              }

              setFilters({ ...filters, isDoubleMode: !filters.isDoubleMode });
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <Text style={[styles.toggleLabel, filters.isDoubleMode && { color: '#FFD700' }]}>
                 {t('double_date.mode_toggle')}
               </Text>
               {plan === 'free' && <Text style={{ fontSize: 12 }}>🔒</Text>}
            </View>
            <View
              style={[
                styles.toggle,
                filters.isDoubleMode ? { backgroundColor: '#FFD700' } : {},
              ]}
            >
              {filters.isDoubleMode && (
                <View style={[styles.toggleDot, { backgroundColor: '#000' }]} />
              )}
            </View>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
          onPress={handleApply}
        >
          <LinearGradient
            colors={['#FF2D78', '#FF6B35'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyButton}
          >
            <Text style={styles.applyButtonText}>{t('filters.apply')}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const OptionChip = ({ label, active, onPress }: any) => (
  <Pressable
    style={[
      styles.chip,
      active && styles.chipActive,
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.chipText,
        active && styles.chipTextActive,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitBtnActive: {
    backgroundColor: '#FF2D78',
  },
  unitText: {
    color: '#8A8A8A',
    fontSize: 10,
    fontWeight: '700',
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  backButton: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resetButton: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sliderContainer: {
    gap: 12,
  },
  slider: {
    height: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderTrack: {
    height: '100%',
    backgroundColor: '#FF2D78',
    borderRadius: 2,
  },
  sliderInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelBtn: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#4FC3F7', // Platinum/Gold flavor color
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 4,
  },
  travelBtnText: {
    color: '#4FC3F7',
    fontWeight: '700',
    fontSize: 14,
  },
  sliderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sliderValue: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  chipText: {
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FF2D78',
    fontWeight: '600',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#FF2D78',
    borderColor: '#FF2D78',
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  applyButton: {
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
