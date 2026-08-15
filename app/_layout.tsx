import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { setupI18n } from "@/lib/i18n";
import { NotificationProvider } from "@/lib/notification-context";
import { NotificationToast } from "@/components/notification-toast";
import { initializeAds } from "@/lib/ad-service";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  addDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  interpolate
} from 'react-native-reanimated';
import { useGlobalInterstitial } from '@/hooks/useGlobalInterstitial';

function GlobalAdManager() {
  useGlobalInterstitial();
  return null;
}

function BannedGuard({ children }: { children: React.ReactNode }) {
  const { isBanned, banInfo, logout, user } = useAuth();
  const { t } = useTranslation();
  const [appealText, setAppealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (isBanned && banInfo) {
    const dateStr = banInfo.endsAt ? new Date(banInfo.endsAt).toLocaleString() : 'Permanente';
    
    const handleSubmitAppeal = async () => {
      if (!appealText.trim()) {
        Alert.alert(t('common.error'), t('ban.appeal_error_empty'));
        return;
      }

      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'reports'), {
          type: 'appeal',
          status: 'pending',
          reporterId: user?.uid || 'unknown',
          reporterName: user?.name || t('ban.title'),
          reportedUserId: user?.uid || 'unknown',
          reportedUserName: user?.name || t('ban.title'),
          description: appealText,
          createdAt: serverTimestamp(),
          reason: 'Apelación de baneo'
        });
        setHasSubmitted(true);
        setShowForm(false);
        Alert.alert(t('common.success'), t('ban.appeal_success'));
      } catch (error) {
        console.error("Error submitting appeal:", error);
        Alert.alert(t('common.error'), t('ban.appeal_error'));
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}>
        <LinearGradient
          colors={['#1a0505', '#000000', '#0a0a0a']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Danger Glow Effect */}
        <View style={{
          position: 'absolute',
          top: '10%',
          width: 400,
          height: 400,
          borderRadius: 200,
          ...Platform.select({
            web: {
              boxShadow: '0 0 100px rgba(255, 45, 120, 0.05)',
            },
            default: {}
          })
        }} />

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Animated.View entering={FadeInDown.duration(800).springify()} style={{ alignItems: 'center', width: '100%' }}>
            <View style={{ 
              width: 100, 
              height: 100, 
              borderRadius: 50, 
              backgroundColor: 'rgba(255, 59, 48, 0.1)', 
              justifyContent: 'center', 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 59, 48, 0.3)',
              marginBottom: 24
            }}>
              <Text style={{ fontSize: 50 }}>🚫</Text>
            </View>

            <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginBottom: 12, textAlign: 'center', letterSpacing: -1 }}>
              {t('ban.restricted_access')}
            </Text>
            
            <Text style={{ color: '#8A8A8A', fontSize: 17, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
              {t('ban.suspended_message')}{"\n"}
              <Text style={{ color: '#FF3B30', fontWeight: '800' }}>{banInfo.reason}</Text>
            </Text>
            
            <View style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              paddingVertical: 14, 
              paddingHorizontal: 24, 
              borderRadius: 20, 
              borderWidth: 1, 
              borderColor: 'rgba(255,255,255,0.08)', 
              width: '100%', 
              marginBottom: 32 
            }}>
              <Text style={{ color: '#8A8A8A', textAlign: 'center', fontSize: 14, fontWeight: '500' }}>
                {t('ban.restriction_ends')}{"\n"}
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{dateStr}</Text>
              </Text>
            </View>

            {!hasSubmitted ? (
              !showForm ? (
                <Pressable 
                  onPress={() => setShowForm(true)}
                  style={({pressed}) => [{ 
                    width: '100%', 
                    height: 56,
                    borderRadius: 16, 
                    overflow: 'hidden',
                    marginBottom: 12
                  }, pressed && { opacity: 0.8 }]}
                >
                  <LinearGradient
                    colors={['#1E88E5', '#1565C0']}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{t('ban.start_appeal')}</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Animated.View entering={FadeIn.duration(400)} style={{ width: '100%', gap: 16 }}>
                  <TextInput
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      color: '#FFF', 
                      borderRadius: 16, 
                      padding: 20, 
                      borderWidth: 1, 
                      borderColor: 'rgba(255,255,255,0.1)', 
                      minHeight: 120, 
                      textAlignVertical: 'top',
                      fontSize: 15
                    }}
                    placeholder={t('ban.appeal_placeholder')}
                    placeholderTextColor="#555"
                    multiline
                    value={appealText}
                    onChangeText={setAppealText}
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable 
                      onPress={() => setShowForm(false)}
                      style={{ flex: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#8A8A8A', fontWeight: '600' }}>{t('common.cancel')}</Text>
                    </Pressable>
                    <Pressable 
                      onPress={handleSubmitAppeal}
                      disabled={isSubmitting}
                      style={{ flex: 2, height: 50, backgroundColor: '#4CAF50', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{t('ban.submit_review')}</Text>}
                    </Pressable>
                  </View>
                </Animated.View>
              )
            ) : (
              <Animated.View 
                entering={FadeIn.duration(500)}
                style={{ 
                  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                  padding: 20, 
                  borderRadius: 20, 
                  width: '100%', 
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(76, 175, 80, 0.2)',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Text style={{ fontSize: 24 }}>✅</Text>
                <Text style={{ color: '#4CAF50', textAlign: 'center', fontWeight: '800', fontSize: 16 }}>
                  {t('ban.in_review')}
                </Text>
                <Text style={{ color: 'rgba(76, 175, 80, 0.7)', textAlign: 'center', fontSize: 13 }}>
                  {t('ban.in_review_desc')}
                </Text>
              </Animated.View>
            )}

            <Pressable 
              onPress={() => logout()}
              style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Text style={{ color: '#8A8A8A', fontWeight: 'bold', fontSize: 13 }}>{t('profile.logout')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const { t } = useTranslation();
  const [isMaintenance, setIsMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    let unsub: Unsubscribe | null = null;
    try {
      // Usamos el documento 'core' de 'system_settings'
      unsub = onSnapshot(doc(db, 'system_settings', 'core'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("[MaintenanceGuard] Syncing state:", data.maintenanceMode);
          setIsMaintenance(data.maintenanceMode === true);
        } else {
          console.log("[MaintenanceGuard] Settings doc not found, defaulting to OFF.");
          setIsMaintenance(false);
        }
      }, (err) => {
        console.error("[MaintenanceGuard] Firestore error (Check your Rules!):", err);
        setIsMaintenance(false);
      });
    } catch (e) {
      console.error("[MaintenanceGuard] Failed to attach listener:", e);
      setIsMaintenance(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const isAdmin = user?.email?.toLowerCase() === 'admin@aura-app.com';

  const scale = useSharedValue(1);
  const orb1Pos = useSharedValue(0);
  const orb2Pos = useSharedValue(0);

  useEffect(() => {
    // Solo iniciamos animaciones si estamos en modo mantenimiento y no somos admin
    if (isMaintenance === true && user && !isAdmin) {
      scale.value = withRepeat(withSequence(withTiming(1.1, { duration: 2000 }), withTiming(1, { duration: 2000 })), -1, true);
      orb1Pos.value = withRepeat(withTiming(20, { duration: 4000 }), -1, true);
      orb2Pos.value = withRepeat(withTiming(-30, { duration: 5000 }), -1, true);
    } else {
      // Limpiar o detener animaciones si el estado cambia
      scale.value = 1;
      orb1Pos.value = 0;
      orb2Pos.value = 0;
    }
  }, [isMaintenance, user, isAdmin]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1Pos.value }, { translateX: orb1Pos.value * 0.5 }]
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb2Pos.value }, { translateX: orb2Pos.value * -0.3 }]
  }));

  // Mientras carga el estado desde Firestore o la autenticación, mostramos un loader
  if (isMaintenance === null || status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#FF2D78" />
      </View>
    );
  }

  if (isMaintenance && user && !isAdmin) {
    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}>
        <LinearGradient
          colors={['#050505', '#0A0A0A', '#050505']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Animated Background Orbs */}
        <Animated.View 
          style={[
            {
              position: 'absolute',
              top: '10%',
              right: '-10%',
              width: 350,
              height: 350,
              borderRadius: 175,
              backgroundColor: 'rgba(255, 45, 120, 0.12)',
              ...Platform.select({
                web: { boxShadow: '0 0 90px rgba(255, 45, 120, 0.12)' },
                default: {}
              })
            },
            orb1Style
          ]}
        />

        <Animated.View 
          style={[
            {
              position: 'absolute',
              bottom: '5%',
              left: '-15%',
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: 'rgba(255, 107, 53, 0.08)',
              ...Platform.select({
                web: { boxShadow: '0 0 80px rgba(255, 107, 53, 0.08)' },
                default: {}
              })
            },
            orb2Style
          ]}
        />
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Animated.View 
            entering={FadeInDown.duration(1000).springify()}
            style={{ alignItems: 'center', width: '100%', maxWidth: 360 }}
          >
            {/* System Status Header */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 8, 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              marginBottom: 40
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' }} />
              <Text style={{ color: '#8A8A8A', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{t('maintenance.system_status')}</Text>
            </View>

            {/* Premium Icon Container */}
            <View style={{ marginBottom: 32 }}>
              <Animated.View style={[
                {
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#161616',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 45, 120, 0.3)',
                  ...Platform.select({
                    web: {
                      boxShadow: '0px 0px 20px rgba(255, 45, 120, 0.5)',
                    },
                    default: {
                      shadowColor: '#FF2D78',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 20,
                    }
                  }),
                },
                animatedIconStyle
              ]}>
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="sparkles" size={40} color="#FFF" />
                </LinearGradient>
              </Animated.View>
            </View>

            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 36, 
              fontWeight: '900', 
              marginBottom: 8, 
              textAlign: 'center',
              letterSpacing: -1.5,
            }}>
              Aura <Text style={{ color: '#FF2D78' }}>Pro</Text>
            </Text>
            
            <Text style={{ 
              color: '#8A8A8A', 
              fontSize: 14, 
              fontWeight: '600', 
              marginBottom: 32,
              textTransform: 'uppercase',
              letterSpacing: 4
            }}>
              Maintenance
            </Text>

            <View style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 32,
              padding: 32,
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.05)',
              marginBottom: 40,
              overflow: 'hidden'
            }}>
              <Text style={{ 
                color: '#D0D0D0', 
                fontSize: 17, 
                textAlign: 'center', 
                lineHeight: 26,
                fontWeight: '500'
              }}>
                {t('maintenance.message')}
              </Text>
              
              {/* Fake Progress Bar */}
              <View style={{ marginTop: 24, height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <Animated.View style={[
                  { 
                    height: '100%', 
                    width: '65%', 
                    backgroundColor: '#FF2D78',
                    borderRadius: 2,
                    ...Platform.select({
                      web: {
                        boxShadow: '0 0 10px #FF2D78',
                      },
                      default: {
                        shadowColor: '#FF2D78',
                        shadowRadius: 10,
                        shadowOpacity: 1
                      }
                    })
                  }
                ]} />
              </View>
              <Text style={{ color: '#555', fontSize: 10, textAlign: 'center', marginTop: 8, fontWeight: '700' }}>{t('maintenance.rebuilding')}</Text>
            </View>

            <View style={{ gap: 16, width: '100%', alignItems: 'center' }}>
               <Pressable 
                onPress={() => logout()}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#FFFFFF',
                    paddingVertical: 16,
                    paddingHorizontal: 40,
                    borderRadius: 20,
                    width: '100%',
                    alignItems: 'center',
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
              >
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>{t('maintenance.logout')}</Text>
              </Pressable>

              <Text style={{ color: '#555', fontSize: 12, fontWeight: '600' }}>
                {t('maintenance.patience')}
              </Text>
            </View>

            <View style={{ marginTop: 60, flexDirection: 'row', gap: 12, opacity: 0.3 }}>
              <Ionicons name="logo-instagram" size={20} color="#FFF" />
              <Ionicons name="logo-twitter" size={20} color="#FFF" />
              <Ionicons name="globe-outline" size={20} color="#FFF" />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <>
      {isMaintenance && isAdmin && (
        <View style={{ backgroundColor: '#FF2D78', paddingVertical: 4, alignItems: 'center', zIndex: 1000000 }}>
          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>⚠️ MODO MANTENIMIENTO ACTIVO PARA USUARIOS</Text>
        </View>
      )}
      {children}
    </>
  );
}
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize i18n settings and Ads on client
  useEffect(() => {
    setupI18n();
    initializeAds();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <NotificationProvider>
            <SubscriptionProvider>
              <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                  <MaintenanceGuard>
                    <BannedGuard>
                      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="auth/welcome" />
                        <Stack.Screen name="auth/phone" />
                        <Stack.Screen name="auth/otp" />
                        <Stack.Screen name="onboarding/name" />
                        <Stack.Screen name="onboarding/birth" />
                        <Stack.Screen name="onboarding/gender" />
                        <Stack.Screen name="onboarding/location" />
                        <Stack.Screen name="onboarding/photos" />
                        <Stack.Screen name="onboarding/interests" />
                        <Stack.Screen name="onboarding/prompts" />
                        <Stack.Screen name="onboarding/bio" />
                        <Stack.Screen name="onboarding/verification" />
                        <Stack.Screen name="chat/[matchId]" />
                        <Stack.Screen name="profile/[uid]" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="stories/create" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="stories-feed" />
                        <Stack.Screen name="(admin)/stories" />
                        <Stack.Screen name="community-rules" />
                        <Stack.Screen name="safety-center" />
                        <Stack.Screen name="cookies" />
                        <Stack.Screen name="privacy" />
                        <Stack.Screen name="terms" />
                        <Stack.Screen name="licenses" />
                      </Stack>
                      <NotificationToast />
                      <GlobalAdManager />
                      <StatusBar hidden />
                    </BannedGuard>
                  </MaintenanceGuard>
                </QueryClientProvider>
              </trpc.Provider>
            </SubscriptionProvider>
          </NotificationProvider>
        </AuthProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
