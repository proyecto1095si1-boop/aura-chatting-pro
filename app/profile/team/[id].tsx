import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Alert, Platform, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, UserProfile } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { SmartImage } from '@/components/smart-image';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const SCREEN_WIDTH = IS_WEB ? Math.min(WINDOW_WIDTH, 500) : WINDOW_WIDTH;

export default function DoubleProfileDetailScreen() {
  const { id, u1, u2 } = useLocalSearchParams<{ id: string; u1: string; u2: string }>();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  
  const [profile1, setProfile1] = useState<UserProfile | null>(null);
  const [profile2, setProfile2] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!u1 || !u2) return;

    const fetchProfiles = async () => {
      try {
        const [d1, d2] = await Promise.all([
          getDoc(doc(db, 'profiles', u1)),
          getDoc(doc(db, 'profiles', u2))
        ]);

        if (d1.exists()) {
          const p1 = { uid: d1.id, ...d1.data() } as UserProfile;
          setProfile1(p1);
          if (p1.photos && p1.photos.length > 0 && !IS_WEB) {
             p1.photos.forEach(ph => Image.prefetch(ph));
          }
        }
        if (d2.exists()) {
          const p2 = { uid: d2.id, ...d2.data() } as UserProfile;
          setProfile2(p2);
          if (p2.photos && p2.photos.length > 0 && !IS_WEB) {
             p2.photos.forEach(ph => Image.prefetch(ph));
          }
        }
      } catch (error) {
        console.error("Error fetching double profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [u1, u2]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#FF2D78" size="large" />
      </View>
    );
  }

  if (!profile1 || !profile2) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF' }}>{t('profile_detail.profiles_not_found')}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#FF2D78' }}>{t('profile_detail.go_back')}</Text>
        </Pressable>
      </View>
    );
  }

  const ProfileSection = ({ profile, color }: { profile: UserProfile; color: string }) => {
    const [photoIndex, setPhotoIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onScroll = (event: any) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40)); // 40 is padding
      if (index !== photoIndex) setPhotoIndex(index);
    };

    const scrollToPhoto = (index: number) => {
      if (flatListRef.current && profile.photos && index >= 0 && index < profile.photos.length) {
        flatListRef.current.scrollToIndex({ index, animated: true });
        setPhotoIndex(index);
      }
    };

    const handlePhotoTap = (event: any) => {
      const x = event.nativeEvent.locationX;
      const isRight = x > (SCREEN_WIDTH - 40) / 2;
      
      if (isRight) {
        if (photoIndex < (profile.photos?.length || 1) - 1) {
          scrollToPhoto(photoIndex + 1);
        }
      } else {
        if (photoIndex > 0) {
          scrollToPhoto(photoIndex - 1);
        }
      }
    };

    return (
      <View style={styles.profileCard}>
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
                style={[styles.photo, { width: SCREEN_WIDTH - 42 }]}
                contentFit="cover"
                cachePolicy="disk"
                transition={300}
              />
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH - 42,
              offset: (SCREEN_WIDTH - 42) * index,
              index,
            })}
          />
          </Pressable>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.photoGradient}
            pointerEvents="none"
          />
          
          {/* Photo Dots */}
          {profile.photos && profile.photos.length > 1 && (
            <View style={styles.photoDots}>
              {profile.photos.map((_, i) => (
                <View key={i} style={[styles.photoDot, i === photoIndex && { backgroundColor: color, width: 20 }]} />
              ))}
            </View>
          )}

          <View style={styles.photoInfo}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            {profile.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: color }]}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailsContainer}>
          {profile.bio && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color }]}>{t('profile.about')} {profile.name}</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color }]}>{t('profile.interests')}</Text>
              <View style={styles.chips}>
                {profile.interests.map(interest => (
                  <View key={interest} style={styles.chip}>
                    <Text style={styles.chipText}>{t(`common.interests.${interest}`)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Lifestyle Info */}
          {(profile.zodiac || profile.smokes || profile.drinks || profile.height) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color }]}>{t('profile.lifestyle', 'Estilo de Vida')}</Text>
              <View style={styles.chips}>
                {profile.height && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>📏 {profile.height} cm</Text>
                  </View>
                )}
                {profile.zodiac && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>✨ {t(`common.lifestyle.zodiac.${profile.zodiac.toLowerCase()}`)}</Text>
                  </View>
                )}
                {profile.smokes && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>🚬 {t(`common.lifestyle.smoking.${profile.smokes}`)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Prompts */}
          {profile.prompts && profile.prompts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color }]}>{t('profile.more_about', 'Más sobre')} {profile.name}</Text>
              {profile.prompts.map((p, i) => (
                <View key={i} style={styles.promptBox}>
                  <Text style={styles.promptQuestion}>{t(`prompts.${p.id}`)}</Text>
                  <Text style={styles.promptAnswer}>{p.answer}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleLike = async () => {
    if (!currentUser || !profile1 || !profile2) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const isMeTeam = currentUser?.doubleDate?.status === 'linked';
    const fromId = isMeTeam ? [currentUser.uid, currentUser.doubleDate?.partnerId].sort().join('_') : currentUser.uid;
    const targetTeamId = [profile1.uid, profile2.uid].sort().join('_');

    try {
      const swipeId = `${fromId}___${targetTeamId}`;
      const collectionName = isMeTeam ? 'double_swipes' : 'swipes';

      await setDoc(doc(db, collectionName, swipeId), {
        from: fromId,
        fromTeam: isMeTeam ? [currentUser.uid, currentUser.doubleDate?.partnerId] : [currentUser.uid],
        to: targetTeamId,
        toTeam: [profile1.uid, profile2.uid],
        type: 'like',
        timestamp: serverTimestamp()
      });

      // Check reverse match
      const reverseId = `${targetTeamId}___${fromId}`;
      const reverseDoc = await getDoc(doc(db, isMeTeam ? 'double_swipes' : 'swipes', reverseId));
      
      if (reverseDoc.exists() && reverseDoc.data()?.type === 'like') {
        const matchId = `group_${[fromId, targetTeamId].sort().join('_')}`;
        await setDoc(doc(db, 'matches', matchId), {
          participants: isMeTeam 
            ? [currentUser.uid, currentUser.doubleDate?.partnerId, profile1.uid, profile2.uid].filter(Boolean)
            : [currentUser.uid, profile1.uid, profile2.uid],
          isDoubleDate: true,
          timestamp: serverTimestamp(),
          lastMessage: isMeTeam ? t('profile_detail.double_match_message') : t('profile_detail.team_match_message', { name1: profile1.name, name2: profile2.name }),
          lastMessageTime: serverTimestamp(),
          messageCount: 0
        });
        
        if (Platform.OS === 'web') {
           window.alert(t('discover.match.title'));
           router.replace(`/chat/${matchId}` as any);
        } else {
           Alert.alert(t('discover.match.title'), t('profile_detail.team_match_alert_message', { extra: isMeTeam ? t('profile_detail.and_your_partner') : '', name1: profile1.name, name2: profile2.name }), [
              { text: t('discover.match.continue'), onPress: () => router.back(), style: "cancel" },
              { text: t('discover.match.send_message'), onPress: () => router.replace(`/chat/${matchId}` as any) }
           ]);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(t('profile_detail.interest_sent'));
        } else {
          Alert.alert(t('profile_detail.interest_sent'), t('profile_detail.interest_sent_message'));
        }
        router.back();
      }
    } catch (e) {
      console.error("Error Like Team Detail:", e);
      router.back();
    }
  };

  const handleDislike = async () => {
    if (!currentUser || !profile1 || !profile2) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const myTeamId = [currentUser.uid, currentUser.doubleDate?.partnerId].sort().join('_');
    const targetTeamId = [profile1.uid, profile2.uid].sort().join('_');

    try {
      const swipeId = `${myTeamId}___${targetTeamId}`;
      await setDoc(doc(db, 'double_swipes', swipeId), {
        fromTeam: [currentUser.uid, currentUser.doubleDate?.partnerId].filter(Boolean),
        toTeam: [profile1.uid, profile2.uid],
        type: 'dislike',
        timestamp: serverTimestamp()
      });
      router.back();
    } catch (e) {
      console.error("Error Double Dislike Detail:", e);
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainWrapper}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('profile_detail.ideal_couple')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.teamHeader}>
          <LinearGradient
            colors={['#FF2D78', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.teamBadge}
          >
            <Ionicons name="people" size={16} color="#FFF" />
            <Text style={styles.teamBadgeText}>{t('profile_detail.double_mode')}</Text>
          </LinearGradient>
          <Text style={styles.teamSubtitle}>{t('profile_detail.meet_names', { name1: profile1.name, name2: profile2.name })}</Text>
        </View>

        <ProfileSection profile={profile1} color="#FF2D78" />
        <View style={styles.connector}>
          <View style={styles.connectorLine} />
          <View style={styles.connectorCircle}>
            <Ionicons name="heart" size={20} color="#FF2D78" />
          </View>
          <View style={styles.connectorLine} />
        </View>
        <ProfileSection profile={profile2} color="#FF6B35" />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)', '#000']} style={styles.actionBar}>
        <Pressable 
          style={styles.actionBtn} 
          onPress={handleDislike}
        >
          <View style={[styles.btnCircle, { backgroundColor: '#333' }]}>
            <Ionicons name="close" size={30} color="#FFF" />
          </View>
        </Pressable>

        <Pressable 
          style={styles.actionBtn}
          onPress={handleLike}
        >
          <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.btnCircleLarge}>
            <Ionicons name="heart" size={40} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </LinearGradient>
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
    backgroundColor: '#000',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20,
  },
  teamHeader: {
    alignItems: 'center',
    marginBottom: 30,
    gap: 12,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  teamBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  teamSubtitle: {
    color: '#8A8A8A',
    fontSize: 16,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#111',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  photoContainer: {
    height: 350,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  photoDots: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 10,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bioText: {
    color: '#AAA',
    fontSize: 15,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  promptBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  promptQuestion: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  promptAnswer: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  connector: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#222',
  },
  connectorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 20,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 5px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
      }
    })
  },
  btnCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 8px 10px rgba(255, 45, 120, 0.4)' },
      default: {
        shadowColor: '#FF2D78',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
      }
    })
  },
});
