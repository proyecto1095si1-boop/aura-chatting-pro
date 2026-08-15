import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, RefreshControl, Platform, Alert, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { Match } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import { useSubscription } from '@/lib/subscription-context';
import { SmartImage } from '@/components/smart-image';
import { showRewardedAd } from '@/lib/ad-service';
import { Ionicons } from '@expo/vector-icons';
import { calculateDistance } from '@/lib/utils';
import { getProfiles } from '@/lib/profile-service';


import Animated, { FadeInDown, FadeIn, FadeInRight, Layout, ZoomIn } from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────────────────────
// AdModal: shown when a free user wants to reveal a "likes you" profile
// ─────────────────────────────────────────────────────────────────────────────

interface AdModalProps {
  visible: boolean;
  personName: string;
  onAdComplete: () => void;
  onCancel: () => void;
}

function AdModal({ visible, personName, onAdComplete, onCancel }: AdModalProps) {
  const { t } = useTranslation();
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleWatch = async () => {
    setWatching(true);
    setCountdown(3);
    
    try {
      // Mostramos el anuncio bonificado real
      const result = await showRewardedAd();
      
      setWatching(false);
      if (result === 'rewarded') {
        onAdComplete();
      } else if (result === 'dismissed') {
        // El usuario cerró el anuncio sin completarlo
        if (Platform.OS === 'web') {
          window.alert(t('matches.ad_modal.incomplete_msg'));
        } else {
          Alert.alert(t('matches.ad_modal.incomplete_title'), t('matches.ad_modal.incomplete_msg'));
        }
      } else {
        // Error de carga - permitir al usuario reintentar o cancelar
        if (Platform.OS === 'web') {
          window.alert(t('matches.ad_modal.error_msg_web'));
        } else {
          Alert.alert(
            t('matches.ad_modal.error_title'),
            t('matches.ad_modal.error_msg'),
            [
              { text: t('matches.ad_modal.cancel_btn'), style: 'cancel', onPress: onCancel },
              { text: t('matches.ad_modal.retry_btn'), onPress: handleWatch }
            ]
          );
        }
      }
    } catch (e) {
      console.error('[AdModal] Error:', e);
      setWatching(false);
      onCancel();
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={adStyles.overlay}>
        <Animated.View entering={ZoomIn.duration(300)} style={adStyles.card}>
          {/* Decorative gradient */}
          <LinearGradient
            colors={['rgba(255,45,120,0.15)', 'rgba(255,107,53,0.05)']}
            style={adStyles.cardGradient}
          />
          <View style={adStyles.iconWrapper}>
            <LinearGradient colors={['#FF2D78', '#FF6B35']} style={adStyles.iconCircle}>
              <Ionicons name="play-circle" size={32} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={adStyles.title}>{t('matches.ad_modal.title')}</Text>
          <Text style={adStyles.subtitle}>
            {t('matches.ad_modal.subtitle_before')}{'\n'}
            <Text style={adStyles.nameHighlight}>{personName}</Text>
            {'\n'}{t('matches.ad_modal.subtitle_after')}
          </Text>

          {watching ? (
            <View style={adStyles.watchingContainer}>
              <View style={adStyles.adPlaceholder}>
                <LinearGradient
                  colors={['#1A1A2E', '#16213E', '#0F3460']}
                  style={adStyles.adPlaceholderGradient}
                >
                  <ActivityIndicator color="#FF2D78" size="large" />
                  <Text style={adStyles.adPlaceholderText}>{t('matches.ad_modal.opening')}</Text>
                </LinearGradient>
              </View>
            </View>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [adStyles.watchBtn, pressed && { opacity: 0.85 }]}
                onPress={handleWatch}
              >
                <LinearGradient colors={['#FF2D78', '#FF6B35']} style={adStyles.watchBtnGradient}>
                  <Ionicons name="play" size={18} color="#FFF" />
                  <Text style={adStyles.watchBtnText}>{t('matches.ad_modal.watch_btn')}</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={adStyles.cancelBtn} onPress={onCancel}>
                <Text style={adStyles.cancelText}>{t('matches.ad_modal.cancel')}</Text>
              </Pressable>

              <Pressable
                style={adStyles.premiumHint}
                onPress={() => { onCancel(); router.push('/paywall' as any); }}
              >
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={adStyles.premiumHintText}>
                  {t('matches.ad_modal.premium_hint')}
                </Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LikesYouCard: shows a blurred or revealed profile from the "likes you" list
// ─────────────────────────────────────────────────────────────────────────────

interface LikesYouCardProps {
  profile: any;
  index: number;
  isPremium: boolean;
  isUnlocked: boolean;
  onPressLocked: () => void;
}

const LikesYouCard = React.memo(({ profile, index, isPremium, isUnlocked, onPressLocked }: LikesYouCardProps) => {

  const { t } = useTranslation();

  const revealed = isPremium || isUnlocked || profile.isSuperLike;

  const handlePress = () => {
    if (!revealed) {
      onPressLocked();
      return;
    }
    
    if (profile.isDoubleDate) {
      router.push({
        pathname: `/profile/team/${profile.uid}`,
        params: { 
          u1: profile.groupProfiles?.[0]?.uid, 
          u2: profile.groupProfiles?.[1]?.uid 
        }
      } as any);
    } else {
      router.push(`/profile/${profile.uid}`);
    }
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(600)} layout={Layout.springify()}>
      <Pressable
        style={({ pressed }) => [styles.newMatchCard, pressed && { transform: [{ scale: 0.95 }] }]}
        onPress={handlePress}
      >
        <View style={styles.newMatchPhotoWrapper}>
          {profile.isDoubleDate ? (
            <View style={styles.groupAvatarGrid}>
              {profile.groupProfiles?.slice(0, 3).map((p: any, i: number) => (
                <SmartImage key={p.uid} source={p.photos?.[0]} style={[styles.groupAvatarItem, styles[`groupAvatar${i}` as any]]} />
              ))}
              <View style={styles.groupAvatarBadge}><Text style={{fontSize: 8}}>👥</Text></View>
            </View>
          ) : (
            <SmartImage
              source={profile.photos?.[0]}
              style={[styles.newMatchPhoto, { borderColor: '#FFD700' }]}
              contentFit="cover"
            />
          )}

          {/* Blur overlay for locked profiles */}
          {!revealed && (
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.lockOverlay}>
                <View style={styles.lockIconWrapper}>
                  <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.lockIconCircle}>
                    <Ionicons name="play" size={16} color="#FFF" />
                  </LinearGradient>
                </View>
              </View>
            </BlurView>
          )}

          {/* Unlocked checkmark */}
          {isUnlocked && !isPremium && (
            <Animated.View entering={ZoomIn} style={styles.unlockedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
            </Animated.View>
          )}

          {/* Heart badge */}
          {!profile.isDoubleDate && (
            <View style={[styles.likesYouBadge, profile.isSuperLike && { backgroundColor: '#4FC3F7' }]}>
              <Text style={{ fontSize: 10 }}>{profile.isSuperLike ? '★' : '❤️'}</Text>
            </View>
          )}
          
          {profile.isSuperLike && (
            <View style={styles.superLikeLabel}>
              <Text style={styles.superLikeLabelText}>SUPER</Text>
            </View>
          )}
        </View>

        <Text style={styles.newMatchName} numberOfLines={2}>
          {revealed ? profile.name : profile.isDoubleDate ? t('matches.pair_fallback') : '???'}
        </Text>
        {!revealed && (
          <Text style={styles.watchAdHint}>{t('matches.watch_ad_hint')}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
});


// ─────────────────────────────────────────────────────────────────────────────

const NewMatchCard = React.memo(({ match, index }: { match: any; index: number }) => {

  const { t } = useTranslation();

  const handlePress = () => {
    router.push(`/chat/${match.matchId}` as any);
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).duration(600)}
      layout={Layout.springify()}
    >
      <Pressable
        style={({ pressed }) => [styles.newMatchCard, pressed && { transform: [{ scale: 0.95 }] }]}
        onPress={handlePress}
      >
        <View style={styles.newMatchPhotoWrapper}>
          {match.isDoubleDate ? (
            <View style={styles.groupAvatarGrid}>
              {match.groupProfiles?.slice(0, 3).map((p: any, i: number) => (
                <SmartImage key={p.uid} source={p.photos?.[0]} style={[styles.groupAvatarItem, styles[`groupAvatar${i}` as any]]} />
              ))}
              <View style={styles.groupAvatarBadge}><Text style={{fontSize: 8}}>👥</Text></View>
            </View>
          ) : (
            <SmartImage
              source={match.profile?.photos?.[0]}
              style={styles.newMatchPhoto}
              contentFit="cover"
            />
          )}
          {match.isInternational && (
            <View style={styles.mundiBadgeSmall}>
              <Text style={{ fontSize: 10 }}>🌍</Text>
            </View>
          )}
          <LinearGradient
            colors={['#FF2D78', '#FF6B35']}
            style={styles.newMatchBadge}
          >
            <Text style={styles.newMatchBadgeText}>✨</Text>
          </LinearGradient>
        </View>
        <Text style={styles.newMatchName} numberOfLines={1}>
          {t('matches.match_with', { name: match.profile?.name })}
        </Text>
      </Pressable>
    </Animated.View>
  );
});


const ConversationItem = React.memo(({ match, index, currentUserId }: { match: any; index: number, currentUserId: string }) => {

  const { t } = useTranslation();
  const unread = match.lastMessageSenderId !== currentUserId ? (match.unreadCount || 0) : 0;
  return (
    <Animated.View
      entering={FadeInDown.delay(300 + index * 100).duration(600)}
      layout={Layout.springify()}
    >
      <Pressable
        style={({ pressed }) => [
          styles.conversationItem, 
          unread > 0 && styles.conversationItemUnread,
          pressed && { backgroundColor: 'rgba(255,45,120,0.1)' }
        ]}
        onPress={() => router.push(`/chat/${match.matchId}` as any)}
      >
        {unread > 0 && (
           <LinearGradient 
              colors={['rgba(255,45,120,0.08)', 'transparent']} 
              start={{x:0, y:0.5}} 
              end={{x:1, y:0.5}} 
              style={StyleSheet.absoluteFillObject} 
           />
        )}
        
        <View style={styles.conversationPhotoWrapper}>
          {match.isDoubleDate ? (
            <View style={styles.groupAvatarGridLarge}>
              {match.groupProfiles?.slice(0, 3).map((p: any, i: number) => (
                <SmartImage key={p.uid} source={p.photos?.[0]} style={[styles.groupAvatarItemLarge, styles[`groupAvatarLarge${i}` as any]]} />
              ))}
            </View>
          ) : (
            <SmartImage
              source={match.profile?.photos?.[0]}
              style={[styles.conversationPhoto, unread > 0 && { borderColor: '#FF2D78', borderWidth: 2 }]}
              contentFit="cover"
            />
          )}
          {unread > 0 ? (
             <Animated.View entering={ZoomIn} style={styles.onlineDotUnread} />
          ) : (
             <View style={styles.onlineDot} />
          )}
          {match.isInternational && (
            <View style={styles.mundiBadgeSmall}>
              <Text style={{ fontSize: 10 }}>🌍</Text>
            </View>
          )}
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, unread > 0 && { color: '#FFF' }]}>
              {match.isDoubleDate 
                ? `${match.groupProfiles?.[0]?.name || t('matches.team_fallback')}... 👥`
                : `${match.profile?.name} ${match.isInternational ? '🌍' : ''}`}
            </Text>
            {match.lastMessageTime && (
              <Text style={[styles.conversationTime, unread > 0 && { color: '#FF2D78', fontWeight: 'bold' }]}>
                {match.lastMessageTime.toDate
                  ? match.lastMessageTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : match.lastMessageTime}
              </Text>
            )}
          </View>
          <Text
            style={[styles.conversationPreview, unread > 0 && styles.conversationPreviewUnread]}
            numberOfLines={1}
          >
            {match.lastMessage || t('matches.start_conversation')}
          </Text>
        </View>
        
        {unread > 0 && (
          <View style={styles.unreadContainer}>
             <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
             </LinearGradient>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { limits, plan } = useSubscription();

  const [matches, setMatches] = useState<Match[]>([]);
  const [likesYouUsers, setLikesYouUsers] = useState<any[]>([]);
  const [blockedUids, setBlockedUids] = useState<Set<string>>(new Set());
  const [swipedUids, setSwipedUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Tracks which "likes you" profiles have been unlocked (set of uids)
  const [unlockedLikes, setUnlockedLikes] = useState<Set<string>>(new Set());

  // Ad modal state
  const [adModalVisible, setAdModalVisible] = useState(false);
  const [pendingUnlockProfile, setPendingUnlockProfile] = useState<any | null>(null);

  const isPremium = plan !== 'free';

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let unsubMatches: () => void;
    let unsubLikes: () => void;
    let unsubBlocks: () => void;
    let unsubMySwipes: () => void;

    const setupListeners = () => {
      // 0. Blocks Listener (Who I blocked + Who blocked me)
      const bq1 = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
      const bq2 = query(collection(db, 'blocks'), where('blockedId', '==', user.uid));
      
      const updateBlocks = (snap1: any, snap2: any) => {
        const blocked = new Set<string>();
        snap1.docs.forEach((d: any) => blocked.add(d.data().blockedId));
        snap2.docs.forEach((d: any) => blocked.add(d.data().blockerId));
        setBlockedUids(blocked);
      };

      let snap1: any = { docs: [] };
      let snap2: any = { docs: [] };

      const unsubB1 = onSnapshot(bq1, (s) => { snap1 = s; updateBlocks(snap1, snap2); });
      const unsubB2 = onSnapshot(bq2, (s) => { snap2 = s; updateBlocks(snap1, snap2); });
      
      unsubBlocks = () => { unsubB1(); unsubB2(); };

      // 0.5. My Swipes Listener (Who I already liked or passed)
      const sq = query(collection(db, 'swipes'), where('from', '==', user.uid));
      unsubMySwipes = onSnapshot(sq, (snap) => {
        const swiped = new Set<string>();
        snap.docs.forEach((d) => swiped.add(d.data().to));
        setSwipedUids(swiped);
      });

      // 1. Real-time Matches Listener
      const q = query(
        collection(db, 'matches'), 
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTime', 'desc'),
        limit(100)
      );
      unsubMatches = onSnapshot(q, async (snapshot) => {
        const allOtherIds = new Set<string>();
        snapshot.docs.forEach(d => {
          const matchData = d.data();
          if (matchData.blocked || matchData.status === 'blocked') return;
          const others = matchData.participants?.filter((id: string) => id !== user.uid) || [];
          others.forEach((id: string) => allOtherIds.add(id));
        });

        const profileMap = await getProfiles(Array.from(allOtherIds));

        const results = snapshot.docs.map((d) => {
          const matchData = d.data();
          if (matchData.blocked || matchData.status === 'blocked') return null;

          if (matchData.isDoubleDate) {
            const otherIds = matchData.participants.filter((id: string) => id !== user.uid);
            const profiles = otherIds.map(id => profileMap[id]).filter(Boolean);
            return {
              matchId: d.id,
              ...matchData,
              groupProfiles: profiles
            };
          }

          const otherUserId = matchData.participants?.find((id: string) => id !== user.uid);
          if (!otherUserId) return null;

          const profile = profileMap[otherUserId];
          if (profile) {
            return {
              matchId: d.id,
              ...matchData,
              profile: profile
            };
          }
          return null;
        });

        setMatches(results.filter(Boolean) as any);
        setLoading(false);
      });


      // 2. Combined "Likes You" Listeners
      const fetchLikes = async () => {
        const teamId = user?.doubleDate?.status === 'linked' ? [user.uid, user.doubleDate.partnerId].sort().join('_') : null;
        
        // Individual likes
        const lq = query(collection(db, 'swipes'), where('to', '==', user.uid), where('type', '==', 'like'), limit(50));
        
        // Team likes (Singles swiping on our team)
        const tlq = teamId ? query(collection(db, 'swipes'), where('to', '==', teamId), where('type', '==', 'like'), limit(50)) : null;
        
        // Double likes (Other teams swiping on our team)
        const dlq = query(collection(db, 'double_swipes'), where('toTeam', 'array-contains', user.uid), where('type', '==', 'like'), limit(50));

        const [lSnap, tlSnap, dlSnap] = await Promise.all([
          getDocs(lq), 
          tlq ? getDocs(tlq) : Promise.resolve({ docs: [] }), 
          getDocs(dlq)
        ]);
        
        const allSwipeIds = new Set<string>();
        lSnap.docs.forEach(d => allSwipeIds.add(d.data().from));
        (tlSnap as any).docs.forEach((d: any) => allSwipeIds.add(d.data().from));
        dlSnap.docs.forEach(d => {
          const fromTeam = d.data().fromTeam || [];
          fromTeam.forEach((id: string) => {
            if (!user.uid.includes(id)) allSwipeIds.add(id);
          });
        });

        const swipeProfileMap = await getProfiles(Array.from(allSwipeIds));
        
        const individualLikes = lSnap.docs.map((d) => {
          const fromId = d.data().from;
          const p = swipeProfileMap[fromId];
          return p ? { uid: fromId, ...p, isSuperLike: d.data().super || false, timestamp: d.data().timestamp } : null;
        });

        const singleToTeamLikes = (tlSnap as any).docs.map((d: any) => {
          const fromId = d.data().from;
          const p = swipeProfileMap[fromId];
          return p ? { uid: fromId, ...p, isToTeam: true, timestamp: d.data().timestamp } : null;
        });

        const doubleLikes = dlSnap.docs.map((d) => {
          const fromTeam = d.data().fromTeam || [];
          const validProfiles = fromTeam.map((id: string) => swipeProfileMap[id]).filter(Boolean);
          if (validProfiles.length === 0) return null;
          
          return {
            uid: d.id,
            name: validProfiles.map((p: any) => p.name).join(' & '),
            photos: validProfiles.flatMap((p: any) => p.photos || []),
            isDoubleDate: true,
            groupProfiles: validProfiles,
            timestamp: d.data().timestamp
          };
        });


        const combined = [...individualLikes, ...singleToTeamLikes, ...doubleLikes].filter(Boolean).sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
        setLikesYouUsers(combined);
      };

      fetchLikes();
      const unsub1 = onSnapshot(query(collection(db, 'swipes'), where('to', '==', user.uid), where('type', '==', 'like')), fetchLikes);
      const unsub2 = onSnapshot(query(collection(db, 'double_swipes'), where('toTeam', 'array-contains', user.uid), where('type', '==', 'like')), fetchLikes);
      
      const teamId = user?.doubleDate?.status === 'linked' ? [user.uid, user.doubleDate.partnerId].sort().join('_') : null;
      const unsub3 = teamId ? onSnapshot(query(collection(db, 'swipes'), where('to', '==', teamId), where('type', '==', 'like')), fetchLikes) : () => {};

      unsubLikes = () => { unsub1(); unsub2(); unsub3(); };
    };

    setupListeners();

    return () => {
      if (unsubMatches) unsubMatches();
      if (unsubLikes) unsubLikes();
      if (unsubBlocks) unsubBlocks();
      if (unsubMySwipes) unsubMySwipes();
    };
  }, [user?.uid]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Even if it's real-time, we can "force" a re-check if needed, but usually not necessary with onSnapshot.
    // We'll just wait a bit and stop the spinner to give visual feedback.
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isWelcomeMsg = (msg: string) => {
    if (!msg) return true;
    const lower = msg.toLowerCase();
    return lower.includes('¡match') || 
           lower.includes('hiciste match') || 
           lower.includes('es un match') || 
           lower.includes("it's a match") || 
           lower.includes('match!') || 
           lower.includes('match with') ||
           lower.includes('match con');
  };

  const newMatches = matches.filter(m => {
    const msg = m.lastMessage || '';
    const welcome = isWelcomeMsg(msg);
    const hasNoRealMessages = m.messageCount === 0 || m.messageCount === undefined;
    return hasNoRealMessages && welcome;
  });

  const conversations = matches.filter(m => {
    const msg = m.lastMessage || '';
    const welcome = isWelcomeMsg(msg);
    const hasMessages = (m.messageCount ?? 0) > 0;
    return hasMessages || !welcome;
  });

  // ── FILTER LIKES YOU ──
  // Re-calculate whenever matches or likes changes to avoid ghosting
  const filteredLikesYou = React.useMemo(() => {
    return likesYouUsers.filter(profile => {
      // 1. Check if the sender (individual or any group member) is already matched with us
      const isMatched = matches.some(m => {
        if (profile.isDoubleDate && profile.groupProfiles) {
          // If it's a team like, check if any of their members are in a match with us
          return profile.groupProfiles.some((p: any) => m.participants?.includes(p.uid));
        }
        return m.participants?.includes(profile.uid);
      });

      // 2. Check if the user is blocked
      const isBlocked = blockedUids.has(profile.uid);
      
      // 3. Check if we already swiped on them (like or pass)
      const hasSwiped = swipedUids.has(profile.uid);
      
      return !isMatched && !isBlocked && !hasSwiped;
    });
  }, [likesYouUsers, matches, blockedUids, swipedUids]);

  // ── Likes You unlock flow ──────────────────────────────────────────────────

  const handleLikesYouPress = (profile: any) => {
    if (isPremium) return; // premium users don't need to do anything extra
    if (unlockedLikes.has(profile.uid)) return; // already unlocked
    // Show ad modal for this specific person
    setPendingUnlockProfile(profile);
    setAdModalVisible(true);
  };

  const handleAdComplete = () => {
    setAdModalVisible(false);
    if (pendingUnlockProfile) {
      const uid = pendingUnlockProfile.uid;
      setUnlockedLikes(prev => new Set([...prev, uid]));
      setPendingUnlockProfile(null);
      // Auto-navigate after unlock
      router.push(`/profile/${uid}`);
    }
  };

  const handleAdCancel = () => {
    setAdModalVisible(false);
    setPendingUnlockProfile(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <FlatList
        data={conversations}
        keyExtractor={item => item.matchId}
        renderItem={({ item, index }) => (
          <ConversationItem match={item} index={index} currentUserId={user?.uid as string} />
        )}
        ListHeaderComponent={
          <>
            {/* Header */}
            <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/logo_aura.png')}
                  style={styles.headerLogoImage}
                  contentFit="contain"
                />
                <Text style={styles.headerLogo}>Aura</Text>
                <Ionicons name="sparkles" size={16} color="#FFD700" style={{ marginLeft: -2, marginTop: -8 }} />
              </View>
              <Pressable 
                onPress={() => router.push('/settings' as any)}
                style={styles.searchBtn}
              >
                <Ionicons name="settings-outline" size={24} color="#FFF" />
              </Pressable>
            </Animated.View>

            {/* ── Le Gustas Section ─────────────────────────────────────────── */}
            {filteredLikesYou.length > 0 && (
              <View style={styles.section}>
                <Animated.View entering={FadeIn.delay(80)} style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {t('matches.likes_you_count', { count: filteredLikesYou.length })}
                  </Text>
                  {!isPremium && (
                    <Pressable
                      style={styles.premiumBadge}
                      onPress={() => router.push('/paywall' as any)}
                    >
                      <Ionicons name="star" size={10} color="#FFD700" />
                      <Text style={styles.premiumBadgeText}>Gold</Text>
                    </Pressable>
                  )}
                  {isPremium && (
                    <View style={[styles.premiumBadge, styles.premiumBadgeActive]}>
                      <Ionicons name="checkmark-circle" size={10} color="#4CAF50" />
                      <Text style={[styles.premiumBadgeText, { color: '#4CAF50' }]}>{t('matches.unlocked')}</Text>
                    </View>
                  )}
                </Animated.View>

                {!isPremium && (
                  <Animated.View entering={FadeIn.delay(120)} style={styles.likesYouHintBar}>
                    <Ionicons name="information-circle-outline" size={14} color="#FF2D78" />
                    <Text style={styles.likesYouHintText}>
                      {t('matches.likes_you_hint')}
                    </Text>
                  </Animated.View>
                )}

                <FlatList
                  horizontal
                  data={filteredLikesYou}
                  keyExtractor={item => item.uid}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.newMatchesRow}
                  renderItem={({ item, index }) => (
                    <LikesYouCard
                      profile={item}
                      index={index}
                      isPremium={isPremium}
                      isUnlocked={unlockedLikes.has(item.uid)}
                      onPressLocked={() => handleLikesYouPress(item)}
                    />
                  )}
                />
              </View>
            )}

            {/* ── Historias Entry Point ────────────────────────────────────── */}
            <View style={styles.section}>
               <Pressable 
                  style={styles.storiesEntry} 
                  onPress={() => router.push('/stories-feed' as any)}
               >
                  <LinearGradient 
                    colors={['rgba(255, 45, 120, 0.15)', 'rgba(255, 107, 53, 0.05)']} 
                    style={styles.storiesEntryGradient}
                  >
                     <View style={styles.storiesEntryIcon}>
                        <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.storiesIconCircle}>
                           <Ionicons name="play" size={20} color="#FFF" />
                        </LinearGradient>
                        <View style={styles.storiesLiveBadge} />
                     </View>
                     <View style={styles.storiesEntryText}>
                        <Text style={styles.storiesEntryTitle}>{t('matches.stories_title')}</Text>
                        <Text style={styles.storiesEntrySub}>{t('matches.stories_subtitle')}</Text>
                      </View><Pressable 
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push('/stories/create' as any);
                        }}
                        style={({ pressed }) => [styles.addStoryBtn, pressed && { opacity: 0.7 }]}
                      >
                        <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.addStoryIcon}>
                          <Ionicons name="add" size={18} color="#FFF" />
                        </LinearGradient>
                      </Pressable>
                      <Ionicons name="chevron-forward" size={20} color="#333" />
                  </LinearGradient>
               </Pressable>
            </View>


            {/* ── New Matches ─────────────────────────────────────────────── */}
            {newMatches.length > 0 && (
              <View style={styles.section}>
                <Animated.Text entering={FadeIn.delay(200)} style={styles.sectionTitle}>
                  {t('matches.new_matches')}
                </Animated.Text>
                <FlatList
                  horizontal
                  data={newMatches}
                  keyExtractor={item => item.matchId}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.newMatchesRow}
                  renderItem={({ item, index }) => (
                    <NewMatchCard match={item} index={index} />
                  )}
                />
              </View>
            )}

            {/* ── Conversations Header ───────────────────────────────────── */}
            {conversations.length > 0 && (
              <View style={styles.section}>
                <Animated.Text entering={FadeIn.delay(300)} style={styles.sectionTitle}>
                  {t('matches.messages')}
                </Animated.Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeIn.delay(500)} style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Text style={styles.emptyEmoji}>💫</Text>
              </View>
              <Text style={styles.emptyTitle}>{t('matches.empty.title')}</Text>
              <Text style={styles.emptySubtitle}>{t('matches.empty.subtitle')}</Text>
            </Animated.View>
          ) : (
            <View style={[styles.emptyState, { marginTop: 40 }]}>
              <ActivityIndicator color="#FF2D78" />
              <Text style={[styles.emptySubtitle, { marginTop: 10 }]}>{t('matches.loading')}</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#FF2D78"
            colors={['#FF2D78']}
          />
        }
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 90, // Approx height of ConversationItem
          offset: 90 * index,
          index,
        })}
      />


      {/* ── Ad Modal ──────────────────────────────────────────────────── */}
      <AdModal
        visible={adModalVisible}
        personName={pendingUnlockProfile?.name || '???'}
        onAdComplete={handleAdComplete}
        onCancel={handleAdCancel}
      />
    </ScreenContainer>
  );
}

const adStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.3)',
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  iconWrapper: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  nameHighlight: {
    color: '#FF2D78',
    fontWeight: '700',
  },
  watchingContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  adPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
  },
  adPlaceholderGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  adPlaceholderText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '600',
  },
  countdown: {
    color: '#FF2D78',
    fontSize: 28,
    fontWeight: '900',
  },
  watchBtn: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
  },
  watchBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  watchBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelText: {
    color: '#555',
    fontSize: 14,
  },
  premiumHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,215,0,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  premiumHintText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: {
    fontSize: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A8A8A',
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    marginBottom: 12,
  },
  premiumBadgeActive: {
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderColor: 'rgba(76,175,80,0.25)',
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  likesYouHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,45,120,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.2)',
  },
  likesYouHintText: {
    color: '#FF2D78',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  newMatchesRow: {
    paddingHorizontal: 20,
    gap: 16,
  },
  newMatchCard: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  newMatchPhotoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    position: 'relative',
    overflow: 'hidden',
  },
  newMatchPhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FF2D78',
  },
  lockOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  lockIconWrapper: {
    alignItems: 'center',
  },
  lockIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
    zIndex: 10,
  },
  watchAdHint: {
    color: '#FF2D78',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  newMatchBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMatchBadgeText: {
    fontSize: 12,
  },
  likesYouBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#161616',
    zIndex: 10,
  },
  newMatchName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  conversationPhotoWrapper: {
    position: 'relative',
  },
  conversationPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  conversationInfo: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  conversationTime: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#8A8A8A',
    lineHeight: 20,
  },
  conversationPreviewUnread: {
    color: '#DDD',
    fontWeight: '600',
  },
  groupAvatarGrid: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  groupAvatarItem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#000',
    position: 'absolute',
  },
  groupAvatar0: { top: 0, left: 0, zIndex: 3 },
  groupAvatar1: { top: 0, right: 0, zIndex: 2 },
  groupAvatar2: { bottom: 0, left: 13, zIndex: 1 },
  groupAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFD700',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  groupAvatarGridLarge: {
    width: 54,
    height: 54,
    position: 'relative',
  },
  groupAvatarItemLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    position: 'absolute',
  },
  groupAvatarLarge0: { top: 0, left: 0, zIndex: 3 },
  groupAvatarLarge1: { top: 0, right: 0, zIndex: 2 },
  groupAvatarLarge2: { bottom: 0, left: 11, zIndex: 1 },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 0px 10px rgba(255,45,120,0.5)' },
      default: { elevation: 5, shadowColor: '#FF2D78', shadowRadius: 5, shadowOpacity: 0.5 }
    })
  },
  conversationItemUnread: {
    backgroundColor: 'rgba(255,45,120,0.03)',
  },
  unreadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDotUnread: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF2D78',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mundiBadgeSmall: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#4FC3F7',
    zIndex: 10,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: 48,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  conversationsList: {
    gap: 8,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  superLikeLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4FC3F7',
    paddingVertical: 2,
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  superLikeLabelText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  storiesEntry: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: 10,
  },
  storiesEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  storiesEntryIcon: {
    position: 'relative',
  },
  storiesIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storiesLiveBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  addStoryBtn: {
    marginLeft: 'auto',
    marginRight: 10,
  },
  addStoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storiesEntryText: {
    flex: 1,
  },
  storiesEntryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  storiesEntrySub: {
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 2,
  },
});

