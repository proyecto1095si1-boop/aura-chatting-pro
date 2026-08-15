import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, Platform, Dimensions, 
  Alert, Modal, ActivityIndicator, FlatList, 
  NativeSyntheticEvent, NativeScrollEvent 
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS, 
  interpolate, 
  Extrapolation, 
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  ZoomIn
} from 'react-native-reanimated';

import { ScreenContainer } from '@/components/screen-container';
import { SmartImage } from '@/components/smart-image';
import { useSubscription } from '@/lib/subscription-context';
import { useAuth, UserProfile } from '@/lib/auth-context';
import { Profile, Team } from '@/lib/mock-data';
import { calculateDistance } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { initializeNotifications } from '@/lib/notifications-service';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import DoubleProfileCard from '@/components/double-profile-card';
import { 
  collection, getDocs, setDoc, doc, serverTimestamp, 
  query, where, orderBy, startAt, endAt, getDoc, 
  limit, onSnapshot, addDoc 
} from 'firebase/firestore';
import { ScrollView } from 'react-native-gesture-handler';
import { showInterstitial, showRewardedAd } from '@/lib/ad-service';
// @ts-ignore
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

// Helper for Image CDN Optimization
const getOptimizedUrl = (url: string, width = 400, height = 600) => {
  if (!url || typeof url !== 'string') return 'https://via.placeholder.com/400x600?text=Sin+Foto';
  
  // No usar Cloudinary demo fetch en producción, es inestable y causa fallos de carga (imágenes de colores)
  // Firebase Storage ya sirve imágenes con buena performance, solo devolvemos la URL original.
  return url;
};

import { getSafeSource } from '@/lib/image-utils';



// ─────────────────────────────────────────────────────────────────────────────
// SwipeAdModal: shown after every 4 swipes for free users
// ─────────────────────────────────────────────────────────────────────────────



type DiscoveryItem = {
  id: string;
  type: 'single' | 'team';
  profile?: Profile;
  team?: Team;
};
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH - 20;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.68; 


interface SwipeOverlayProps {
  type: 'like' | 'dislike' | 'superlike' | null;
  opacity: number;
}


