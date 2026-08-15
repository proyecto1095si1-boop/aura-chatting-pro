import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const { status } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (status === 'loading') return;
      if (status === 'authenticated') {
        router.replace('/(tabs)');
      } else if (status === 'onboarding') {
        router.replace('/onboarding/name' as any);
      } else {
        router.replace('/auth/welcome' as any);
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [status]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.appName}>Aura</Text>
        <Text style={styles.tagline}>Conecta con tu Aura</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    overflow: 'hidden',
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 4,
  },
});
