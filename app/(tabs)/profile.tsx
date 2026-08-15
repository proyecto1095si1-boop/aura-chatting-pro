import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';

import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getCountFromServer, doc, getDoc, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { uploadToFirebaseStorage, deleteFromFirebaseStorage } from '@/lib/storage-service';
import { getSafeSource } from '@/lib/image-utils';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { plan, limits, likesRemaining } = useSubscription();
  const [uploading, setUploading] = useState<number | null>(null);
  const [partner, setPartner] = useState<any>(null);

  // Fetch partner if linked
  React.useEffect(() => {
    if (user?.doubleDate?.partnerId && user?.doubleDate?.status === 'linked') {
      const fetchPartner = async () => {
        try {
          const pDoc = await getDoc(doc(db, 'profiles', user.doubleDate!.partnerId!));
          if (pDoc.exists()) {
            setPartner({ uid: pDoc.id, ...pDoc.data() });
          }
        } catch (e) {
          console.error("Error fetching partner in profile:", e);
        }
      };
      fetchPartner();
    } else {
      setPartner(null);
    }
  }, [user?.doubleDate?.partnerId, user?.doubleDate?.status]);

  const displayName = user?.name || t('profile.title');
  const displayAge = user?.age || '';
  const photos = user?.photos?.length ? user.photos : [];
  const interests = user?.interests?.length ? user.interests : [];
  const bio = user?.bio || t('profile.bio_placeholder');




  // Diagnostic Log
  React.useEffect(() => {
    if (user) {
      console.log("[Profile] Current User UID:", user.uid);
      console.log("[Profile] Current Photos Array:", user.photos);
    }
  }, [user]);

  // Real Stats logic
  const [stats, setStats] = useState({ likes: 0, matches: 0, superlikes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  // Listen for incoming invites in background
  React.useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'double_date_invites'),
      where('to', '==', user.uid),
      where('status', '==', 'pending'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasPendingInvite(!snap.empty);
    });
    return () => unsub();
  }, [user?.uid]);

  const fetchStats = React.useCallback(async () => {
    if (!user?.uid) return;
    try {
      // 1. Count Likes Received (where type is like and super is NOT true)
      const likesQuery = query(
        collection(db, 'swipes'), 
        where('to', '==', user.uid), 
        where('type', '==', 'like')
      );
      
      // 2. Count Matches
      const matchesQuery = query(
        collection(db, 'matches'), 
        where('participants', 'array-contains', user.uid)
      );

      // Fetch counts in parallel
      const [likesSnap, matchesSnap] = await Promise.all([
        getCountFromServer(likesQuery),
        getCountFromServer(matchesQuery)
      ]);

      const totalLikes = likesSnap.data().count;
      
      // For Super Likes, we need a separate query if we want to distinguish them
      const superLikesQuery = query(
        collection(db, 'swipes'), 
        where('to', '==', user.uid), 
        where('type', '==', 'like'),
        where('super', '==', true)
      );
      const superSnap = await getCountFromServer(superLikesQuery);
      const superCount = superSnap.data().count;

      setStats({
        likes: totalLikes - superCount, // Normal likes
        matches: matchesSnap.data().count,
        superlikes: superCount
      });
    } catch (error) {
      console.error("[Profile] Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handlePickPhoto = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        setUploading(index);
        const fileName = `profile_photo_${index}_${Date.now()}.jpg`;
        const publicUrl = await uploadToFirebaseStorage(user.uid, result.assets[0].uri, fileName);
        
        const newPhotos = [...photos];
        // Ensure array is long enough
        while (newPhotos.length <= index) {
          newPhotos.push('');
        }
        newPhotos[index] = publicUrl;
        
        console.log("[Profile] Saving new photos array:", newPhotos.filter(p => !!p));
        // Use the optimistic update from AuthContext
        await updateProfile({ photos: newPhotos.filter(p => !!p) });
      }
    } catch (error) {
      console.error("Error picking profile photo:", error);
      if (Platform.OS === 'web') {
        window.alert(t('common.error'));
      } else {
        Alert.alert(t('common.error'));
      }
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (index: number) => {
    if (!user || !photos[index]) return;

    if (photos.filter(p => !!p).length <= 1) {
      Alert.alert(t('common.error'), "Debes tener al menos una foto de perfil.");
      return;
    }

    if (Platform.OS === 'web') {
      const confirm = window.confirm("¿Borrar foto? Esta acción eliminará la foto permanentemente de tu perfil.");
      if (!confirm) return;
      await performDelete(index);
    } else {
      Alert.alert(
        "¿Borrar foto?",
        "Esta acción eliminará la foto permanentemente de tu perfil.",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Eliminar", 
            style: "destructive",
            onPress: () => performDelete(index)
          }
        ]
      );
    }
  };

  const performDelete = async (index: number) => {
    try {
      setUploading(index);
      const urlToRemove = photos[index];
      
      // 1. Remove from Storage
      await deleteFromFirebaseStorage(urlToRemove);

      // 2. Update Firestore (filter out the specific URL)
      const newPhotos = photos.filter((_, i) => i !== index);
      await updateProfile({ photos: newPhotos });
      
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error deleting photo:", error);
      Alert.alert("Error", "No se pudo eliminar la foto.");
    } finally {
      setUploading(null);
    }
  };

  const planColors: Record<string, string> = {
    free: '#8A8A8A',
    gold: '#FFD700',
    elite: '#FF2D78',
  };

  const planNames: Record<string, string> = {
    free: t('profile.plans.free'),
    gold: t('profile.plans.gold'),
    elite: t('profile.plans.elite'),
  };

  if (!user) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#FF2D78" size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable 
              onPress={() => router.push('/settings' as any)}
              style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.profileCard}>
          {/* Main photo with Premium Glassmorphism */}
          <View style={styles.mainPhotoWrapper}>
            <Image
              source={getSafeSource(photos[0])}
              style={styles.mainPhoto}
              contentFit="cover"
              priority="high"
              transition={300}
              placeholder={{ blurhash: 'L6PZf6ayfQay~qj[fQayfQayfQay' }}
              onError={(err) => console.log(`[Profile] Main Photo Load Error URL "${photos[0]}":`, err.error)}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
              style={styles.photoGradient}
            />
            <View style={styles.photoOverlay}>
              <Text style={styles.profileName}>
                {displayName}{displayAge ? `, ${displayAge}` : ''}
              </Text>
              {user?.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ {t('profile.verified')}</Text>
                </View>
              )}
            </View>
            <Pressable 
              onPress={() => photos[0] ? handleDeletePhoto(0) : handlePickPhoto(0)}
              style={styles.editPhotoBtn}
            >
              <Text style={styles.editPhotoIcon}>{uploading === 0 ? '⏳' : photos[0] ? '🗑️' : '✏️'}</Text>
            </Pressable>
          </View>

          {/* Photo grid with staggered fade-in */}
          <View style={styles.photoGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Animated.View 
                key={i} 
                entering={FadeInDown.delay(200 + i * 50).duration(600)}
                style={styles.photoGridItem}
              >
                <Pressable 
                  style={styles.photoGridItemInner}
                  onPress={() => handlePickPhoto(i)}
                  disabled={uploading !== null}
                >
                  {photos[i] ? (
                    <>
                      <Image 
                        source={getSafeSource(photos[i])} 
                        style={styles.gridPhoto} 
                        contentFit="cover" 
                        transition={300}
                        priority="high"
                        placeholder={{ blurhash: 'L6PZf6ayfQay~qj[fQayfQayfQay' }}
                        onError={(err) => console.log(`[Profile] Image Load Error for index ${i}:`, err.error)}
                      />
                      <Pressable
                        onPress={() => handleDeletePhoto(i)}
                        style={styles.gridRemoveBtn}
                      >
                        <Text style={styles.gridRemoveIcon}>×</Text>
                      </Pressable>
                      {uploading === i && (
                         <View style={styles.uploadingOverlay}>
                            <ActivityIndicator color="#FFFFFF" />
                         </View>
                      )}
                    </>
                  ) : (
                    <View style={[styles.emptyGridPhoto, uploading === i && styles.uploadingSlot]}>
                      {uploading === i ? (
                        <ActivityIndicator color="#FF2D78" size="small" />
                      ) : (
                        <>
                          <View style={styles.addIconCircle}>
                            <Text style={styles.addPhotoIcon}>+</Text>
                          </View>
                          <Text style={styles.addPhotoLabel}>Añadir</Text>
                        </>
                      )}
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Subscription status - High-end Glassmorphism */}
        <Animated.View entering={FadeInDown.delay(300).duration(800)}>
          {/* Verification Section */}
          {user?.verificationStatus !== 'verified' && (
            <Pressable 
              style={styles.verificationCard}
              onPress={() => router.push('/verify' as any)}
            >
              <LinearGradient
                colors={['rgba(79, 195, 247, 0.1)', 'rgba(79, 195, 247, 0.05)']}
                style={styles.verificationGradient}
              >
                <View style={styles.verificationIconWrapper}>
                  <Ionicons name="shield-checkmark" size={24} color="#4FC3F7" />
                </View>
                <View style={styles.verificationInfo}>
                  <Text style={styles.verificationTitle}>
                    {user?.verificationStatus === 'pending' ? t('profile.verification.pending_title', 'Verification in progress') : t('profile.verification.verify_title', 'Verify your profile')}
                  </Text>
                  <Text style={styles.verificationDesc}>
                    {user?.verificationStatus === 'pending' 
                      ? t('profile.verification.pending_desc', 'We are reviewing your photo. We will notify you soon.') 
                      : t('profile.verification.verify_desc', 'Get the blue badge and build more trust.')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#4FC3F7" />
              </LinearGradient>
            </Pressable>
          )}

          <Pressable
            style={styles.subscriptionCard}
            onPress={() => router.push('/paywall' as any)}
          >
            <LinearGradient
              colors={plan === 'elite' ? ['#FF2D78', '#FF6B35'] as const : plan === 'gold' ? ['#FFD700', '#FF8C00'] as const : ['#1E1E1E', '#161616'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.subscriptionGradient}
            >
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionPlan}>{planNames[plan]}</Text>
                <Text style={styles.subscriptionLikesLeft}>
                  {likesRemaining === -1 ? t('profile.plans.unlimited') : t('profile.plans.remaining', { count: likesRemaining })}
                </Text>
              </View>
              {plan === 'free' && (
                <View style={styles.upgradeBtn}>
                  <Text style={styles.upgradeBtnText}>{t('profile.plans.upgrade')}</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Consumables Store Banner */}
        <Animated.View entering={FadeInDown.delay(350).duration(800)}>
          <Pressable
            style={styles.storeCard}
            onPress={() => router.push('/store' as any)}
          >
            <LinearGradient
              colors={['#1E1E1E', '#161616'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.storeGradient}
            >
              <View style={styles.storeInfo}>
                <Text style={styles.storeTitle}>{t('profile.store.title', '💎 A la Carte Store')}</Text>
                <Text style={styles.storeSubtitle}>{t('profile.store.subtitle', 'Packs of Boosts and Super Likes')}</Text>
              </View>
              <View style={styles.storeBtn}>
                <Text style={styles.storeBtnText}>{t('profile.store.see_more', 'See More')}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Quick Boost Button */}
        <Animated.View entering={FadeInDown.delay(380).duration(800)}>
          <Pressable
            style={[styles.storeCard, { borderColor: '#FF2D78', marginBottom: 16 }]}
            onPress={() => router.push('/boost' as any)}
          >
            <LinearGradient
              colors={['rgba(255, 45, 120, 0.1)', 'rgba(255, 107, 53, 0.05)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.storeGradient}
            >
              <View style={styles.storeInfo}>
                <Text style={[styles.storeTitle, { color: '#FF2D78' }]}>🚀 {t('boost.title')}</Text>
                <Text style={styles.storeSubtitle}>{t('profile.boost.subtitle', 'Multiply your visibility now')}</Text>
              </View>
              <View style={[styles.storeBtn, { backgroundColor: 'rgba(255, 45, 120, 0.2)' }]}>
                <Text style={[styles.storeBtnText, { color: '#FF2D78' }]}>{t('common.next')}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Double Date Feature Button - Redesigned to be more Premium */}
        <Animated.View entering={FadeInDown.delay(390).duration(800)}>
          <Pressable
            style={[
              styles.premiumActionCard, 
              { borderColor: '#FFD700', marginBottom: 24 },
              user?.doubleDate?.status === 'linked' && { borderColor: '#4FC3F7' },
              hasPendingInvite && { borderColor: '#FF2D78', borderWidth: 2 }
            ]}
            onPress={() => {
              if (limits.doubleDateEnabled) {
                router.push('/double-date/setup' as any);
              } else {
                router.push('/paywall' as any);
              }
            }}
          >
            <LinearGradient
              colors={hasPendingInvite ? ['rgba(255, 45, 120, 0.2)', 'rgba(0,0,0,0.9)'] : user?.doubleDate?.status === 'linked' ? ['rgba(79, 195, 247, 0.15)', 'rgba(0,0,0,0.8)'] : ['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0.8)'] as const}
              style={styles.premiumActionGradient}
            >
              <View style={styles.premiumActionInfo}>
                <View style={[styles.premiumActionIconCircle, hasPendingInvite && { backgroundColor: '#FF2D78' }]}>
                   <Text style={{ fontSize: 24 }}>{hasPendingInvite ? '🔔' : user?.doubleDate?.status === 'linked' ? '🤝' : '👥'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.premiumActionTitle, { color: hasPendingInvite ? '#FF2D78' : user?.doubleDate?.status === 'linked' ? '#4FC3F7' : '#FFD700' }]}>
                    {hasPendingInvite ? t('double_date.invite_title', 'You have an invitation!') : user?.doubleDate?.status === 'linked' ? t('double_date.linked') : t('double_date.title')}
                  </Text>
                  <Text style={styles.premiumActionSubtitle} numberOfLines={1}>
                    {hasPendingInvite 
                      ? t('double_date.invite_subtitle', 'Someone wants to be your dating partner')
                      : user?.doubleDate?.status === 'linked' && partner 
                        ? t('double_date.linked_with', { name: partner.name }) 
                        : t('double_date.setup_subtitle')}
                  </Text>
                </View>
                {hasPendingInvite ? (
                   <View style={styles.notificationDot} />
                ) : user?.doubleDate?.status === 'linked' && partner && (
                   <Image source={getSafeSource(partner.photos?.[0])} style={styles.partnerMiniAvatar} />
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={hasPendingInvite ? '#FF2D78' : user?.doubleDate?.status === 'linked' ? '#4FC3F7' : '#FFD700'} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Stats - Premium Glassmorphism */}
        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.statsRow}>
          {[
            { value: stats.likes.toString(), label: t('profile.stats.likes') },
            { value: stats.matches.toString(), label: t('profile.stats.matches') },
            { value: stats.superlikes.toString(), label: t('profile.stats.superlikes') },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Bio section */}
        <Animated.View entering={FadeInDown.delay(500).duration(800)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Pressable onPress={() => router.push('/edit-profile')}>
              <Text style={styles.editLink}>{t('profile.edit_btn')}</Text>
            </Pressable>
          </View>
          <Text style={styles.bioText}>{bio}</Text>
        </Animated.View>

        {/* Lifestyle Grid Section */}
        <Animated.View entering={FadeInDown.delay(650).duration(800)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.lifestyle_title', 'My Lifestyle')}</Text>
            <Pressable onPress={() => router.push('/edit-profile')}>
              <Text style={styles.editLink}>{t('profile.edit_btn')}</Text>
            </Pressable>
          </View>
          <View style={styles.lifestyleGrid}>
             {!user?.privacy?.hideHeight && user?.height && (
               <View style={styles.lifestyleItem}>
                 <Text style={styles.lifestyleIcon}>📏</Text>
                 <Text style={styles.lifestyleText}>{user.height} cm</Text>
               </View>
             )}
             {!user?.privacy?.hideZodiac && user?.zodiac && (
               <View style={styles.lifestyleItem}>
                 <Text style={styles.lifestyleIcon}>
                   {user.zodiac === 'aries' ? '♈' : user.zodiac === 'taurus' ? '♉' : user.zodiac === 'gemini' ? '♊' : 
                    user.zodiac === 'cancer' ? '♋' : user.zodiac === 'leo' ? '♌' : user.zodiac === 'virgo' ? '♍' : 
                    user.zodiac === 'libra' ? '♎' : user.zodiac === 'scorpio' ? '♏' : user.zodiac === 'sagittarius' ? '♐' : 
                    user.zodiac === 'capricorn' ? '♑' : user.zodiac === 'aquarius' ? '♒' : '♓'}
                 </Text>
                 <Text style={styles.lifestyleText}>{t(`common.lifestyle.zodiac.${user.zodiac}`)}</Text>
               </View>
             )}
             {user?.personalityType && (
               <View style={styles.lifestyleItem}>
                 <Text style={styles.lifestyleIcon}>🧠</Text>
                 <Text style={styles.lifestyleText}>{user.personalityType}</Text>
               </View>
             )}
             {user?.smokes && (
               <View style={styles.lifestyleItem}>
                 <Text style={styles.lifestyleIcon}>🚬</Text>
                 <Text style={styles.lifestyleText}>{t(`common.lifestyle.smoking.${user.smokes}`)}</Text>
               </View>
             )}
             {user?.drinks && (
               <View style={styles.lifestyleItem}>
                 <Text style={styles.lifestyleIcon}>🍹</Text>
                 <Text style={styles.lifestyleText}>{t(`common.lifestyle.drinking.${user.drinks}`)}</Text>
               </View>
             )}
             {user?.hasChildren !== null && (
                <View style={styles.lifestyleItem}>
                  <Text style={styles.lifestyleIcon}>👶</Text>
                  <Text style={styles.lifestyleText}>{user.hasChildren ? t('common.lifestyle.kids.yes') : t('common.lifestyle.kids.no')}</Text>
                </View>
             )}
             {user?.religion && !user?.privacy?.hideReligion && (
               <View style={styles.lifestyleItem}>
                 <Text style={styles.lifestyleIcon}>⛪</Text>
                 <Text style={styles.lifestyleText}>{t(`common.lifestyle.religion.${user.religion}`)}</Text>
               </View>
             )}
          </View>
        </Animated.View>

        {/* Prompts Section */}
        {user?.prompts && user.prompts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sobre mí</Text>
            </View>
            <View style={styles.promptsContainer}>
              {user.prompts.map((p, i) => (
                <View key={i} style={styles.promptCard}>
                   <Text style={styles.promptQuestion}>{t(`prompts.${p.id}`)}</Text>
                   <Text style={styles.promptAnswer}>{p.answer}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Social Section */}
        {(user?.socialLinks?.instagram || user?.socialLinks?.tiktok) && (
          <Animated.View entering={FadeInDown.delay(750).duration(800)} style={styles.section}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('profile.social_title', 'Social Media')}</Text>
             </View>
             <View style={styles.socialRow}>
                {user.socialLinks.instagram && (
                   <View style={styles.socialBadge}>
                      <Text style={styles.socialIcon}>📸</Text>
                      <Text style={styles.socialText}>@{user.socialLinks.instagram}</Text>
                   </View>
                )}
                {user.socialLinks.tiktok && (
                   <View style={styles.socialBadge}>
                      <Text style={styles.socialIcon}>🎵</Text>
                      <Text style={styles.socialText}>@{user.socialLinks.tiktok}</Text>
                   </View>
                )}
             </View>
          </Animated.View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  mainPhotoWrapper: {
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mainPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    gap: 6,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4FC3F7',
    alignSelf: 'flex-start',
  },
  verifiedText: {
    color: '#4FC3F7',
    fontSize: 12,
    fontWeight: '600',
  },
  editPhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoIcon: {
    fontSize: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoGridItemInner: {
    flex: 1,
  },
  gridPhoto: {
    flex: 1,
  },
  emptyGridPhoto: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadingSlot: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.05)',
  },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    color: '#8A8A8A',
    fontSize: 16,
    fontWeight: '600',
  },
  addPhotoLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gridRemoveIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: -1,
  },
  verifiedBadge: {
    marginLeft: 6,
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    borderRadius: 10,
    padding: 2,
  },
  verificationCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.2)',
  },
  verificationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  verificationIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationInfo: {
    flex: 1,
    gap: 2,
  },
  verificationTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  verificationDesc: {
    color: 'rgba(79, 195, 247, 0.8)',
    fontSize: 12,
  },
  subscriptionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  subscriptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  subscriptionInfo: {
    gap: 2,
  },
  subscriptionPlan: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subscriptionLikesLeft: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  upgradeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  storeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4FC3F7',
  },
  storeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  storeInfo: {
    gap: 4,
  },
  storeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4FC3F7',
  },
  storeSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  storeBtn: {
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  storeBtnText: {
    color: '#4FC3F7',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editLink: {
    color: '#FF2D78',
    fontSize: 14,
    fontWeight: '600',
  },
  bioText: {
    color: '#8A8A8A',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#161616',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  interestChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  lifestyleIcon: {
    fontSize: 16,
  },
  lifestyleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  promptsContainer: {
    gap: 12,
  },
  promptCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    gap: 8,
  },
  promptQuestion: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  promptAnswer: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    gap: 12,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsList: {
    backgroundColor: '#161616',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingIcon: {
    fontSize: 20,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  settingChevron: {
    color: '#8A8A8A',
    fontSize: 20,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  adminIcon: {
    fontSize: 20,
  },
  adminText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumActionCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#161616',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  premiumActionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  premiumActionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumActionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  premiumActionSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  partnerMiniAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#4FC3F7',
  },
  notificationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF2D78',
    borderWidth: 2,
    borderColor: '#000',
  },
});