function SwipeOverlay({ type, opacity }: SwipeOverlayProps) {
  const { t } = useTranslation();
  if (!type || opacity === 0) return null;

  const colors = {
    like: ['rgba(76, 175, 80, 0.85)', 'transparent'] as const,
    dislike: ['rgba(255, 45, 120, 0.85)', 'transparent'] as const,
    superlike: ['rgba(79, 195, 247, 0.85)', 'transparent'] as const,
  };

  const labels = { 
    like: t('discover.swipe.like'), 
    dislike: t('discover.swipe.nope'), 
    superlike: t('discover.swipe.super') 
  };
  const labelColors = { like: '#4CAF50', dislike: '#FF2D78', superlike: '#4FC3F7' };

  return (
    <View style={[StyleSheet.absoluteFillObject, { opacity, zIndex: 10 }]}>
      <LinearGradient
        colors={type === 'like' ? ['transparent', 'rgba(76,175,80,0.4)'] : type === 'dislike' ? ['transparent', 'rgba(255,45,120,0.4)'] : ['transparent', 'rgba(79,195,247,0.4)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.overlayBadge, type === 'like' ? styles.overlayRight : type === 'dislike' ? styles.overlayLeft : styles.overlayTop]}>
        <Text style={[styles.overlayText, { color: labelColors[type], borderColor: labelColors[type] }]}>
          {labels[type]}
        </Text>
      </View>
    </View>
  );
}

interface ProfileCardProps {
  profile: Profile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  isTop: boolean;
  onOpenDetail: (profile: Profile) => void;
  canSuperLike: boolean;
}

const ProfileCard = React.memo(({ profile, onSwipeLeft, onSwipeRight, onSwipeUp, isTop, onOpenDetail, canSuperLike }: ProfileCardProps) => {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [overlayType, setOverlayType] = useState<'like' | 'dislike' | 'superlike' | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const handlePhotoTap = (side: 'left' | 'right') => {
    if (side === 'right' && currentPhotoIndex < profile.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else if (side === 'left' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .minDistance(10)
    .runOnJS(true)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      if (event.translationY < -80) {
        setOverlayType('superlike');
        setOverlayOpacity(Math.min(1, Math.abs(event.translationY) / 150));
      } else if (event.translationX > 40) {
        setOverlayType('like');
        setOverlayOpacity(Math.min(1, event.translationX / SWIPE_THRESHOLD));
      } else if (event.translationX < -40) {
        setOverlayType('dislike');
        setOverlayOpacity(Math.min(1, Math.abs(event.translationX) / SWIPE_THRESHOLD));
      } else {
        setOverlayType(null);
        setOverlayOpacity(0);
      }
    })
    .onEnd((event) => {
      if (event.translationY < -120 && Math.abs(event.translationX) < 80) {
        if (canSuperLike) {
          translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 }, () => {
            runOnJS(onSwipeUp)();
          });
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          runOnJS(onSwipeUp)();
        }
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeRight)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        runOnJS(setOverlayType)(null);
        runOnJS(setOverlayOpacity)(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .runOnJS(true)
    .onEnd((event) => {
      const isRight = event.x > CARD_WIDTH / 2;
      runOnJS(handlePhotoTap)(isRight ? 'right' : 'left');
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    if (!isTop) return { transform: [{ scale: 0.98 }] };
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const InfoContainer = Platform.OS === 'ios' ? BlurView : View;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.card, !isTop && styles.cardBehind, animatedStyle]}>
        <SmartImage
          source={getOptimizedUrl(profile.photos[isTop ? currentPhotoIndex : 0], isTop ? 800 : 400, isTop ? 1200 : 600)}
          style={styles.cardImage}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZf6ayfQay~qj[fQayfQayfQay' }}
          transition={200}
          priority={isTop ? "high" : "normal"}
        />

        {isTop && profile.photos.length > 1 && (
          <View style={styles.photoDots}>
            {profile.photos.map((_, i) => (
              <View key={i} style={[styles.photoDot, i === currentPhotoIndex && styles.photoDotActive]} />
            ))}
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        />

        {isTop && <SwipeOverlay type={overlayType} opacity={overlayOpacity} />}

        {isTop && (
          <Pressable 
            style={styles.cardInfo} 
            onPress={() => onOpenDetail(profile)}
          >
            <InfoContainer 
              intensity={60} 
              tint="dark" 
              style={[styles.glassInfo, Platform.OS !== 'ios' && { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            >
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.name}, {profile.age}</Text>
                {profile.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedIcon}>✓</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.distanceRow}>
                <Text style={styles.distanceText}>
                  {(profile as any).isInternational ? '🌍 MUNDI' : `📍 ${profile.distance} ${profile.distanceUnit || 'km'}`}
                </Text>
              </View>

              <View style={styles.miniInterests}>
                {profile.interests.slice(0, 3).map(interest => (
                  <View key={interest} style={styles.miniInterestChip}>
                    <Text style={styles.miniInterestText}>{t(`common.interests.${interest}`)}</Text>
                  </View>
                ))}
                {profile.interests.length > 3 && <Text style={styles.moreHint}>+{(profile.interests.length - 3)}</Text>}
              </View>
            </InfoContainer>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
});


interface FullProfileDetailProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
}

function FullProfileDetail({ profile, isOpen, onClose, onLike, onDislike, onSuperLike }: FullProfileDetailProps) {
  const { t } = useTranslation();
  const [currentPhotoIndexDetail, setCurrentPhotoIndexDetail] = useState(0);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scrollRefDetail = useRef<ScrollView>(null);

  const onScrollDetail = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentPhotoIndexDetail) {
      setCurrentPhotoIndexDetail(roundIndex);
    }
  }, [currentPhotoIndexDetail]);

  const goToPhotoDetail = (index: number) => {
    scrollRefDetail.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentPhotoIndexDetail(index);
  };

  useEffect(() => {
    if (!isOpen) setCurrentPhotoIndexDetail(0);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      translateY.value = withTiming(0, { duration: 400 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!profile) return null;

  const renderLifestyleItem = (icon: string, label: string, value: string | number | null | undefined) => {
    if (!value) return null;
    return (
      <View style={styles.lifestyleItem}>
        <Ionicons name={icon as any} size={20} color="#FF2D78" />
        <View>
          <Text style={styles.lifestyleLabel}>{label}</Text>
          <Text style={styles.lifestyleValue}>{value}</Text>
        </View>
      </View>
    );
  };



  return (
    <Animated.View style={[styles.detailOverlay, animatedStyle]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery with horizontal paging */}
        <View style={[styles.detailGallery, { height: 500, backgroundColor: '#111' }]}>
          <ScrollView 
            ref={scrollRefDetail}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={onScrollDetail}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {(profile.photos || []).map((photo, index) => (
              <View key={index} style={{ width: SCREEN_WIDTH, height: 500 }}>
                <Image 
                  source={getSafeSource(getOptimizedUrl(photo, 800, 1200))} 
                  style={{ width: '100%', height: '100%' }} 
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
                />
              </View>
            ))}
          </ScrollView>
          
          {/* Photo Dots for Detail */}
          {profile.photos.length > 1 && (
            <View style={styles.detailPhotoDots}>
              {profile.photos.map((_, i) => (
                <Pressable 
                  key={i} 
                  onPress={() => goToPhotoDetail(i)}
                  style={[styles.detailPhotoDot, i === currentPhotoIndexDetail && styles.detailPhotoDotActive]} 
                />
              ))}
            </View>
          )}

          {/* Close button overlay */}
          <Pressable style={styles.closeDetailBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.detailBody}>
          <View style={styles.detailHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.detailName}>{profile.name}, {profile.age}</Text>
                {profile.verified && <View style={styles.verifiedBadge}><Text style={styles.verifiedIcon}>✓</Text></View>}
              </View>
              <Text style={styles.detailStatus}>
                {profile.subscription === 'gold' ? t('profile.plans.gold') : profile.subscription === 'elite' ? t('profile.plans.elite') : ''}
              </Text>
            </View>
          </View>

          {/* Section: Bio */}
          {profile.bio && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>{t('profile_detail.about_me')}</Text>
              <Text style={styles.detailBio}>{profile.bio}</Text>
            </View>
          )}

          {/* Section: Lifestyle */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>{t('profile_detail.info')}</Text>
            <View style={styles.lifestyleGrid}>
              {renderLifestyleItem('wine', t('profile_detail.drinks'), profile.drinks ? t(`common.lifestyle.drinking.${profile.drinks}`) : null)}
              {renderLifestyleItem('flame', t('profile_detail.smokes'), profile.smokes ? t(`common.lifestyle.smoking.${profile.smokes}`) : null)}
              {renderLifestyleItem('resize', t('profile_detail.height'), profile.height ? `${profile.height} cm` : null)}
              {renderLifestyleItem('star', t('profile_detail.zodiac'), profile.zodiac ? t(`common.lifestyle.zodiac.${profile.zodiac}`) : null)}
              {renderLifestyleItem('flash', t('profile_detail.personality'), (profile as any).personalityType || null)}
              {renderLifestyleItem('heart', t('profile_detail.looking_for'), profile.relationshipGoal ? t(`common.lifestyle.relationship_goal.${profile.relationshipGoal}`) : null)}
            </View>
          </View>

          {/* Section: Interests */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>{t('profile_detail.interests')}</Text>
            <View style={styles.detailInterests}>
              {profile.interests.map(interest => (
                <View key={interest} style={styles.detailInterestChip}>
                  <Text style={styles.detailInterestText}>{t(`common.interests.${interest}`)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Section: Prompts */}
          {profile.prompts && profile.prompts.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>{t('profile_detail.know_me')}</Text>
              {profile.prompts.map((p: any, i: number) => (
                <View key={i} style={styles.promptCard}>
                  <Text style={styles.promptQuestion}>{t(`prompts.${p.id}`)}</Text>
                  <Text style={styles.promptAnswer}>{p.answer}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Action floating bar */}
      <BlurView intensity={80} tint="dark" style={styles.detailActionsBar}>
        <Pressable style={[styles.detailActionBtn, styles.detailActionDislike]} onPress={() => { onClose(); onDislike(); }}>
          <Ionicons name="close" size={32} color="#FF2D78" />
        </Pressable>
        <Pressable style={[styles.detailActionBtn, styles.detailActionSuper]} onPress={() => { onClose(); onSuperLike(); }}>
          <Ionicons name="star" size={28} color="#4FC3F7" />
        </Pressable>
        <Pressable style={[styles.detailActionBtn, styles.detailActionLike]} onPress={() => { onClose(); onLike(); }}>
          <Ionicons name="heart" size={32} color="#4CAF50" />
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isMundiActive, setIsMundiActive] = useState(false);
  const [isDoubleMode, setIsDoubleMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [discoveryFeed, setDiscoveryFeed] = useState<DiscoveryItem[]>([]);
  const [matchProfile, setMatchProfile] = useState<any | null>(null);
  const { canLike, canSuperLike, consumeLike, consumeSuperLike, consumeBoost, totalBoostsAvailable, plan, boostDuration, limits } = useSubscription();  const matchHeartScale = useSharedValue(1);

  useEffect(() => {
    if (matchProfile) {
      matchHeartScale.value = withSpring(1.2, { damping: 2, stiffness: 80 });
      // Pulsing effect
      const interval = setInterval(() => {
        matchHeartScale.value = withSpring(1.2, { damping: 2, stiffness: 80 }, () => {
          matchHeartScale.value = withSpring(1);
        });
      }, 1500);
      return () => clearInterval(interval);
    } else {
      matchHeartScale.value = 1;
    }
  }, [matchProfile]);

  const matchHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: matchHeartScale.value }]
  }));
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState<string | null>(null);
  const [activeBroadcast, setActiveBroadcast] = useState<any | null>(null);

  // Broadcast Listener with Dismissal Persistence
  useEffect(() => {
    const q = query(
      collection(db, 'broadcasts'),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        const broadcast = { id: snap.docs[0].id, ...docData } as any;
        
        // --- 1. Relevance & Expiration Check ---
        const now = new Date();
        const createdAt = broadcast.createdAt?.toDate ? broadcast.createdAt.toDate() : now;
        const expiresAt = broadcast.expiresAt?.toDate ? broadcast.expiresAt.toDate() : null;
        
        // If it has an expiration date and it passed, don't show
        if (expiresAt && now > expiresAt) {
          setActiveBroadcast(null);
          return;
        }

        // If it doesn't have expiresAt, but it's older than 24h, treat as expired
        const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (!expiresAt && ageInHours > 24) {
          setActiveBroadcast(null);
          return;
        }

        // --- 2. Dismissal Check ---
        const dismissedStr = await AsyncStorage.getItem('dismissed_broadcasts');
        const dismissedIds = dismissedStr ? JSON.parse(dismissedStr) : [];
        
        if (!dismissedIds.includes(broadcast.id)) {
          setActiveBroadcast(broadcast);
        } else {
          setActiveBroadcast(null);
        }
      } else {
        setActiveBroadcast(null);
      }
    });
    return () => unsub();
  }, []);

  const handleDismissBroadcast = async () => {
    if (!activeBroadcast) return;
    try {
      const dismissedStr = await AsyncStorage.getItem('dismissed_broadcasts');
      const dismissedIds = dismissedStr ? JSON.parse(dismissedStr) : [];
      if (!dismissedIds.includes(activeBroadcast.id)) {
        dismissedIds.push(activeBroadcast.id);
        // Keep only the last 10 dismissed IDs to keep storage clean
        const toSave = dismissedIds.slice(-10);
        await AsyncStorage.setItem('dismissed_broadcasts', JSON.stringify(toSave));
      }
      setActiveBroadcast(null);
    } catch (e) {
      console.error("Error dismissing broadcast:", e);
      setActiveBroadcast(null);
    }
  };

  // Notifications flow
  useEffect(() => {
    if (user && !user.pushToken) {
      // Usamos el hook de inicio
      initializeNotifications().then(token => {
         if (token) {
           updateProfile({ pushToken: token });
         }
      });
    }
  }, [user]);

  // Scalability Cache system
  const cachedInteractedIds = useRef<Set<string> | null>(null);
  const lastFiltersString = useRef<string | null>(null);

  // Boost timer logic
  useEffect(() => {
    if (!user?.boostUntil) {
      setBoostTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = new Date(user.boostUntil!).getTime() - Date.now();
      if (remaining <= 0) {
        setBoostTimeLeft(null);
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setBoostTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.boostUntil]);

  const handleActivateBoost = async () => {
    if (boostTimeLeft) {
      Alert.alert(t('boost_alert.active_title'), t('boost_alert.active_desc', { time: boostTimeLeft }));
      return;
    }

    if (totalBoostsAvailable <= 0) {
      Alert.alert(
        t('boost_alert.no_boosts_title'),
        t('boost_alert.no_boosts_desc'),
        [
          { text: t('boost_alert.not_now'), style: "cancel" },
          { text: t('boost_alert.go_to_store'), onPress: () => router.push('/store' as any) }
        ]
      );
      return;
    }

    const options = [
      { label: t('boost_alert.option_30m'), mins: 30, cost: 1 },
      { label: t('boost_alert.option_2h'), mins: 120, cost: 4 },
      { label: t('boost_alert.option_24h'), mins: 1440, cost: 10 },
    ];

    Alert.alert(
      t('boost_alert.activate_title'),
      t('boost_alert.activate_desc', { count: totalBoostsAvailable }),
      [
        { text: t('common.cancel'), style: "cancel" },
        ...options.filter(o => totalBoostsAvailable >= o.cost).map(o => ({
          text: o.label,
          onPress: async () => {
            const success = await consumeBoost(o.mins, o.cost);
            if (success) {
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t('boost_alert.activated_title'), o.mins >= 60 ? t('boost_alert.activated_desc_hours', { count: o.mins / 60 }) : t('boost_alert.activated_desc_minutes', { count: o.mins }));
            }
          }
        }))
      ]
    );
  };

  // ── Swipe Ad tracking (free users only) ────────────────────────────────
  // 'free' plan = ads every 5 minutes; all paid plans = no ads
  // Inicializamos en Date.now() para que los 5 minutos empiecen a contar al abrir la app.
  const lastAdTimeRef = useRef(Date.now());

  const isFreePlan = plan === 'free';

  // Wrap a swipe action: if free and 5 minutes have passed → show ad first
  const withSwipeAd = useCallback(
    async (action: () => void) => {
      if (!isFreePlan) {
        action();
        return;
      }
      
      const now = Date.now();
      // 5 minutos = 5 * 60 * 1000 = 300000 ms
      if (now - lastAdTimeRef.current >= 300000) {
        console.log('[Ads] Han pasado 5 minutos, mostrando intersticial automático...');
        lastAdTimeRef.current = Date.now(); // SET EARLY TO PREVENT DOUBLE ADS
        await showInterstitial();
        action();
      } else {
        action();
      }
    },
    [isFreePlan]
  );



  const loadRealUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Leer filtros guardados por el usuario
      const defaultFilters: any = {
        ageMin: 18, ageMax: 99, distanceMax: 500,
        genders: ['woman', 'man', 'nonbinary'], distanceUnit: 'km',
        goldOnly: false, zodiacs: [], personalities: [],
        interests: [], relationshipGoal: [], hasChildren: 'indifferent',
        smokes: 'indifferent', drinks: 'indifferent', religion: [],
        exercise: [], education: [], pets: [], languages: [],
        heightFilterActive: false, heightMin: 140, heightMax: 210,
        isDoubleMode: false,
      };
      let filters: any = { ...defaultFilters };
      let filtersStr = "";
      try {
        const savedFilters = await AsyncStorage.getItem('user_filters');
        if (savedFilters) {
          filters = { ...defaultFilters, ...JSON.parse(savedFilters) };
          filtersStr = savedFilters;
          setIsDoubleMode(filters.isDoubleMode || false);
          console.log('[Filters] isDoubleMode from saved filters:', filters.isDoubleMode);
        }
      } catch (e) {
        console.warn('Error cargando filtros:', e);
      }

      // Actualizar filtros tracking
      lastFiltersString.current = filtersStr;

      // Leer todos los perfiles del servidor usando geofire-common para geo-queries
      let qSnapshot;
      const centerCoords = user?.travelLocation || user?.location;
      
      if (centerCoords && centerCoords.latitude && centerCoords.longitude && !isMundiActive) {
        const radiusInM = (filters.distanceMax || 500) * 1000;
        const bounds = geohashQueryBounds([centerCoords.latitude, centerCoords.longitude], radiusInM);
        const promises = [];
        for (const b of bounds) {
          const q = query(
            collection(db, 'profiles'),
            orderBy('geohash'),
            startAt(b[0]),
            endAt(b[1]),
            limit(50) // Limita fuertemente cada cuadrante para evitar sobrecarga
          );
          promises.push(getDocs(q));
        }

        const snapshots = await Promise.all(promises);
        const docs = [];
        for (const snap of snapshots) {
          for (const doc of snap.docs) {
            docs.push(doc);
          }
        }

        // --- FALLBACK ---
        // Si no hay suficientes por geohash (perfiles viejos sin geohash),
        // traemos unos cuantos generales
        if (docs.length < 5) {
          try {
            const fallbackQ = query(collection(db, 'profiles'), limit(30));
            const fallbackSnap = await getDocs(fallbackQ);
            for (const d of fallbackSnap.docs) {
              if (!docs.find((existing: any) => existing.id === d.id)) {
                docs.push(d);
              }
            }
          } catch(e) { console.warn('fallback fetch err', e); }
        }

        qSnapshot = { docs };
      } else if (isMundiActive) {
        // Modo Mundi: LIMITAR la consulta para evitar descargar toda la base de datos
        // Ya no limitamos a Gold/Platinum para que muestre a TODO el mundo.
        const mundiQ = query(
          collection(db, 'profiles'),
          limit(100)
        );
        qSnapshot = await getDocs(mundiQ);
      } else {
        // Fallback or Mundi mode: get general profiles
        const fallbackCol = query(collection(db, 'profiles'), limit(100));
        qSnapshot = await getDocs(fallbackCol);
      }

      let interactedIds = new Set<string>();
      if (user?.uid) {
        try {
          // 1. Fetch normal swipes (Single vs Single OR Single vs Team)
          const mySwipesQuery = query(collection(db, 'swipes'), where('from', '==', user.uid), limit(2000));
          const mySwipesSnap = await getDocs(mySwipesQuery);
          mySwipesSnap.forEach(d => interactedIds.add(d.data().to));

          // 2. Fetch double swipes (if user is part of a team)
          const myDoubleSwipesQuery = query(collection(db, 'double_swipes'), where('fromTeam', 'array-contains', user.uid), limit(1000));
          const myDoubleSwipesSnap = await getDocs(myDoubleSwipesQuery);
          myDoubleSwipesSnap.forEach(d => {
            const toTeam = d.data().toTeam || [];
            if (toTeam.length >= 2) {
              const pairId = [...toTeam].sort().join('_');
              interactedIds.add(pairId);
            } else if (typeof d.data().to === 'string') {
               interactedIds.add(d.data().to);
            }
          });

          // 3. Fetch local passes (dislikes)
          const passesQuery = query(collection(db, 'profiles', user.uid, 'passes'), limit(2000));
          const passesSnap = await getDocs(passesQuery);
          passesSnap.forEach(d => interactedIds.add(d.id));

          // 4. Fetch blocks
          const blockedMeQuery = query(collection(db, 'blocks'), where('blockedId', '==', user.uid));
          const blockedMeSnap = await getDocs(blockedMeQuery);
          blockedMeSnap.forEach(d => interactedIds.add(d.data().blockerId));
          
          cachedInteractedIds.current = interactedIds;
        } catch (e) {
          console.warn('Error reading interactions:', e);
          if (cachedInteractedIds.current instanceof Set) {
            interactedIds = cachedInteractedIds.current;
          }
        }
      }

      const fetched: Profile[] = [];

      for (const docObj of qSnapshot.docs) {
        const data = docObj.data() as UserProfile;
        const profileId = docObj.id;

        if (profileId === user?.uid || data.email?.toLowerCase() === 'admin@aura-app.com') continue;
        if (data.banned || data.isHidden || interactedIds.has(profileId)) continue;

        const profileAge = data.age || 0;
        const ageMin = filters.ageMin ?? 18;
        const ageMax = filters.ageMax ?? 99;
        if (profileAge < ageMin || profileAge > ageMax) continue;

        const gendersFilter: string[] = filters.genders || [];
        if (gendersFilter.length > 0 && data.gender && !gendersFilter.includes(data.gender)) continue;

        // Advanced Filters
        if (filters.verified && !data.verified && data.verificationStatus !== 'verified') continue;
        if (filters.hasPhotos && (!data.photos || data.photos.length === 0)) continue;
        
        if (filters.online) {
          const lastActive = (data as any).lastActive || (data as any).updatedAt;
          if (!lastActive) continue;
          const lastActiveTime = lastActive.toMillis ? lastActive.toMillis() : new Date(lastActive).getTime();
          const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
          if (lastActiveTime < thirtyMinsAgo) continue;
        }
        
        // Lifestyle and secondary filters
        if (filters.hasChildren !== 'indifferent' && data.hasChildren !== filters.hasChildren) continue;
        if (filters.smokes !== 'indifferent' && data.smokes !== filters.smokes) continue;
        if (filters.drinks !== 'indifferent' && data.drinks !== filters.drinks) continue;
        
        if (filters.relationshipGoal && filters.relationshipGoal.length > 0 && data.relationshipGoal) {
          if (!filters.relationshipGoal.includes(data.relationshipGoal)) continue;
        }

        if (filters.religion && filters.religion.length > 0 && data.religion) {
          if (!filters.religion.includes(data.religion)) continue;
        }

        if (filters.exercise && filters.exercise.length > 0 && data.exercise) {
          if (!filters.exercise.includes(data.exercise)) continue;
        }

        if (filters.education && filters.education.length > 0 && data.education) {
          if (!filters.education.includes(data.education)) continue;
        }
        
        if (filters.languages && filters.languages.length > 0 && data.languages) {
          const hasCommonLang = data.languages.some(l => filters.languages.includes(l));
          if (!hasCommonLang) continue;
        }

        if (filters.zodiacs && filters.zodiacs.length > 0 && data.zodiac) {
          if (!filters.zodiacs.includes(data.zodiac.toLowerCase())) continue;
        }

        if (filters.personalities && filters.personalities.length > 0 && data.personalityType) {
          if (!filters.personalities.includes(data.personalityType)) continue;
        }

        if (filters.heightFilterActive && data.height) {
          if (data.height < filters.heightMin || data.height > filters.heightMax) continue;
        }

        if (filters.goldOnly && data.subscription !== 'gold' && data.subscription !== 'elite') continue;

        const extractCoords = (loc: any) => {
          if (!loc) return null;
          const lat = typeof loc.latitude === 'number' ? loc.latitude : loc._lat;
          const lng = typeof loc.longitude === 'number' ? loc.longitude : loc._long;
          if (typeof lat !== 'number' || typeof lng !== 'number') return null;
          return { latitude: lat, longitude: lng };
        };

        const myCoords = extractCoords(user?.location);
        const theirCoords = extractCoords(data.location);

        if (!myCoords || !theirCoords) continue;

        const dist = calculateDistance(
          myCoords.latitude, myCoords.longitude,
          theirCoords.latitude, theirCoords.longitude,
          filters.distanceUnit || 'km'
        );

        let isInternational = false;
        if (isMundiActive) {
          if (dist < 1000 || (data.subscription !== 'gold' && data.subscription !== 'elite')) continue;
          isInternational = true;
        } else {
          if (dist > (filters.distanceMax || 500)) continue;
        }

        fetched.push({
          uid: profileId,
          name: data.name || 'Usuario',
          age: data.age || 20,
          distance: dist,
          distanceUnit: filters.distanceUnit || 'km',
          photos: data.photos && Array.isArray(data.photos) && data.photos.length > 0 
            ? data.photos.map(p => getOptimizedUrl(p)) 
            : [getOptimizedUrl('')],
          bio: data.bio || '',
          interests: data.interests || [],
          verified: data.verified || false,
          gender: data.gender || 'other',
          isInternational,
          subscription: data.subscription || 'free',
          boostUntil: data.boostUntil,
          updatedAt: (data as any).updatedAt || (data as any).lastActive,
          // Extra field for double date filtering
          doubleDate: data.doubleDate
        });
      }
      const currentDoubleMode = filters.isDoubleMode || false;
      
      // --- UNIFIED FEED GENERATION ---
      const teamFetched: Team[] = [];
      const processedPairs = new Set<string>();

      try {
        // Always fetch teams to include them in the feed
        const doubleQ = query(
          collection(db, 'profiles'),
          orderBy('subscription', 'desc'),
          limit(300)
        );
        const doubleSnap = await getDocs(doubleQ);
        const allDoubleProfiles = new Map<string, any>();
        doubleSnap.docs.forEach(d => allDoubleProfiles.set(d.id, { uid: d.id, ...d.data() }));

        // Pre-fetch all missing partner profiles in one batch
        const missingPartnerIds = Array.from(allDoubleProfiles.entries())
          .filter(([uid, data]: [string, any]) => data.doubleDate?.status === 'linked' && !allDoubleProfiles.has(data.doubleDate?.partnerId))
          .map(([uid, data]: [string, any]) => data.doubleDate.partnerId);


        if (missingPartnerIds.length > 0) {
          console.log(`[DoubleDate] Fetching ${missingPartnerIds.length} missing partners in batch...`);
          // Firestore 'in' query supports up to 30 IDs per batch
          const batches = [];
          for (let i = 0; i < missingPartnerIds.length; i += 30) {
            const batch = missingPartnerIds.slice(i, i + 30);
            batches.push(getDocs(query(collection(db, 'profiles'), where('__name__', 'in', batch))));
          }
          const batchSnaps = await Promise.all(batches);
          batchSnaps.forEach(snap => {
            snap.forEach(d => allDoubleProfiles.set(d.id, { uid: d.id, ...d.data() }));
          });
        }

        for (const [uid, data] of allDoubleProfiles.entries()) {
          if (uid === user?.uid || uid === user?.doubleDate?.partnerId) continue;
          if (data.doubleDate?.status !== 'linked') continue;
          
          const partnerId = data.doubleDate?.partnerId;
          const pairId = [uid, partnerId].sort().join('_');
          if (processedPairs.has(pairId)) continue;

          // Team-specific interaction check
          if (interactedIds.has(pairId)) continue;

          let partnerData = allDoubleProfiles.get(partnerId);
          if (!partnerData) continue;


          // Visibility check
          if (!(data.doubleDate?.modeActive || partnerData.doubleDate?.modeActive)) continue;

          // Team Filter (Genders/Age)
          const age1 = data.age || 20;
          const age2 = partnerData.age || 20;
          if (age1 < filters.ageMin || age1 > filters.ageMax || age2 < filters.ageMin || age2 > filters.ageMax) continue;

          // Distance
          let dist = 999;
          if (user?.location && data.location) {
            const lat1 = user.location.latitude || user.location._lat;
            const lng1 = user.location.longitude || user.location._long;
            const lat2 = data.location.latitude || data.location._lat;
            const lng2 = data.location.longitude || data.location._long;
            if (lat1 && lng1 && lat2 && lng2) {
              dist = Math.round(calculateDistance(lat1, lng1, lat2, lng2, filters.distanceUnit || 'km'));
            }
          }
          if (dist > (filters.distanceMax || 500) && !isMundiActive) continue;

          const teamItem: Team = {
            id: pairId,
            user1: { uid, ...data, photos: data.photos || [] },
            user2: { uid: partnerId, ...partnerData, photos: partnerData.photos || [] },
            distance: dist,
            distanceUnit: filters.distanceUnit || 'km'
          };
          teamFetched.push(teamItem);
          processedPairs.add(pairId);
        }
      } catch (err) {
        console.warn('[DoubleDate] Team fetch error:', err);
      }

      // Combine and Sort
      // Priority: Boosted > Subscription (Platinum > Gold > Free)
      const finalFeed: DiscoveryItem[] = [];
      
      const now = Date.now();
      const isBoosted = (item: DiscoveryItem) => {
        const boostUntil = item.type === 'single' ? item.profile?.boostUntil : (item.team?.user1.boostUntil || item.team?.user2.boostUntil);
        if (!boostUntil) return false;
        const time = boostUntil.toMillis ? boostUntil.toMillis() : new Date(boostUntil).getTime();
        return time > now;
      };

      // Add Singles
      fetched.forEach(p => finalFeed.push({ id: p.uid, type: 'single', profile: p }));
      
      // Add Teams
      teamFetched.forEach(t => finalFeed.push({ id: t.id, type: 'team', team: t }));

      // Sort by Boost status then by subscription
      finalFeed.sort((a, b) => {
        const aBoost = isBoosted(a);
        const bBoost = isBoosted(b);
        if (aBoost && !bBoost) return -1;
        if (!aBoost && bBoost) return 1;
        
        // Secondary sort by subscription
        const subRank = { 'elite': 3, 'gold': 2, 'free': 1 } as any;
        const aSub = a.type === 'single' ? a.profile?.subscription : 'free';
        const bSub = b.type === 'single' ? b.profile?.subscription : 'free';
        return (subRank[bSub || 'free'] || 0) - (subRank[aSub || 'free'] || 0);
      });


      // Interleave Logic: 
      // Ratio Normal: 4 singles, 1 team
      // Ratio Double: 3 teams, 1 single
      const singles = finalFeed.filter(f => f.type === 'single');
      const teams = finalFeed.filter(f => f.type === 'team');
      const interleaved: DiscoveryItem[] = [];
      
      if (currentDoubleMode) {
        // Double Mode: Prioritize teams
        let singleIdx = 0;
        let teamIdx = 0;
        while (teamIdx < teams.length || singleIdx < singles.length) {
          // Add up to 3 teams
          for (let i = 0; i < 3 && teamIdx < teams.length; i++) {
            interleaved.push(teams[teamIdx++]);
          }
          // Add 1 single
          if (singleIdx < singles.length) {
            interleaved.push(singles[singleIdx++]);
          }
        }
      } else {
        // Normal Mode: Prioritize singles
        let singleIdx = 0;
        let teamIdx = 0;
        while (singleIdx < singles.length || teamIdx < teams.length) {
          // Add up to 4 singles
          for (let i = 0; i < 4 && singleIdx < singles.length; i++) {
            interleaved.push(singles[singleIdx++]);
          }
          // Add 1 team
          if (teamIdx < teams.length) {
            interleaved.push(teams[teamIdx++]);
          }
        }
      }

      console.log('[Discovery] Feed interleaved. Total items:', interleaved.length);
      
      // Preload photos for the first few items to make them "instant"
      interleaved.slice(0, 5).forEach(item => {
        if (item.type === 'single' && item.profile?.photos) {
          item.profile.photos.forEach(photo => Image.prefetch(photo));
        } else if (item.type === 'team' && item.team) {
          item.team.user1.photos?.forEach(photo => Image.prefetch(photo));
          item.team.user2.photos?.forEach(photo => Image.prefetch(photo));
        }
      });

      setDiscoveryFeed(interleaved);
    } catch (e: any) {
      console.warn('Error cargando perfiles:', e);
    } finally {
      setLoading(false);
    }
  }, [user, isMundiActive, isDoubleMode]);

  const resetProfiles = useCallback(() => {
    loadRealUsers();
  }, [loadRealUsers]);

  useFocusEffect(
    useCallback(() => {
      // Solo recargar si el feed está vacío o si necesitamos forzar una actualización
      if (discoveryFeed.length === 0) {
        cachedInteractedIds.current = null;
        loadRealUsers();
      }
    }, [loadRealUsers, discoveryFeed.length])
  );


  const lastSwipedProfileRef = useRef<Profile | null>(null);

  const _doSwipeLeft = useCallback(async () => {
    if (discoveryFeed.length === 0) return;
    const item = discoveryFeed[0];
    const isMeTeam = isDoubleMode && user?.doubleDate?.status === 'linked';
    const fromId = isMeTeam ? [user!.uid, user?.doubleDate?.partnerId].sort().join('_') : user!.uid;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (item.type === 'single' && item.profile) {
        lastSwipedProfileRef.current = item.profile;
        if (cachedInteractedIds.current instanceof Set) cachedInteractedIds.current.add(item.profile.uid);
        
        const swipeDocId = isMeTeam ? `${fromId}___${item.profile.uid}` : `${fromId}_${item.profile.uid}`;
        await setDoc(doc(db, 'swipes', swipeDocId), {
          from: fromId,
          to: item.profile.uid,
          type: 'dislike',
          isTeamSwipe: isMeTeam,
          timestamp: serverTimestamp()
        });
      } else if (item.type === 'team' && item.team) {
        if (cachedInteractedIds.current instanceof Set) cachedInteractedIds.current.add(item.team.id);
        
        const swipeDocId = `${fromId}___${item.team.id}`;
        const collectionName = isMeTeam ? 'double_swipes' : 'swipes';
        await setDoc(doc(db, collectionName, swipeDocId), {
          from: fromId,
          to: item.team.id,
          type: 'dislike',
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Error en Dislike:", e);
    }
    setDiscoveryFeed(prev => prev.slice(1));
  }, [discoveryFeed, user, isDoubleMode]);

  const handleRewind = useCallback(async () => {
    if (!lastSwipedProfileRef.current) {
       Alert.alert(t('discover.rewind.no_profiles_title'), t('discover.rewind.no_profiles_desc'));
       return;
    }

    if (!limits.rewind) {
       router.push('/paywall' as any);
       return;
    }

    const profileToRestore = lastSwipedProfileRef.current;
    
    try {
      // Remove from passes if it was a dislike
      const passRef = doc(db, 'profiles', user!.uid, 'passes', profileToRestore.uid);
      const passSnap = await getDoc(passRef);
      if (passSnap.exists()) {
        const { deleteDoc } = require('firebase/firestore');
        await deleteDoc(passRef);
      }
      // Limpiar de cache local para que pueda aparecer de nuevo si se recarga
      if (cachedInteractedIds.current) {
        cachedInteractedIds.current.delete(profileToRestore.uid);
      }
      
      setDiscoveryFeed(prev => [{ id: profileToRestore.uid, type: 'single', profile: profileToRestore }, ...prev]);
      lastSwipedProfileRef.current = null;
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.error("Error rewinding:", e);
    }
  }, [user]);

  const handleSwipeLeft = useCallback(() => {
    withSwipeAd(_doSwipeLeft);
  }, [withSwipeAd, _doSwipeLeft]);

  const _doSwipeRight = useCallback(async () => {
    if (discoveryFeed.length === 0) return;
    const item = discoveryFeed[0];
    const isMeTeam = isDoubleMode && user?.doubleDate?.status === 'linked';

    try {
      if (item.type === 'single' && item.profile) {
        const profile = item.profile;
        lastSwipedProfileRef.current = profile;
        if (cachedInteractedIds.current instanceof Set) cachedInteractedIds.current.add(profile.uid);

        const fromId = isMeTeam ? [user!.uid, user?.doubleDate?.partnerId].sort().join('_') : user!.uid;
        const swipeDocId = isMeTeam ? `${fromId}___${profile.uid}` : `${fromId}_${profile.uid}`;

        await setDoc(doc(db, 'swipes', swipeDocId), {
          from: fromId,
          to: profile.uid,
          type: 'like',
          isTeamSwipe: isMeTeam,
          timestamp: serverTimestamp()
        });

        // Check Match
        const reverseDocId = isMeTeam ? `${profile.uid}___${fromId}` : `${profile.uid}_${fromId}`;
        const reverseDoc = await getDoc(doc(db, 'swipes', reverseDocId));
        if (reverseDoc.exists() && reverseDoc.data()?.type === 'like') {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const matchId = isMeTeam ? `group_${[fromId, profile.uid].sort().join('_')}` : [fromId, profile.uid].sort().join('_');
          await setDoc(doc(db, 'matches', matchId), {
            participants: [user!.uid, user?.doubleDate?.partnerId, profile.uid].filter(Boolean),
            isDoubleDate: isMeTeam,
            timestamp: serverTimestamp(),
            lastMessage: isMeTeam ? t('discover.match.match_with_name', { name: profile.name }) : t('discover.match.its_a_match'),
            lastMessageTime: serverTimestamp(),
            messageCount: 0
          });
          setMatchProfile(profile);
        }
      } else if (item.type === 'team' && item.team) {
        const team = item.team;
        if (cachedInteractedIds.current instanceof Set) cachedInteractedIds.current.add(team.id);
        const fromId = isMeTeam ? [user!.uid, user?.doubleDate?.partnerId].sort().join('_') : user!.uid;
        const targetTeamId = team.id;
        
        const swipeDocId = `${fromId}___${targetTeamId}`;
        const collectionName = (isMeTeam) ? 'double_swipes' : 'swipes';
        await setDoc(doc(db, collectionName, swipeDocId), {
          from: fromId,
          fromTeam: isMeTeam ? [user!.uid, user?.doubleDate?.partnerId] : [user!.uid],
          to: targetTeamId,
          toTeam: [team.user1.uid, team.user2.uid],
          type: 'like',
          timestamp: serverTimestamp()
        });

        // Check Match
        const reverseDocId = `${targetTeamId}___${fromId}`;
        const reverseDoc = await getDoc(doc(db, isMeTeam ? 'double_swipes' : 'swipes', reverseDocId));
        if (reverseDoc.exists() && reverseDoc.data()?.type === 'like') {
          const matchId = `group_${[fromId, targetTeamId].sort().join('_')}`;
          await setDoc(doc(db, 'matches', matchId), {
            participants: [user!.uid, user?.doubleDate?.partnerId, team.user1.uid, team.user2.uid].filter(Boolean),
            isDoubleDate: true,
            timestamp: serverTimestamp(),
            lastMessage: isMeTeam ? t('discover.match.double_match') : t('discover.match.match_with_team', { name1: team.user1.name, name2: team.user2.name }),
            lastMessageTime: serverTimestamp(),
            messageCount: 0
          });
          setMatchProfile({ name: `${team.user1.name} y ${team.user2.name}`, photos: [team.user1.photos[0]], isDouble: true });
        }
      }
    } catch (e) {
      console.error("Error en Like:", e);
    }
    setDiscoveryFeed(prev => prev.slice(1));
  }, [discoveryFeed, user, isDoubleMode]);

  const handleSwipeRight = useCallback(() => {
    withSwipeAd(_doSwipeRight);
  }, [withSwipeAd, _doSwipeRight]);

  const _doSwipeUp = useCallback(async () => {
    if (discoveryFeed.length === 0) return;
    const item = discoveryFeed[0];
    if (item.type !== 'single' || !item.profile) return;
    const profile = item.profile;

    try {
      // 1. Consume Super Like from inventory
      const consumed = await consumeSuperLike();
      if (!consumed) {
        // If out of superlikes, snap back or show store
        router.push('/store' as any);
        return;
      }

      // Actualizar cache local inmediatamente
      if (cachedInteractedIds.current) {
        cachedInteractedIds.current.add(profile.uid);
      }
      
      // 2. Save superlike in collection top-level "swipes"
      const swipeDocId = `${user!.uid}_${profile.uid}`;
      await setDoc(doc(db, 'swipes', swipeDocId), {
        from: user!.uid,
        to: profile.uid,
        type: 'like',
        super: true,
        timestamp: serverTimestamp()
      });

      // 3. Trigger immediate notification for the other person
      // This will appear in their Activity / Likes section revealed
      if (profile.pushToken) {
        // Enviar push real (opcional si tenemos backend, pero aquí simulamos local o vía service)
      }

      // Verificar match mutuo
      const reverseDocId = `${profile.uid}_${user!.uid}`;
      const reverseDoc = await getDoc(doc(db, 'swipes', reverseDocId));
      const isMatch = reverseDoc.exists() && reverseDoc.data()?.type === 'like';

      if (isMatch) {
        if (Platform.OS !== 'web') {
           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
           setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
           setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
        }
        const matchId = [user!.uid, profile.uid].sort().join('_');
        await setDoc(doc(db, 'matches', matchId), {
          participants: [user!.uid, profile.uid],
          timestamp: serverTimestamp(),
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          isSuperLike: true,
          isInternational: profile.isInternational || false
        });
        setMatchProfile(profile);
      }
    } catch (e: any) {
      console.error("Error en Super Like:", e);
    }
    setDiscoveryFeed(prev => prev.slice(1));
  }, [discoveryFeed, user, consumeSuperLike]);

  const handleSwipeUp = useCallback(() => {
    withSwipeAd(_doSwipeUp);
  }, [withSwipeAd, _doSwipeUp]);





  return (
    <ScreenContainer edges={["top", "left", "right"]} className="p-0">
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo_aura.png')}
            style={styles.headerLogoImage}
            contentFit="contain"
          />
          <Text style={styles.headerLogo}>Aura</Text>
          <Ionicons name="sparkles" size={16} color="#FFD700" style={{ marginLeft: -2, marginTop: -8 }} />
        </View>
        <View style={styles.headerActions}>
          <Pressable 
            style={[styles.mundiToggle, isMundiActive && styles.mundiToggleActive]} 
            onPress={async () => {
              const hasMundiAccess = user?.subscription === 'gold' || user?.subscription === 'elite';
              if (hasMundiAccess) {
                setIsMundiActive(!isMundiActive);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } else {
                router.push('/paywall' as any);
              }
            }}
          >
            <Text style={styles.mundiIcon}>🌍</Text>
            <Text style={[styles.mundiText, isMundiActive && styles.mundiTextActive]}>
              {isMundiActive ? 'MUNDI ON' : 'Mundi'}
            </Text>
            {(user?.subscription !== 'gold' && user?.subscription !== 'elite') && (
              <Text style={{ fontSize: 10 }}>🔒</Text>
            )}
          </Pressable>

          <Pressable style={styles.headerBtn} onPress={() => router.push('/boost' as any)}>
            <Text style={styles.headerBtnIcon}>⚡</Text>
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/filters' as any)}>
            <Text style={styles.headerBtnIcon}>🔧</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Active Broadcast Banner */}
      {activeBroadcast && (
        <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 16, zIndex: 100 }}>
          <BlurView 
            intensity={80} 
            tint={activeBroadcast.type === 'promo' ? 'light' : 'dark'}
            style={{ 
              flexDirection: 'row', 
              padding: 12, 
              borderRadius: 20, 
              alignItems: 'center', 
              gap: 12, 
              borderWidth: 1, 
              borderColor: activeBroadcast.type === 'promo' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              marginBottom: 8
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 18, 
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 18 }}>
                 {activeBroadcast.type === 'promo' ? '🎁' : activeBroadcast.type === 'alert' ? '⚠️' : '📢'}
              </Text>
            </View>

            <View style={{flex: 1}}>
              <Text style={{ color: activeBroadcast.type === 'promo' ? '#000' : '#FFF', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                {activeBroadcast.title}
              </Text>
              <Text style={{ color: activeBroadcast.type === 'promo' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', fontSize: 12 }} numberOfLines={1}>
                {activeBroadcast.message}
              </Text>
            </View>

            <Pressable onPress={handleDismissBroadcast} style={{ padding: 4 }}>
               <Ionicons name="close" size={16} color={activeBroadcast.type === 'promo' ? "#000" : "#FFF"} />
            </Pressable>
          </BlurView>
        </Animated.View>
      )}

      {/* Cards stack */}
      <View style={styles.cardsContainer}>
        {discoveryFeed.length === 0 ? (

          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>{t('discover.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>
              {loading ? t('discover.searching') : t('discover.empty.subtitle')}
            </Text>
            {!loading && (
              <Pressable style={styles.refreshButton} onPress={resetProfiles}>
                <Text style={styles.refreshText}>{t('discover.empty.refresh_btn')}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {discoveryFeed.slice(0, 2).map((item, index) => (
              item.type === 'team' && item.team ? (
                <DoubleProfileCard
                  key={item.id}
                  team={item.team}
                  isTop={index === 0}
                  onSwipeLeft={() => handleSwipeLeft()}
                  onSwipeRight={() => handleSwipeRight()}
                  onSwipeUp={() => handleSwipeUp()}
                  onOpenDetail={() => {
                    router.push({
                      pathname: `/profile/team/${item.id}`,
                      params: { u1: item.team?.user1.uid, u2: item.team?.user2.uid }
                    } as any);
                  }}
                />
              ) : item.profile ? (
                <ProfileCard
                  key={item.id}
                  profile={item.profile}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onSwipeUp={handleSwipeUp}
                  isTop={index === 0}
                  onOpenDetail={(p) => {
                    setSelectedProfile(p);
                    setIsDetailOpen(true);
                  }}
                  canSuperLike={canSuperLike}
                />
              ) : null
            )).reverse()}
          </>
        )}
      </View>

      <FullProfileDetail
        profile={selectedProfile}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onLike={handleSwipeRight}
        onDislike={handleSwipeLeft}
        onSuperLike={handleSwipeUp}
      />

      {/* Action buttons */}
      {(discoveryFeed.length > 0) && (
        <View style={styles.actionButtons}>
          {!isDoubleMode && (
            <Pressable 
              style={[styles.actionBtn, styles.actionBtnSmall]} 
              onPress={handleRewind}
            >
              <Text style={styles.actionBtnIcon}>↩</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, styles.actionBtnLarge, styles.actionBtnDislike]}
            onPress={handleSwipeLeft}
          >
            <Text style={styles.actionBtnIcon}>✕</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSmall, styles.actionBtnSuperlike]}
            onPress={handleSwipeUp}
          >
            <Text style={styles.actionBtnIcon}>★</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnLarge, styles.actionBtnLike]}
            onPress={handleSwipeRight}
          >
            <Text style={styles.actionBtnIcon}>♥</Text>
          </Pressable>
          {!isDoubleMode && (
            <Pressable 
              style={[
                styles.actionBtn, 
                styles.actionBtnSmall, 
                boostTimeLeft ? styles.actionBtnBoostActive : styles.actionBtnBoost
              ]} 
              onPress={handleActivateBoost}
            >
              {boostTimeLeft ? (
                <View style={styles.boostTimerContainer}>
                  <Text style={styles.boostTimerIcon}>⚡</Text>
                  <Text style={styles.boostTimerText}>{boostTimeLeft}</Text>
                </View>
              ) : (
                <Text style={styles.actionBtnIcon}>⚡</Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Match overlay */}
      {matchProfile && (
        <View style={[styles.matchOverlay, { zIndex: 9999, elevation: 9999 }]}>
          <LinearGradient
            colors={['rgba(10,10,10,0.98)', 'rgba(30,10,24,0.95)', 'rgba(10,10,10,0.98)']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <Animated.View entering={ZoomIn.duration(600).springify().damping(12)} style={styles.matchContent}>
            <Animated.Text entering={FadeInDown.delay(300).duration(800)} style={styles.matchTitle}>
             {t('discover.match.title')}
            </Animated.Text>
            
            <Animated.Text entering={FadeInDown.delay(500).duration(800)} style={styles.matchSubtitle}>
              {t('discover.match.subtitle', { name: matchProfile.name })}
            </Animated.Text>

            <View style={styles.matchPhotosContainer}>
               <Animated.View entering={FadeInLeft.delay(800).duration(600)} style={[styles.matchPhotoBorder, styles.matchPhotoLeft]}>
                  <Image source={{ uri: user?.photos[0] || 'https://via.placeholder.com/150' }} style={styles.matchPhotoFull} contentFit="cover" />
               </Animated.View>
               <Animated.View entering={FadeInRight.delay(800).duration(600)} style={[styles.matchPhotoBorder, styles.matchPhotoRight]}>
                  <Image source={{ uri: matchProfile.photos[0] }} style={styles.matchPhotoFull} contentFit="cover" />
               </Animated.View>
               <Animated.View entering={ZoomIn.delay(1200).duration(400)} style={[styles.matchHeartBadge, matchHeartStyle]}>
                  <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.matchHeartGradient}>
                     <Ionicons name="heart" size={32} color="#FFF" />
                  </LinearGradient>
               </Animated.View>
            </View>

            <Animated.View entering={FadeInDown.delay(1400)} style={{ width: '100%', gap: 16, marginTop: 40 }}>
              <Pressable
                style={styles.matchMessageBtn}
                onPress={() => {
                  const chatId = [user!.uid, matchProfile.uid].sort().join('_');
                  setMatchProfile(null);
                  router.push(`/chat/${chatId}` as any);
                }}
              >
                <LinearGradient colors={['#FF2D78', '#FF6B35'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.matchMessageGradient}>
                  <Text style={styles.matchMessageText}>{t('discover.match.send_message')}</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.matchContinueBtn} onPress={() => setMatchProfile(null)}>
                <Text style={styles.matchContinueText}>{t('discover.match.continue')}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      )}



    </ScreenContainer>
  );
}


const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mundiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
    marginRight: 4,
  },
  mundiToggleActive: {
    backgroundColor: '#0A1A2B',
    borderColor: '#4FC3F7',
  },
  mundiIcon: {
    fontSize: 16,
  },
  mundiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  mundiTextActive: {
    color: '#4FC3F7',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerBtnIcon: {
    fontSize: 18,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginVertical: 2,
  },


  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'absolute',
    backgroundColor: '#161616',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(0,0,0,0.4)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      }
    }),
  },
  cardBehind: {
    transform: [{ scale: 0.95 }, { translateY: 16 }],
    opacity: 0.8,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoDots: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 5,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
    width: 20,
    borderRadius: 3,
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '40%',
    height: '70%',
    zIndex: 4,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '60%',
    height: '70%',
    zIndex: 4,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 6,
  },
  glassInfo: {
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  miniInterests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  miniInterestChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniInterestText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  moreHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginLeft: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  distanceRow: {
    marginTop: 4,
  },
  distanceText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  expandHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  expandedContent: {
    marginTop: 12,
    gap: 10,
  },
  bioText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  overlayBadge: {
    position: 'absolute',
    padding: 8,
  },
  overlayLeft: {
    top: 60,
    left: 20,
    transform: [{ rotate: '15deg' }],
  },
  overlayRight: {
    top: 60,
    right: 20,
    transform: [{ rotate: '-15deg' }],
  },
  overlayTop: {
    top: 60,
    alignSelf: 'center',
  },
  overlayText: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    paddingTop: 4,
    gap: 14,
  },
  actionBtn: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }
    }),
  },
  actionBtnSmall: {
    width: 52,
    height: 52,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  actionBtnLarge: {
    width: 68,
    height: 68,
  },
  actionBtnDislike: {
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    borderWidth: 1.5,
    borderColor: '#FF2D78',
  },
  actionBtnLike: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  actionBtnSuperlike: {
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    borderWidth: 1.5,
    borderColor: '#4FC3F7',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnBoost: {
    backgroundColor: '#1E0A2E',
    borderWidth: 1,
    borderColor: '#8A2BE2',
  },
  actionBtnBoostActive: {
    backgroundColor: '#8A2BE2',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  boostTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostTimerIcon: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  boostTimerText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '800',
  },
  actionBtnIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 16,
    backgroundColor: '#161616',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  matchContent: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  matchTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 45, 120, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  matchSubtitle: {
    fontSize: 18,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  matchPhotosContainer: {
    flexDirection: 'row',
    height: 180,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  matchPhotoBorder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#FFF',
    overflow: 'hidden',
    position: 'absolute',
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0,0,0,0.5)' },
      default: { elevation: 20, shadowColor: '#000', shadowRadius: 10, shadowOpacity: 0.5 }
    })
  },
  matchPhotoLeft: {
    left: '18%',
    zIndex: 1,
    transform: [{ rotate: '-10deg' }],
  },
  matchPhotoRight: {
    right: '18%',
    zIndex: 2,
    transform: [{ rotate: '10deg' }],
  },
  matchPhotoFull: {
    width: '100%',
    height: '100%',
  },
  matchHeartBadge: {
    position: 'absolute',
    bottom: -15,
    zIndex: 10,
  },
  matchHeartGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#0A0A0A',
  },
  matchMessageBtn: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    height: 64,
  },
  matchMessageGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchMessageText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchContinueBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  matchContinueText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  // Premium Detail Styles
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  detailGallery: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.55,
    position: 'relative',
  },
  detailMainPhoto: {
    width: '100%',
    height: '100%',
  },
  closeDetailBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detailTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '40%',
    height: '100%',
    zIndex: 5,
  },
  detailTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '60%',
    height: '100%',
    zIndex: 5,
  },
  detailPhotoDots: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 80,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  detailPhotoDot: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  detailPhotoDotActive: {
    backgroundColor: '#FFF',
  },
  detailBody: {
    padding: 20,
    marginTop: -30,
    backgroundColor: '#000',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  detailName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  detailStatus: {
    fontSize: 14,
    color: '#FF2D78',
    fontWeight: '600',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailBio: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '45%',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  lifestyleLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
  },
  lifestyleValue: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  detailInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailInterestChip: {
    backgroundColor: 'rgba(255,45,120,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailInterestText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailActionsBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  detailActionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailActionDislike: { borderColor: 'rgba(255,45,120,0.3)' },
  detailActionLike: { borderColor: 'rgba(76,175,80,0.3)' },
  detailActionSuper: { borderColor: 'rgba(79,195,247,0.3)' },
  promptCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  promptQuestion: {
    fontSize: 14,
    color: '#FF2D78',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptAnswer: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '800',
    lineHeight: 26,
  },
});
