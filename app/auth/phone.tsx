import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { GradientButton } from '@/components/gradient-button';
import * as Haptics from 'expo-haptics';

const COUNTRY_CODES = [
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+53', flag: '🇨🇺', name: 'Cuba' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+1', flag: '🇵🇷', name: 'Puerto Rico' },
  { code: '+1', flag: '🇩🇴', name: 'Rep. Dominicana' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+1', flag: '🇨🇦', name: 'Canadá' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+33', flag: '🇫🇷', name: 'Francia' },
  { code: '+49', flag: '🇩🇪', name: 'Alemania' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
];

import { useTranslation } from 'react-i18next';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const COUNTRY_CODES = [
    { code: '+54', flag: '🇦🇷', name: t('phone.countries.ar') },
    { code: '+591', flag: '🇧🇴', name: t('phone.countries.bo') },
    { code: '+55', flag: '🇧🇷', name: t('phone.countries.br') },
    { code: '+56', flag: '🇨🇱', name: t('phone.countries.cl') },
    { code: '+57', flag: '🇨🇴', name: t('phone.countries.co') },
    { code: '+506', flag: '🇨🇷', name: t('phone.countries.cr') },
    { code: '+53', flag: '🇨🇺', name: t('phone.countries.cu') },
    { code: '+593', flag: '🇪🇨', name: t('phone.countries.ec') },
    { code: '+503', flag: '🇸🇻', name: t('phone.countries.sv') },
    { code: '+34', flag: '🇪🇸', name: t('phone.countries.es') },
    { code: '+1', flag: '🇺🇸', name: t('phone.countries.us') },
    { code: '+502', flag: '🇬🇹', name: t('phone.countries.gt') },
    { code: '+504', flag: '🇭🇳', name: t('phone.countries.hn') },
    { code: '+52', flag: '🇲🇽', name: t('phone.countries.mx') },
    { code: '+505', flag: '🇳🇮', name: t('phone.countries.ni') },
    { code: '+507', flag: '🇵🇦', name: t('phone.countries.pa') },
    { code: '+595', flag: '🇵🇾', name: t('phone.countries.py') },
    { code: '+51', flag: '🇵🇪', name: t('phone.countries.pe') },
    { code: '+1', flag: '🇵🇷', name: t('phone.countries.pr') },
    { code: '+1', flag: '🇩🇴', name: t('phone.countries.do') },
    { code: '+598', flag: '🇺🇾', name: t('phone.countries.uy') },
    { code: '+58', flag: '🇻🇪', name: t('phone.countries.ve') },
    { code: '+1', flag: '🇨🇦', name: t('phone.countries.ca') },
    { code: '+44', flag: '🇬🇧', name: t('phone.countries.uk') },
    { code: '+33', flag: '🇫🇷', name: t('phone.countries.fr') },
    { code: '+49', flag: '🇩🇪', name: t('phone.countries.de') },
    { code: '+39', flag: '🇮🇹', name: t('phone.countries.it') },
    { code: '+351', flag: '🇵🇹', name: t('phone.countries.pt') },
  ];

  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (phone.length < 8) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/auth/otp' as any);
      return;
    }

    try {
      setLoading(true);
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      const { auth, authStore } = await import('@/lib/firebase');

      // Initialize Recaptcha if it doesn't exist
      if (!authStore.recaptchaVerifier) {
        authStore.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }

      const fullPhoneNumber = `${selectedCountry.code}${phone}`;
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, authStore.recaptchaVerifier);

      // Save result in memory to use in OTP screen
      authStore.confirmationResult = confirmationResult;
      
      router.push('/auth/otp' as any);
    } catch (error: any) {
      console.error('Phone Auth Error:', error);
      alert('Error: ' + error.message);
      
      // Reset recaptcha if error occurs to allow retry
      try {
        const { authStore } = await import('@/lib/firebase');
        if (authStore.recaptchaVerifier) authStore.recaptchaVerifier.clear();
        authStore.recaptchaVerifier = null;
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.title}>{t('phone.title')}</Text>
          <Text style={styles.subtitle}>
            {t('phone.subtitle')}
          </Text>

          {/* Phone input */}
          <View style={styles.inputRow}>
            <Pressable
              style={styles.countrySelector}
              onPress={() => setShowCountries(!showCountries)}
            >
              <Text style={styles.flag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.code}</Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>

            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phone.placeholder')}
              placeholderTextColor="#8A8A8A"
              keyboardType="phone-pad"
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {/* Country dropdown */}
          {showCountries && (
            <View style={styles.dropdown}>
              {COUNTRY_CODES.map((country) => (
                <Pressable
                  key={country.code}
                  style={({ pressed }) => [styles.dropdownItem, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountries(false);
                  }}
                >
                  <Text style={styles.dropdownFlag}>{country.flag}</Text>
                  <Text style={styles.dropdownName}>{country.name}</Text>
                  <Text style={styles.dropdownCode}>{country.code}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.disclaimer}>
            {t('phone.disclaimer')}
          </Text>

          {/* Invisible Recaptcha Container for Web */}
          <View nativeID="recaptcha-container" />

          <GradientButton
            label={loading ? "Enviando..." : t('phone.send_code')}
            onPress={handleContinue}
            disabled={phone.length < 8 || loading}
            style={{ width: '100%', marginTop: 24 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8A8A',
    lineHeight: 24,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  countryCode: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: '#8A8A8A',
    fontSize: 12,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    height: 56,
  },
  dropdown: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  dropdownFlag: {
    fontSize: 20,
  },
  dropdownName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  dropdownCode: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    color: '#8A8A8A',
    lineHeight: 18,
    textAlign: 'center',
  },
});
