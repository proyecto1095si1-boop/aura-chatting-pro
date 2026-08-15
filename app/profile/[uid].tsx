import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Alert, Platform, FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { useAuth, UserProfile } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { calculateDistance } from '@/lib/utils';
import { CustomAlert } from '@/components/custom-alert';
import { SmartImage } from '@/components/smart-image';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const SCREEN_WIDTH = IS_WEB ? Math.min(WINDOW_WIDTH, 500) : WINDOW_WIDTH;

export default function ProfileDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; icon?: string; buttons?: any[] }>({ visible: false, title: '', message: '' });

  const flatListRef = useRef<FlatList>(null);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentPhoto) {
      setCurrentPhoto(roundIndex);
    }
  }, [currentPhoto]);

  const goToPhoto = (index: number) => {
    if (flatListRef.current && profile?.photos && index >= 0 && index < profile.photos.length) {
      flatListRef.current.scrollToIndex({ index, animated: true });
      setCurrentPhoto(index);
    }
  };

  const handlePhotoTap = (event: any) => {
    const x = event.nativeEvent.locationX;
    const isRight = x > SCREEN_WIDTH / 2;
    
    if (isRight) {
      if (currentPhoto < (profile?.photos?.length || 1) - 1) {
        goToPhoto(currentPhoto + 1);
      }
    } else {
      if (currentPhoto > 0) {
        goToPhoto(currentPhoto - 1);
      }
    }
  };

  const showAlert = (title: string, message: string, icon?: string, buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, icon, buttons });
  };
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    if (!uid || !currentUser?.uid || typeof uid !== 'string') {
      setLoading(false);
      return;
    }

    // Check for blocks
    const checkStatus = async () => {
      try {
        const b1 = await getDoc(doc(db, 'blocks', `${currentUser.uid}_${uid}`));
        const b2 = await getDoc(doc(db, 'blocks', `${uid}_${currentUser.uid}`));
        if (b1.exists() || b2.exists()) {
          showAlert(t('common.info'), t('profile_detail.profile_unavailable'), "🚫", [{ text: t('profile_detail.go_back'), style: "primary", onPress: () => { hideAlert(); router.back(); } }]);
          // router.back() is handled in the button press
        }
      } catch (err: any) {
        console.warn("[ProfileDetail] Blocks check permission error:", err.message);
      }
    };
    checkStatus();

    // Real-time listener for the profile
    const unsubscribe = onSnapshot(doc(db, 'profiles', uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        let isInternational = false;

        // Calculate distance if coordinates are available
        if (currentUser?.location && data.location) {
          const lat1 = typeof currentUser.location.latitude === 'number' ? currentUser.location.latitude : currentUser.location._lat;
          const lng1 = typeof currentUser.location.longitude === 'number' ? currentUser.location.longitude : currentUser.location._long;
          const lat2 = typeof data.location.latitude === 'number' ? data.location.latitude : data.location._lat;
          const lng2 = typeof data.location.longitude === 'number' ? data.location.longitude : data.location._long;

          if (lat1 && lng1 && lat2 && lng2) {
            const d = calculateDistance(lat1, lng1, lat2, lng2, 'km');
            if (d > 1000) isInternational = true;
          }
        }

        const profileData = { 
          uid: snapshot.id, 
          ...data,
          isInternational 
        } as UserProfile;

        setProfile(profileData);

        // Preload photos (Disable on web to avoid CORS prefetch issues)
        if (profileData.photos && profileData.photos.length > 0 && !IS_WEB) {
          profileData.photos.forEach(photo => {
            Image.prefetch(photo);
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn("[ProfileDetail] Profile listener permission error:", err.message);
      setLoading(false);
      setProfile(null);
    });

    // 3. New: Check if already matched
    const matchId = [currentUser.uid, uid].sort().join('_');
    const unsubMatch = onSnapshot(
      doc(db, 'matches', matchId), 
      (snap) => {
        setIsMatched(snap.exists() && !snap.data()?.blocked);
      },
      (err) => {
        console.warn("[ProfileDetail] Match listener permission error:", err.message);
        setIsMatched(false);
      }
    );

    return () => {
      unsubscribe();
      unsubMatch();
    };
  }, [uid, currentUser?.uid]);

  const handleGiveSubscription = async (plan: 'plus' | 'gold' | 'elite' | 'free') => {
    if (!profile || !profile.uid) return;
    
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await updateDoc(doc(db, 'profiles', profile.uid), {
        subscription: plan,
        subscriptionSource: plan === 'free' ? null : 'admin', // Marca la suscripción como otorgada por admin
        subscriptionRewardAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      showAlert(t('profile_detail.success'), t('admin.success_reward', 'User successfully rewarded'), "✅");
    } catch (error) {
      console.error("Reward error:", error);
      showAlert(t('common.error'), t('profile_detail.subscription_update_failed'), "❌");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#FF2D78" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF' }}>{t('profile_detail.profile_not_found')}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#FF2D78' }}>{t('profile_detail.go_back')}</Text>
        </Pressable>
      </View>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const isTargetAdmin = profile.role === 'admin';

  const handleLike = async () => {
    if (!currentUser || !profile) return;
    
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isMeTeam = currentUser?.doubleDate?.status === 'linked';
    const fromId = isMeTeam ? [currentUser.uid, currentUser.doubleDate.partnerId].sort().join('_') : currentUser.uid;

    try {
      // Record the like
      const swipeDocId = isMeTeam ? `${fromId}___${profile.uid}` : `${fromId}_${profile.uid}`;
      await setDoc(doc(db, 'swipes', swipeDocId), {
        from: fromId,
        fromTeam: isMeTeam ? [currentUser.uid, currentUser.doubleDate.partnerId] : [currentUser.uid],
        to: profile.uid,
        type: 'like',
        isTeamSwipe: isMeTeam,
        timestamp: serverTimestamp()
      });

      // Check for mutual like (match)
      // If I am a Team, the other person might have liked my TeamID in 'swipes'
      let reverseDoc = null;
      try {
        const revDocId = isMeTeam ? `${profile.uid}___${fromId}` : `${profile.uid}_${fromId}`;
        reverseDoc = await getDoc(doc(db, 'swipes', revDocId));
      } catch (e) {
        console.warn("[ProfileDetail] Mutual like check failed (permissions):", e);
      }
      
      if (reverseDoc && reverseDoc.exists() && reverseDoc.data()?.type === 'like') {
        // Create match
        const matchId = isMeTeam ? `group_${[fromId, profile.uid].sort().join('_')}` : [fromId, profile.uid].sort().join('_');
        await setDoc(doc(db, 'matches', matchId), {
          participants: isMeTeam ? [currentUser.uid, currentUser.doubleDate.partnerId, profile.uid] : [currentUser.uid, profile.uid],
          isDoubleDate: isMeTeam,
          timestamp: serverTimestamp(),
          lastMessage: isMeTeam ? t('profile_detail.match_with_team', { name: profile.name }) : t('profile_detail.match_made'),
          lastMessageTime: serverTimestamp(),
          messageCount: 0,
          isInternational: profile.isInternational || false
        });
        
        showAlert(
          t('discover.match.title'),
          t('profile_detail.match_subtitle', { extra: isMeTeam ? t('profile_detail.and_your_partner') : '', name: profile.name }),
          "🔥",
          [
            { text: t('discover.match.continue'), onPress: () => { hideAlert(); router.back(); }, style: "cancel" },
            { text: t('discover.match.send_message'), onPress: () => { hideAlert(); router.replace(`/chat/${matchId}` as any); }, style: "primary" }
          ]
        );
      } else {
        router.back();
      }
    } catch (e) {
      console.error("Like error on detail:", e);
      router.back();
    }
  };

  const handleDislike = async () => {
    if (!currentUser || !profile) return;
    const isMeTeam = currentUser?.doubleDate?.status === 'linked';
    const fromId = isMeTeam ? [currentUser.uid, currentUser.doubleDate.partnerId].sort().join('_') : currentUser.uid;

    try {
      const swipeDocId = isMeTeam ? `${fromId}___${profile.uid}` : `${fromId}_${profile.uid}`;
      await setDoc(doc(db, 'swipes', swipeDocId), {
        from: fromId,
        fromTeam: isMeTeam ? [currentUser.uid, currentUser.doubleDate.partnerId] : [currentUser.uid],
        to: profile.uid,
        type: 'dislike',
        isTeamSwipe: isMeTeam,
        timestamp: serverTimestamp()
      });
      router.back();
    } catch (e) {
      console.error("Pass error on detail:", e);
      router.back();
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !profile) return;

    const blockAction = async () => {
      try {
        setLoading(true);
        // 1. Record the block in a dedicated collection
        const blockId = `${currentUser.uid}_${profile.uid}`;
        await setDoc(doc(db, 'blocks', blockId), {
          blockerId: currentUser.uid,
          blockedId: profile.uid,
          timestamp: serverTimestamp()
        });

        // 2. Remove any existing match
        const sortedMatchId = [currentUser.uid, profile.uid].sort().join('_');
        const matchRef = doc(db, 'matches', sortedMatchId);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
          await updateDoc(matchRef, {
            blocked: true,
            blockedBy: currentUser.uid,
            status: 'blocked',
            lastMessage: t('profile_detail.user_blocked'),
            lastMessageTime: serverTimestamp()
          });
        }

        // 3. Mark the swipe as a block to hide from Discovery immediately
        await setDoc(doc(db, 'swipes', `${currentUser.uid}_${profile.uid}`), {
          from: currentUser.uid,
          to: profile.uid,
          type: 'block',
          timestamp: serverTimestamp()
        });

        if (Platform.OS === 'web') {
          window.alert(t('profile_detail.blocked_web', { name: profile.name }));
          router.back();
        } else {
          showAlert(t('profile_detail.block_success'), t('profile_detail.block_success_message'), "🛡️", [{ text: t('profile_detail.go_back'), onPress: () => { hideAlert(); router.back(); } }]);
        }
        
      } catch (e: any) {
        console.error("Block error:", e);
        const errorMsg = e.code === 'permission-denied' 
          ? t('profile_detail.block_error_permissions') 
          : t('profile_detail.block_error_generic');
        
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          showAlert(t('common.error'), errorMsg, "❌");
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('profile_detail.block_confirm_web', { name: profile.name }));
      if (confirmed) blockAction();
    } else {
      showAlert(
        t('profile_detail.block_confirm_title', { name: profile.name }),
        t('profile_detail.block_confirm_message'),
        "⚠️",
        [
          { text: t('common.cancel'), style: "cancel", onPress: hideAlert },
          { text: t('profile_detail.block_btn'), style: "destructive", onPress: () => { hideAlert(); blockAction(); } }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainWrapper}>
        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>

        {/* Block button Top Left */}
        <Pressable style={styles.blockButtonTop} onPress={handleBlock}>
          <Text style={styles.blockIconTop}>🛡️</Text>
        </Pressable>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
        {/* Photo */}
        <View style={styles.photoContainer}>
          <Pressable onPress={handlePhotoTap} style={StyleSheet.absoluteFill}>
            <FlatList
              ref={flatListRef}
              data={profile.photos || ['https://via.placeholder.com/400']}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyExtractor={(item, index) => `${item}_${index}`}
              renderItem={({ item }) => (
                <SmartImage
                  source={item}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 }}
                  contentFit="cover"
                  cachePolicy="disk"
                  priority="high"
                  transition={300}
                />
              )}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
          </Pressable>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.photoGradient}
            pointerEvents="none"
          />

          {/* Photo dots */}
          {profile.photos && profile.photos.length > 1 && (
            <View style={styles.photoDots}>
              {profile.photos.map((_, i) => (
                <Pressable
                  key={i}
                  style={[styles.photoDot, i === currentPhoto && styles.photoDotActive]}
                  onPress={() => goToPhoto(i)}
                />
              ))}
            </View>
          )}

          {/* Profile info overlay */}
          <View style={styles.photoInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profile.name}{!isTargetAdmin && `, ${profile.age}`}
              </Text>
              {profile.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
              )}
            </View>
            {isTargetAdmin ? (
              <LinearGradient
                colors={['#4FC3F7', '#2196F3'] as const}
                style={styles.subBadge}
              >
                <Text style={styles.subBadgeText}>SOPORTE OFICIAL</Text>
              </LinearGradient>
            ) : profile.subscription && profile.subscription !== 'free' && (
              <LinearGradient
                colors={profile.subscription === 'elite' ? ['#FF2D78', '#FF6B35'] as const : ['#FFD700', '#FF8C00'] as const}
                style={styles.subBadge}
              >
                <Text style={styles.subBadgeText}>Aura {profile.subscription.toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Bio */}
          {profile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{isTargetAdmin ? t('profile_detail.official_account') : t('profile_detail.about_name', { name: profile.name })}</Text>
              <Text style={styles.bioText}>
                {isTargetAdmin 
                  ? t('profile_detail.official_bio') 
                  : profile.bio}
              </Text>
            </View>
          )}

          {/* Admin Panel */}
          {isAdmin && (
            <View style={styles.adminPanel}>
              <Text style={styles.adminTitle}>🛡️ {t('admin.manage_user', 'Administrar Usuario')}</Text>
              <View style={styles.adminButtons}>
                <Pressable 
                  style={[styles.adminBtn, { backgroundColor: '#4FC3F720', borderColor: '#4FC3F7' }]}
                  onPress={() => handleGiveSubscription('plus')}
                >
                  <Text style={[styles.adminBtnText, { color: '#4FC3F7' }]}>{t('admin.give_plus', 'Dar Aura Plus')}</Text>
                </Pressable>
                <Pressable 
                  style={[styles.adminBtn, { backgroundColor: '#FFD70020', borderColor: '#FFD700' }]}
                  onPress={() => handleGiveSubscription('gold')}
                >
                  <Text style={[styles.adminBtnText, { color: '#FFD700' }]}>{t('admin.give_gold', 'Dar Aura Gold')}</Text>
                </Pressable>
                <Pressable 
                  style={({pressed}) => [styles.adminBtn, { borderColor: '#FF2D78' }, pressed && { opacity: 0.7 }]}
                  onPress={() => handleGiveSubscription('elite')}
                >
                  <Text style={[styles.adminBtnText, { color: '#FF2D78' }]}>{t('admin.give_platinum', 'Dar Aura Elite')}</Text>
                </Pressable>
                <Pressable 
                  style={[styles.adminBtn, { backgroundColor: '#333', borderColor: '#444' }]}
                  onPress={() => handleGiveSubscription('free')}
                >
                  <Text style={[styles.adminBtnText, { color: '#8A8A8A' }]}>{t('admin.revoke_sub', 'Revoke Subscription')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Lifestyle Grid */}
          {!isTargetAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile_detail.lifestyle')}</Text>
              <View style={styles.lifestyleGrid}>
                 {!profile.privacy?.hideHeight && profile.height && (
                   <View style={styles.lifestyleItem}>
                     <Text style={styles.lifestyleIcon}>📏</Text>
                     <Text style={styles.lifestyleText}>{profile.height} cm</Text>
                   </View>
                 )}
                 {!profile.privacy?.hideZodiac && profile.zodiac && (
                   <View style={styles.lifestyleItem}>
                     <Text style={styles.lifestyleIcon}>
                       {profile.zodiac === 'aries' ? '♈' : profile.zodiac === 'taurus' ? '♉' : profile.zodiac === 'gemini' ? '♊' : 
                        profile.zodiac === 'cancer' ? '♋' : profile.zodiac === 'leo' ? '♌' : profile.zodiac === 'virgo' ? '♍' : 
                        profile.zodiac === 'libra' ? '♎' : profile.zodiac === 'scorpio' ? '♏' : profile.zodiac === 'sagittarius' ? '♐' : 
                        profile.zodiac === 'capricorn' ? '♑' : profile.zodiac === 'aquarius' ? '♒' : '♓'}
                     </Text>
                     <Text style={styles.lifestyleText}>{t(`common.lifestyle.zodiac.${profile.zodiac}`)}</Text>
                   </View>
                 )}
                 {profile.personalityType && (
                   <View style={styles.lifestyleItem}>
                     <Text style={styles.lifestyleIcon}>🧠</Text>
                     <Text style={styles.lifestyleText}>{profile.personalityType}</Text>
                   </View>
                 )}
                 {profile.smokes && (
                   <View style={styles.lifestyleItem}>
                     <Text style={styles.lifestyleIcon}>🚬</Text>
                     <Text style={styles.lifestyleText}>{t(`common.lifestyle.smoking.${profile.smokes}`)}</Text>
                   </View>
                 )}
                 {profile.drinks && (
                   <View style={styles.lifestyleItem}>
                     <Text style={styles.lifestyleIcon}>🍹</Text>
                     <Text style={styles.lifestyleText}>{t(`common.lifestyle.drinking.${profile.drinks}`)}</Text>
                   </View>
                 )}
                 {profile.hasChildren !== null && (
                    <View style={styles.lifestyleItem}>
                      <Text style={styles.lifestyleIcon}>👶</Text>
                      <Text style={styles.lifestyleText}>{profile.hasChildren ? t('common.lifestyle.kids.yes') : t('common.lifestyle.kids.no')}</Text>
                    </View>
                 )}
                 {profile.religion && !profile.privacy?.hideReligion && (
                   <View style={styles.lifestyleItem}>
                     <Text style={styles.lifestyleIcon}>⛪</Text>
                     <Text style={styles.lifestyleText}>{t(`common.lifestyle.religion.${profile.religion}`)}</Text>
                   </View>
                 )}
              </View>
            </View>
          )}

          {/* Prompts Section */}
          {profile.prompts && profile.prompts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile_detail.about_name', { name: profile.name })}</Text>
              <View style={styles.promptsContainer}>
                {profile.prompts.map((p, i) => (
                  <View key={i} style={styles.promptCard}>
                     <Text style={styles.promptQuestion}>{t(`prompts.${p.id}`)}</Text>
                     <Text style={styles.promptAnswer}>{p.answer}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Interests */}
          {!isTargetAdmin && profile.interests && profile.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.interests')}</Text>
              <View style={styles.interestChips}>
                {profile.interests.map(interest => (
                  <View key={interest} style={styles.interestChip}>
                    <Text style={styles.interestChipText}>
                      {t(`common.interests.${interest}`, { defaultValue: interest })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Social Section */}
          {(profile.socialLinks?.instagram || profile.socialLinks?.tiktok) && (
            <View style={styles.section}>
               <Text style={styles.sectionTitle}>{t('profile_detail.social_media')}</Text>
               <View style={styles.socialRow}>
                  {profile.socialLinks.instagram && (
                     <View style={styles.socialBadge}>
                        <Text style={styles.socialIcon}>📸</Text>
                        <Text style={styles.socialText}>@{profile.socialLinks.instagram}</Text>
                     </View>
                  )}
                  {profile.socialLinks.tiktok && (
                     <View style={styles.socialBadge}>
                        <Text style={styles.socialIcon}>🎵</Text>
                        <Text style={styles.socialText}>@{profile.socialLinks.tiktok}</Text>
                     </View>
                  )}
               </View>
            </View>
          )}

          {/* User Data (Internal/Admin only) */}
          {isAdmin && (
            <View style={styles.section}>
               <Text style={[styles.bioText, { fontSize: 13, color: '#4FC3F7' }]}>ID: {profile.uid}</Text>
               <Text style={[styles.bioText, { fontSize: 13, color: '#4FC3F7' }]}>Email: {profile.email || 'Oculto'}</Text>
            </View>
          )}

          {/* Report button */}
          {!isTargetAdmin && (
            <View style={styles.reportButton}>
              <Pressable onPress={() => router.push('/report-problem' as any)}>
                <Text style={styles.reportText}>⚑ {t('profile_detail.report_problem')}</Text>
              </Pressable>
              <Pressable onPress={handleBlock} style={{ marginTop: 10 }}>
                <Text style={[styles.reportText, { color: '#FF2D78' }]}>🚫 {t('profile_detail.block_user')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      {!isAdmin && !isTargetAdmin && (
        <View style={styles.actionButtons}>
          {isMatched ? (
            <Pressable 
              style={styles.fullMessageBtn} 
              onPress={() => {
                const matchId = [currentUser.uid, profile.uid].sort().join('_');
                router.push(`/chat/${matchId}` as any);
              }}
            >
              <LinearGradient
                colors={['#FF2D78', '#FF6B35'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fullMessageGradient}
              >
                <Ionicons name="chatbubble" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.fullMessageText}>{t('discover.match.send_message')}</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <>
              <Pressable style={[styles.actionBtn, styles.dislikeBtn]} onPress={handleDislike}>
                <Text style={styles.actionBtnIcon}>✕</Text>
              </Pressable>
              <Pressable style={styles.likeBtn} onPress={handleLike}>
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.likeBtnGradient}
                >
                  <Text style={styles.likeBtnIcon}>♥</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Custom Alert Modal */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
        </View>
      </View>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  mainWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#0A0A0A',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  photoContainer: {
    height: SCREEN_WIDTH * 1.3,
    position: 'relative',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  photoDots: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
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
  },
  photoInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  subBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  subBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bioText: {
    color: '#8A8A8A',
    fontSize: 15,
    lineHeight: 24,
  },
  adminPanel: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    gap: 16,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  adminButtons: {
    gap: 10,
  },
  adminBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  adminBtnText: {
    fontSize: 15,
    fontWeight: '700',
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
  reportButton: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  reportText: {
    color: '#8A8A8A',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  blockButtonTop: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  blockIconTop: {
    fontSize: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dislikeBtn: {
    backgroundColor: '#1A0A12',
    borderWidth: 2,
    borderColor: '#FF2D78',
  },
  likeBtn: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  likeBtnGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMessageBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fullMessageGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtnIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  likeBtnIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
});
