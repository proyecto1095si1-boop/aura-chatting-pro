import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Platform,
  Share,
  Clipboard
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ScreenContainer } from '@/components/screen-container';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { getSafeSource } from '@/lib/image-utils';

export default function DoubleDateSetup() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [pendingInvite, setPendingInvite] = useState<any>(null);

  // Fetch partner details if linked
  useEffect(() => {
    if (user?.doubleDate?.partnerId) {
      const fetchPartner = async () => {
        const pDoc = await getDoc(doc(db, 'profiles', user.doubleDate!.partnerId!));
        if (pDoc.exists()) {
          setPartner({ uid: pDoc.id, ...pDoc.data() });
        }
      };
      fetchPartner();
    } else {
      setPartner(null);
    }
  }, [user?.doubleDate?.partnerId]);

  // Listen for pending invites
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'double_date_invites'),
      where('to', '==', user.uid),
      where('status', '==', 'pending'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPendingInvite({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setPendingInvite(null);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // Listen for invitations SENT by me that get accepted
  useEffect(() => {
    if (!user?.uid || user?.doubleDate?.status !== 'pending_sent') return;

    const q = query(
      collection(db, 'double_date_invites'),
      where('from', '==', user.uid),
      where('status', '==', 'accepted'),
      limit(1)
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const inviteData = snap.docs[0].data();
        try {
          // A updates THEMSELVES (this works because of rules)
          await updateProfile({
            doubleDate: {
              partnerId: inviteData.to,
              status: 'linked',
              modeActive: true
            }
          });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t('double_date.linked'), t('double_date.friend_accepted', 'Your friend accepted the invitation! You are now linked.'));
        } catch (e) {
          console.error("Error auto-linking sender:", e);
        }
      }
    });

    return () => unsub();
  }, [user?.uid, user?.doubleDate?.status]);

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;
    setLoading(true);
    try {
      // 1. Check if it's a direct UID search (UIDs are typically 20+ chars)
      if (searchQuery.length > 20) {
        const directDoc = await getDoc(doc(db, 'profiles', searchQuery.trim()));
        if (directDoc.exists()) {
          setSearchResults([{ uid: directDoc.id, ...directDoc.data() }]);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to name search
      const q = query(
        collection(db, 'profiles'),
        where('name', '>=', searchQuery),
        where('name', '<=', searchQuery + '\uf8ff'),
        limit(15)
      );
      const snap = await getDocs(q);
      const results = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(p => p.uid !== user?.uid);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (friend: any) => {
    if (!user) return;
    
    // Check if I already have a partner or a pending invite
    if (user.doubleDate?.status === 'linked') {
      Alert.alert(t('double_date.already_linked', 'You already have a team'), t('double_date.unlink_first', 'You must unlink before inviting someone else.'));
      return;
    }

    try {
      setLoading(true);
      
      // Check if friend already has a team
      const friendDoc = await getDoc(doc(db, 'profiles', friend.uid));
      if (friendDoc.exists() && friendDoc.data().doubleDate?.status === 'linked') {
        Alert.alert(t('double_date.unavailable', 'User unavailable'), t('double_date.friend_linked', '{{name}} already has a team formed.', { name: friend.name }));
        return;
      }

      await addDoc(collection(db, 'double_date_invites'), {
        from: user.uid,
        to: friend.uid,
        fromName: user.name,
        fromPhoto: user.photos?.[0] || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await updateProfile({
        doubleDate: {
          partnerId: friend.uid,
          status: 'pending_sent',
          modeActive: false
        }
      });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('double_date.invite_sent'), t('double_date.invite_sent_to', 'An invitation has been sent to {{name}}', { name: friend.name }));
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error("Invite error:", error);
      Alert.alert(t('common.error'), t('double_date.invite_error', 'Could not send the invitation.'));
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!user || !pendingInvite) return;

    try {
      setLoading(true);
      const inviteRef = doc(db, 'double_date_invites', pendingInvite.id);
      await updateDoc(inviteRef, { 
        status: 'accepted',
        respondedAt: serverTimestamp()
      });

      // Update only my profile (B updates B)
      await updateProfile({
        doubleDate: {
          partnerId: pendingInvite.from,
          status: 'linked',
          modeActive: true
        }
      });

      // We DON'T update the partner profile directly here anymore 
      // because of Firebase permission rules. 
      // The partner's own listener (added above) will handle it.

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('double_date.linked'), t('double_date.now_linked', 'You are now linked! Now you can search for couples together.'));
    } catch (error) {
      console.error("Accept error:", error);
      Alert.alert(t('common.error'), t('double_date.accept_error', 'Could not accept the invitation.'));
    } finally {
      setLoading(false);
    }
  };

  const rejectInvite = async () => {
    if (!user || !pendingInvite) return;
    try {
      setLoading(true);
      const inviteRef = doc(db, 'double_date_invites', pendingInvite.id);
      await updateDoc(inviteRef, { 
        status: 'rejected',
        respondedAt: serverTimestamp()
      });
      setPendingInvite(null);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Reject error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      t('double_date.unlink'),
      t('double_date.unlink_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('double_date.unlink'), 
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              const partnerId = user.doubleDate?.partnerId;
              
              // Update me
              await updateProfile({
                doubleDate: {
                  partnerId: null,
                  status: 'none',
                  modeActive: false
                }
              });

              // Update partner if exists
              if (partnerId) {
                const partnerRef = doc(db, 'profiles', partnerId);
                await updateDoc(partnerRef, {
                  'doubleDate.partnerId': null,
                  'doubleDate.status': 'none',
                  'doubleDate.modeActive': false
                });
              }

              setPartner(null);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
              console.error("Unlink error:", error);
            }
          }
        }
      ]
    );
  };

  const toggleMode = async () => {
    if (!user?.doubleDate) return;
    const newMode = !user.doubleDate.modeActive;
    await updateProfile({
      'doubleDate.modeActive': newMode
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCopyId = () => {
    if (!user?.uid) return;
    Clipboard.setString(user.uid);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('double_date.copied_title', 'Copied'), t('double_date.copied_body', 'Your friend ID has been copied to the clipboard. Send it to your friend so they can find you easily.'));
  };

  const handleShareInvite = async () => {
    if (!user) return;
    try {
      const message = t('double_date.share_message', 'Hello! Let\'s link our Aura profiles to have double dates. 👥\n\nFind me with my friend ID:\n{{id}}', { id: user.uid });
      await Share.share({
        message,
        title: t('double_date.invite_title', 'Invite to Double Date'),
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('double_date.setup_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Status Section */}
        {user?.doubleDate?.status === 'linked' && partner ? (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.linkedCard}>
            <Text style={styles.sectionTitle}>{t('double_date.linked')}</Text>
            <View style={styles.teamContainer}>
              <View style={styles.avatarWrapper}>
                <Image source={getSafeSource(user.photos?.[0])} style={styles.avatar} />
                <View style={styles.linkIconWrapper}>
                  <Text style={styles.linkIcon}>🔗</Text>
                </View>
                <Image source={getSafeSource(partner.photos?.[0])} style={styles.avatar} />
              </View>
              <Text style={styles.teamName}>{user.name} & {partner.name}</Text>
            </View>

            <View style={styles.controls}>
              <View style={styles.controlRow}>
                <View>
                  <Text style={styles.controlTitle}>{t('double_date.mode_toggle')}</Text>
                  <Text style={styles.controlDesc}>{t('double_date.mode_desc', 'Appear in searches for couples')}</Text>
                </View>
                <Pressable 
                  onPress={toggleMode}
                  style={[styles.toggle, user.doubleDate.modeActive && styles.toggleActive]}
                >
                  <View style={[styles.toggleThumb, user.doubleDate.modeActive && styles.toggleThumbActive]} />
                </Pressable>
              </View>

              <Pressable onPress={handleUnlink} style={styles.unlinkBtn}>
                <Text style={styles.unlinkText}>{t('double_date.unlink')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : pendingInvite ? (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>{t('double_date.invite_received_title')}</Text>
            <Image source={getSafeSource(pendingInvite.fromPhoto)} style={styles.inviteAvatar} />
            <Text style={styles.inviteText}>
              {t('double_date.invite_received_body', { name: pendingInvite.fromName })}
            </Text>
            <View style={styles.inviteActions}>
              <Pressable onPress={acceptInvite} style={styles.acceptBtn}>
                <Text style={styles.acceptText}>{t('double_date.accept')}</Text>
              </Pressable>
              <Pressable onPress={rejectInvite} style={styles.rejectBtn}>
                <Text style={styles.rejectText}>{t('double_date.reject')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : user?.doubleDate?.status === 'pending_sent' ? (
          <Animated.View entering={FadeIn.duration(600)} style={styles.pendingCard}>
            <ActivityIndicator color="#FFD700" style={{ marginBottom: 16 }} />
            <Text style={styles.pendingText}>{t('double_date.invite_sent')}</Text>
            <Text style={styles.pendingSubtext}>{t('double_date.waiting_accept', 'Waiting for your friend to accept...')}</Text>
            <Pressable onPress={handleUnlink} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.searchSection}>
            <Text style={styles.setupSubtitle}>{t('double_date.setup_subtitle')}</Text>
            
            <View style={styles.searchBar}>
              <TextInput
                style={styles.input}
                placeholder={t('double_date.search_placeholder')}
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
              />
              <Pressable onPress={handleSearch} style={styles.searchBtn}>
                <Ionicons name="search" size={20} color="#8A8A8A" />
              </Pressable>
            </View>

            {/* My ID Section */}
            <View style={styles.myIdContainer}>
               <View style={styles.myIdInfo}>
                  <Text style={styles.myIdLabel}>{t('double_date.my_id', 'My Friend ID:')}</Text>
                  <Text style={styles.myIdValue} numberOfLines={1}>{user?.uid}</Text>
               </View>
               <View style={styles.myIdActions}>
                  <Pressable onPress={handleCopyId} style={styles.myIdBtn}>
                    <Ionicons name="copy-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.myIdBtnText}>{t('common.copy', 'Copy')}</Text>
                  </Pressable>
                  <Pressable onPress={handleShareInvite} style={[styles.myIdBtn, { backgroundColor: '#FFD700' }]}>
                    <Ionicons name="share-social-outline" size={16} color="#000" style={{ marginRight: 6 }} />
                    <Text style={[styles.myIdBtnText, { color: '#000' }]}>{t('common.share', 'Share')}</Text>
                  </Pressable>
               </View>
            </View>

            {loading ? (
              <ActivityIndicator color="#FF2D78" style={{ marginTop: 40 }} />
            ) : searchResults.length > 0 ? (
              <View style={styles.resultsList}>
                {searchResults.map((item) => (
                  <View key={item.uid} style={styles.resultItem}>
                    <Image source={getSafeSource(item.photos?.[0])} style={styles.resultAvatar} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{item.name}, {item.age}</Text>
                      <Text style={styles.resultId}>ID: {item.uid.substring(0, 8)}...</Text>
                    </View>
                    <Pressable onPress={() => sendInvite(item)} style={styles.inviteItemBtn}>
                      <Text style={styles.inviteItemText}>{t('double_date.invite_btn')}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : searchQuery.length > 0 && !loading && (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyText}>{t('double_date.no_results', 'No results found')}</Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 24,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  linkedCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 24,
  },
  teamContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#161616',
  },
  linkIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -15,
    zIndex: 10,
  },
  linkIcon: {
    fontSize: 18,
  },
  teamName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  controls: {
    width: '100%',
    gap: 20,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 16,
  },
  controlTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  controlDesc: {
    color: '#8A8A8A',
    fontSize: 12,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#FFD700',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  unlinkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  unlinkText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FF2D78',
    alignItems: 'center',
  },
  inviteTitle: {
    color: '#FF2D78',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },
  inviteAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  inviteText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#FF2D78',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFF',
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectText: {
    color: '#FFF',
    fontWeight: '700',
  },
  pendingCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  pendingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  pendingSubtext: {
    color: '#8A8A8A',
    fontSize: 14,
    marginBottom: 24,
  },
  cancelBtn: {
    padding: 10,
  },
  cancelText: {
    color: '#8A8A8A',
    fontWeight: '600',
  },
  searchSection: {
    gap: 20,
  },
  setupSubtitle: {
    color: '#8A8A8A',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    flex: 1,
    height: 54,
    color: '#FFF',
    fontSize: 16,
  },
  searchBtn: {
    padding: 8,
  },
  searchIcon: {
    fontSize: 20,
  },
  resultsList: {
    gap: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  resultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultId: {
    color: '#666',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inviteItemBtn: {
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inviteItemText: {
    color: '#FF2D78',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyResults: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#666',
  },
  myIdContainer: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  myIdInfo: {
    gap: 4,
  },
  myIdLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  myIdValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  myIdActions: {
    flexDirection: 'row',
    gap: 8,
  },
  myIdBtn: {
    flex: 1,
    backgroundColor: '#333',
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myIdBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  }
});
