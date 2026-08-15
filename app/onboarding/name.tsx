import React, { useState } from 'react';
import { TextInput, StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';

export default function OnboardingName() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  
  const { updateProfile, firebaseUser, logout } = useAuth();

  const handleNext = async () => {
    if (!name.trim() || loading) return;
    
    setLoading(true);
    setErrorVisible(false);
    
    try {
      await updateProfile({ name: name.trim() });
      router.push('/onboarding/birth' as any);
    } catch (error) {
      console.error("Error updating name:", error);
      setErrorVisible(true);
      Alert.alert(t('common.error'), t('onboarding.name.error_save'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={10}
      title={t('onboarding.name.title')}
      subtitle={t('onboarding.name.subtitle')}
      onNext={handleNext}
      nextDisabled={name.trim().length < 2 || loading}
      nextLoading={loading}
      scrollable
    >
      <View style={styles.container}>
        {firebaseUser?.email && (
          <View style={styles.accountCard}>
            <Text style={styles.accountLabel}>{t('onboarding.name.account_info')}:</Text>
            <Text style={styles.accountEmail}>{firebaseUser.email}</Text>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>{t('onboarding.name.logout')}</Text>
            </Pressable>
          </View>
        )}

        <TextInput
          style={[styles.input, errorVisible && styles.inputError]}
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (errorVisible) setErrorVisible(false);
          }}
          placeholder={t('onboarding.name.placeholder')}
          placeholderTextColor="#8A8A8A"
          maxLength={30}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleNext}
        />
        <Text style={styles.hint}>{t('onboarding.name.hint')}</Text>
        
        {errorVisible && (
          <Text style={styles.errorText}>{t('onboarding.name.error_save')}</Text>
        )}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
  },
  accountCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  accountLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    marginBottom: 4,
  },
  accountEmail: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  logoutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  logoutText: {
    color: '#FF2D78',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#FF2D78',
  },
  hint: {
    color: '#8A8A8A',
    fontSize: 13,
    marginTop: -10,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#FF2D78',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },
});
