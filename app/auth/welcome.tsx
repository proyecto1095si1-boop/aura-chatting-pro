import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { GradientButton } from '@/components/gradient-button';
import * as Haptics from 'expo-haptics';
import { BackHandler } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';

import { GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithCredential } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

// Web Client ID comes from env vars (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
}

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { login, status, user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  // Google Auth Logic is handled natively or via popup on web

  React.useEffect(() => {
    if (__DEV__) {
      console.log("[Auth] Google Config: Initialized with hardcoded Web Client ID");
    }
  }, []);


  const handleNativeGoogleCredential = async (idToken: string) => {
    try {
      setLoading(true);
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const profile = await login(result.user.uid, result.user.email);

      if (profile?.role === 'admin' || result.user.email?.toLowerCase() === 'admin@aura-app.com') {
        router.replace('/(admin)');
      } else if (profile?.onboardingComplete) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/name' as any);
      }
    } catch (error: any) {
      console.error('Firebase Credential Error:', error);
      Alert.alert(t('auth.access_error_title'), error.message);
    } finally {
      setLoading(false);
    }
  };

  // Prevent back button from going to previous session (onboarding/tabs) after logout
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      const backAction = () => {
        // If we are at the welcome screen and logged out, back should exit the app
        BackHandler.exitApp();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }
  }, [status]);

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      if (user?.role === 'admin' || user?.email?.toLowerCase() === 'admin@aura-app.com') {
        router.replace('/(admin)');
      } else {
        router.replace('/(tabs)');
      }
    } else if (status === 'onboarding') {
      // Use replace to avoid back navigation to welcome during onboarding
      router.replace('/onboarding/name' as any);
    }
    setInitialized(true);
  }, [status]);

  const handleGoogle = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'web') {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        // login() sets status & user in context, then returns the profile
        const profile = await login(result.user.uid, result.user.email);

        // Explicit redirect for ALL user types
        if (result.user.email?.toLowerCase() === 'admin@aura-app.com' || profile?.role === 'admin') {
          router.replace('/(admin)');
        } else if (profile?.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/name' as any);
        }
      } catch (error: any) {
        console.error('Google login error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
          setLoading(false); return;
        }
        alert('Error: ' + (error.message?.includes('offline') ? t('auth.no_internet') : error.message));
      } finally {
        setLoading(false);
      }
    } else {
      // Native Google Auth Flow using @react-native-google-signin/google-signin
      try {
        setLoading(true);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 1. Check Play Services
        await GoogleSignin.hasPlayServices();
        
        // 2. Sign In
        const userInfo = await GoogleSignin.signIn();
        
        // 3. Extract Token (handling both old and new SDK versions for safety)
        const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
        
        if (idToken) {
          await handleNativeGoogleCredential(idToken);
        } else {
          throw new Error(t('auth.google_token_error'));
        }
      } catch (error: any) {
        setLoading(false);
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          console.log("User cancelled Google Login");
        } else if (error.code === statusCodes.IN_PROGRESS) {
          console.log("Google Login already in progress");
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(t('common.error'), t('auth.play_services_unavailable'));
        } else if (error.code === '7') {
          Alert.alert(t('auth.network_error_title'), t('auth.google_network_error'));
        } else if (error.code === '12500') {
          Alert.alert(t('auth.config_error_title'), t('auth.config_error_sha1'));
        } else {
          console.error("Native Google Login Error:", error.code, error.message);
          Alert.alert(t('auth.access_error_title'), t('auth.access_error_msg', { code: error.code || 'Google' }));
        }
      }
    }
  };

  const handleApple = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    alert(t('auth.apple_not_implemented'));
    try {
      setLoading(true);
      const result = await signInAnonymously(auth);
      await login(result.user.uid, result.user.email);

      try {
        const userRef = doc(db, 'profiles', result.user.uid);
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
    } catch (e: any) {
      alert('Error: ' + (e.message?.includes('offline') ? t('auth.no_internet') : e.message));
    } finally {
      setLoading(false);
    }
  };


  const handlePhone = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/phone' as any);
  };

  const handleEmail = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/email' as any);
  };

  return (
    <View style={styles.container}>
      {/* Background Image with Overlay */}
      <Image
        source={require('@/assets/images/welcome_bg.png')}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(10,10,10,0.4)', 'rgba(10,10,10,0.85)', '#0A0A0A']}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Subtle top glow */}
      <View style={styles.topGlow} />

      {/* Logo area */}
      <View style={styles.logoArea}>
        <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()} style={styles.logoWrapper}>
          <Image
            source={require('@/assets/favicon.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(400).duration(800)} style={styles.appName}>{t('welcome.title')}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(500).duration(800)} style={styles.tagline}>{t('welcome.tagline')}</Animated.Text>
      </View>

      {/* Auth buttons */}
      <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.buttonsArea}>
        {/* Google button */}
        <Pressable
          style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          onPress={handleGoogle}
        >
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
            style={{ width: 20, height: 20 }} 
          />
          <Text style={styles.socialText}>{t('welcome.google')}</Text>
        </Pressable>

        {/* Apple button (Native only or placeholder) */}
        {Platform.OS !== 'web' && (
          <Pressable
            style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            onPress={handleApple}
          >
            <Ionicons name="logo-apple" size={22} color="#FFF" />
            <Text style={styles.socialText}>{t('welcome.apple')}</Text>
          </Pressable>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('welcome.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Phone button */}
        <GradientButton
          label={t('welcome.phone')}
          onPress={handlePhone}
          style={{ width: '100%', height: 56, marginBottom: 4 }}
        />
        <Pressable 
          style={({ pressed }) => [styles.emailLink, pressed && { opacity: 0.6 }]}
          onPress={handleEmail}
        >
          <Text style={styles.emailLinkText}>{t('auth.prefer_email')}</Text>
        </Pressable>

        <Text style={styles.terms}>
          {t('welcome.terms_prefix')}
          <Text style={styles.termsLink} onPress={() => router.push('/terms' as any)}>{t('welcome.terms_link')}</Text>
          {t('welcome.terms_and')}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy' as any)}>{t('welcome.privacy_link')}</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: height * 0.1,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  topGlow: {
    position: 'absolute',
    top: -height * 0.2,
    alignSelf: 'center',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(255, 45, 120, 0.08)',
    ...Platform.select({
      web: { filter: 'blur(100px)' },
      default: {}
    })
  },
  logoArea: {
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
      default: { elevation: 10, shadowColor: '#000', shadowRadius: 16, shadowOpacity: 0.5 }
    })
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.5,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: '80%',
  },
  buttonsArea: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  socialButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' },
      default: {}
    })
  },
  socialText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emailLink: {
    marginTop: 8,
    padding: 8,
  },
  emailLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  terms: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 10,
  },
  termsLink: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
