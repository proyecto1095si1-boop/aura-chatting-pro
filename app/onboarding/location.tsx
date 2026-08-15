import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { LinearGradient } from 'expo-linear-gradient';

import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { geohashForLocation } from 'geofire-common';

export default function OnboardingLocation() {
  const { t } = useTranslation();
  const [locationGranted, setLocationGranted] = useState(false);
  const [originCity, setOriginCity] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAuth();
  const [geohashRef, setGeohashRef] = useState<string | undefined>(undefined);

  const handleRequestLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert(t('onboarding.location.permission_denied', 'Permiso denegado. Permite el acceso para continuar.'));
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      };

      const hash = geohashForLocation([coords.latitude, coords.longitude]);
      setGeohashRef(hash);

      let countryCodeFallback: string | undefined = undefined;
      try {
        const geocode = await Location.reverseGeocodeAsync(coords);
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          countryCodeFallback = place.isoCountryCode || '';
          // Filter out missing parts to compose a nice location string
          const cityString = [place.city || place.region || place.name, place.country].filter(Boolean).join(', ');
          setOriginCity(cityString);
        } else {
          setOriginCity(`${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`);
        }
      } catch (geocodeError) {
        // Fallback if reverse geocoding fails (common on web without API keys)
        setOriginCity(`${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`);
      }

      setLocationGranted(true);
      await updateProfile({ location: coords, geohash: hash, countryCode: countryCodeFallback });
    } catch (e: any) {
      alert('Error fetching location: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!locationGranted) return;
    await updateProfile({ originCity: originCity.trim() || undefined, geohash: geohashRef });
    router.push('/onboarding/lifestyle' as any);
  };

  return (
    <OnboardingLayout
      step={4}
      totalSteps={10}
      title={t('onboarding.location.title')}
      subtitle={t('onboarding.location.subtitle')}
      onNext={handleNext}
      nextDisabled={!locationGranted}
      scrollable
    >
      {!locationGranted ? (
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationTitle}>{t('onboarding.location.activate_title')}</Text>
          <Text style={styles.locationDesc}>
            {t('onboarding.location.activate_desc')}
          </Text>
          <Pressable
            onPress={handleRequestLocation}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={['#FF2D78', '#FF6B35'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.locationButton}
            >
              <Text style={styles.locationButtonText}>
                {loading ? t('onboarding.location.activating') : t('onboarding.location.allow_access')}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.grantedContainer}>
          <View style={styles.grantedBadge}>
            <Text style={styles.grantedIcon}>✓</Text>
            <Text style={styles.grantedText}>{t('onboarding.location.activated')}</Text>
          </View>
          <Text style={styles.grantedSubtext}>{originCity || "Localización detectada"}</Text>
        </View>
      )}

      <View style={styles.originSection}>
        <Text style={styles.originLabel}>{t('onboarding.location.origin_label')}</Text>
        <TextInput
          style={styles.originInput}
          value={originCity}
          onChangeText={setOriginCity}
          placeholder={t('onboarding.location.origin_placeholder')}
          placeholderTextColor="#8A8A8A"
          returnKeyType="done"
        />
        <Text style={styles.originHint}>{t('onboarding.location.origin_hint')}</Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  locationCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  locationIcon: {
    fontSize: 48,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  locationDesc: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 32,
    marginTop: 8,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  grantedContainer: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 20,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D2B1A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  grantedIcon: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
  },
  grantedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  grantedSubtext: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  originSection: {
    gap: 10,
  },
  originLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  originInput: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  originHint: {
    color: '#8A8A8A',
    fontSize: 12,
    paddingHorizontal: 4,
  },
});
