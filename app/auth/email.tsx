import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '@/components/gradient-button';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';

export default function EmailAuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.enter_email_password'));
      return;
    }

    try {
      setLoading(true);
      let result;
      if (isLogin) {
        result = await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      
      // Manual login/initialize in context (near-instant now with cache-first)
      await login(result.user.uid, result.user.email);

      // Admin redirect
      if (email.trim().toLowerCase() === 'admin@aura-app.com') {
        router.replace('/(admin)');
        return;
      }

      // Check profile once more before final redirect
      try {
        const userRef = doc(db, 'profiles', result.user.uid);
        const docSnap = await getDoc(userRef);
        const profile = docSnap.exists() ? docSnap.data() as any : null;

        if (profile?.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/name' as any);
        }
      } catch (e) {
        // Fallback to onboarding if Firestore fails/offline
        router.replace('/onboarding/name' as any);
      }
    } catch (e: any) {
      console.error(e);
      let msg = e.message;
      if (e.code === 'auth/invalid-email') msg = t('auth.invalid_email');
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') msg = t('auth.wrong_credentials');
      if (e.code === 'auth/email-already-in-use') msg = t('auth.email_already_in_use');
      if (e.code === 'auth/weak-password') msg = t('auth.weak_password');
      if (e.code === 'auth/network-request-failed' || msg?.includes('offline')) msg = t('auth.no_internet');
      Alert.alert(t('auth.auth_error_title'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#0A0A0A', '#1A0A12', '#0A0A0A']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.title}>
          {isLogin ? t('auth.welcome_back') : t('auth.create_account')}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin ? t('auth.login_subtitle') : t('auth.register_subtitle')}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.email_placeholder')}
            placeholderTextColor="#8A8A8A"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder={t('auth.password_placeholder')}
            placeholderTextColor="#8A8A8A"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <GradientButton
            label={loading ? t('auth.processing') : (isLogin ? t('auth.login') : t('auth.register'))}
            onPress={handleAuth}
            style={{ marginTop: 16 }}
            disabled={loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isLogin ? t('auth.no_account') : t('auth.has_account')}
          </Text>
          <Pressable onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchModeText}>
              {isLogin ? t('auth.register_link') : t('auth.login_link')}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
  },
  backButton: {
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8A8A',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  switchModeText: {
    color: '#FF2D78',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
