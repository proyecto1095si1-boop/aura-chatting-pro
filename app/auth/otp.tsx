import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { GradientButton } from '@/components/gradient-button';
import { useAuth } from '@/lib/auth-context';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';

export default function OTPScreen() {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { login } = useAuth();

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      const { authStore, auth, db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      let credential;

      if (Platform.OS === 'web' && authStore.confirmationResult) {
        // Real Phone Auth verification
        credential = await authStore.confirmationResult.confirm(code);
        // Clear it now that it's consumed
        authStore.confirmationResult = null;
      } else {
        // Fallback for Native Expo Go (Anonymous dev login)
        const { signInAnonymously } = await import('firebase/auth');
        credential = await signInAnonymously(auth);
      }
      
      // Update our local Context profile with the generated real UID
      await login(credential.user.uid, credential.user.phoneNumber);
      
      try {
        const userRef = doc(db, 'profiles', credential.user.uid);
        const docSnap = await getDoc(userRef);
        const profile = docSnap.exists() ? docSnap.data() as any : null;

        if (profile?.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/name' as any);
        }
      } catch (dbError: any) {
        console.warn("Firestore error during login redirect:", dbError);
        if (dbError.message?.includes('offline') || dbError.code === 'unavailable') {
          alert(t('auth.offline_mode'));
          router.replace('/(tabs)');
        } else {
          throw dbError;
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let msg = error.message;
      if (msg?.includes('offline') || error.code?.includes('network')) msg = t('auth.no_internet');
      alert('Error: ' + msg);
    } finally {
      setLoading(false);
    }
  };


  const isComplete = otp.every(d => d !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>{t('otp.title')}</Text>
        <Text style={styles.subtitle}>
          {t('otp.subtitle')}
        </Text>

        {/* OTP inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              value={digit}
              onChangeText={(val) => handleChange(val, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor="#FF2D78"
            />
          ))}
        </View>

        <Pressable style={styles.resendButton}>
          <Text style={styles.resendText}>{t('otp.resend_text')}</Text>
          <Text style={styles.resendLink}>{t('otp.resend_link')}</Text>
        </Pressable>

        <GradientButton
          label={t('otp.verify')}
          onPress={handleVerify}
          disabled={!isComplete}
          loading={loading}
          style={{ width: '100%', marginTop: 16 }}
        />
      </View>
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
    gap: 20,
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
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginVertical: 16,
  },
  otpInput: {
    width: 48,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    backgroundColor: '#161616',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  otpInputFilled: {
    borderColor: '#FF2D78',
    backgroundColor: '#1A0A12',
  },
  resendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  resendLink: {
    color: '#FF2D78',
    fontSize: 14,
    fontWeight: '600',
  },
});
