import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, StatusBar, TextInput, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StoryGroup, StoryItem } from './stories-carousel';
import { db } from '@/lib/firebase';
import {
  doc, updateDoc, arrayUnion, serverTimestamp,
  collection, addDoc, query, where, getDocs, limit, setDoc,
  onSnapshot, orderBy, deleteDoc
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerProps {
  visible: boolean;
  group: StoryGroup | null;
  user: any;
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ visible, group, user, onClose }) => {
  // 1. States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [ownerReplyText, setOwnerReplyText] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [insightType, setInsightType] = useState<'views' | 'likes'>('views');
  const [interactors, setInteractors] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 2. Derived Data (Safely accessed)
  const currentItem = group?.items?.[currentIndex];

  // 3. Handlers
  const handlePress = (evt: any) => {
    if (!group || showDeleteConfirm) return;
    const x = evt.nativeEvent.locationX;
    if (x < SCREEN_WIDTH / 3) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setProgress(0);
      }
    } else {
      if (currentIndex < group.items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  };

  const handleLike = async () => {
    if (!user || !currentItem) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newLiked = !isLiked;
    setIsLiked(newLiked);

    try {
      const storyRef = doc(db, 'stories', currentItem.id);
      if (newLiked) {
        await updateDoc(storyRef, {
          likes: arrayUnion(user.uid)
        });
        console.log("[Stories] Like saved successfully");
      }
    } catch (e) {
      console.error("Error liking story:", e);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user || !currentItem) return;

    const text = replyText.trim();
    setReplyText('');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const participants = [user.uid, currentItem.userId].sort();
      const matchId = participants.join('_');

      const matchesCol = collection(db, 'matches');
      const qMatch = query(matchesCol, where('participants', 'array-contains', user.uid), limit(100));
      const matchSnap = await getDocs(qMatch);

      let targetMatchId = matchId;
      const existingMatch = matchSnap.docs.find(d => {
        const p = d.data().participants || [];
        return p.includes(user.uid) && p.includes(currentItem.userId);
      });

      if (existingMatch) {
        targetMatchId = existingMatch.id;
      } else {
        await setDoc(doc(db, 'matches', matchId), {
          participants: [user.uid, currentItem.userId],
          lastMessage: `Respondió a tu historia: ${text}`,
          lastMessageTime: serverTimestamp(),
          timestamp: serverTimestamp(),
          isStoryReply: true
        });
      }

      await addDoc(collection(db, 'matches', targetMatchId, 'messages'), {
        text: text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        type: 'text',
        storyRef: currentItem.mediaUrl
      });

      await addDoc(collection(db, 'stories', currentItem.id, 'replies'), {
        text: text,
        senderId: user.uid,
        senderName: user.name,
        senderPhoto: user.photos?.[0] || '',
        ownerId: currentItem.userId, // Added for easier rule checking
        createdAt: serverTimestamp(),
        matchId: targetMatchId
      });

      console.log(`[Stories] Reply sent to match ${targetMatchId} and story ${currentItem.id}`);
      Alert.alert("¡Enviado!", "Tu respuesta ha sido enviada.");
    } catch (e) {
      console.error("Error replying to story:", e);
      Alert.alert("Error", "No se pudo enviar el mensaje.");
    }
  };

  const handleOwnerReplyBack = async (originalReply: any) => {
    if (!ownerReplyText.trim() || !user) return;
    
    const text = ownerReplyText.trim();
    setOwnerReplyText('');
    setActiveReplyId(null);

    try {
      await addDoc(collection(db, 'matches', originalReply.matchId, 'messages'), {
        text: text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        type: 'text'
      });
      
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("¡Enviado!", "Tu respuesta ha sido enviada al chat privado.");
    } catch (e) {
      console.error("Error replying back:", e);
    }
  };

  const handleDeleteStory = () => {
    setShowDeleteConfirm(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmDelete = async () => {
    if (!currentItem) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'stories', currentItem.id));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      onClose();
    } catch (e) {
      console.error("Error deleting story:", e);
      setIsDeleting(false);
      Alert.alert("Error", "No se pudo eliminar la historia.");
    }
  };

  const loadInteractors = async (type: 'views' | 'likes') => {
    if (!currentItem) return;
    setInsightType(type);
    setShowInsights(true);
    setInteractors([]);

    const uids = type === 'views' ? (currentItem.views || []) : (currentItem.likes || []);
    if (uids.length === 0) return;

    try {
      const profiles: any[] = [];
      for (let i = 0; i < uids.length; i += 10) {
        const chunk = uids.slice(i, i + 10);
        const q = query(collection(db, 'profiles'), where('uid', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(d => profiles.push(d.data()));
      }
      setInteractors(profiles);
    } catch (e) {
      console.error("Error loading interactors:", e);
    }
  };

  // 4. Hooks (ALWAYS called in the same order)
  useEffect(() => {
    if (!visible || !group || showDeleteConfirm) {
      if (!showDeleteConfirm) {
        setCurrentIndex(0);
        setProgress(0);
      }
      return;
    }

    const duration = 15000;
    const interval = 50;
    const step = interval / duration;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 1) {
          if (currentIndex < group.items.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 1;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [visible, group, currentIndex]);

  useEffect(() => {
    if (visible && group && user && currentItem) {
      const storyId = currentItem.id;
      const markAsSeen = async () => {
        try {
          const storyRef = doc(db, 'stories', storyId);
          await updateDoc(storyRef, {
            views: arrayUnion(user.uid)
          });
        } catch (e) {
          console.warn("Error marking story as seen:", e);
        }
      };
      markAsSeen();
      
      const currentLikes = currentItem.likes || [];
      setIsLiked(currentLikes.includes(user.uid));
    }
  }, [visible, currentIndex, group?.id, user?.uid]);

  useEffect(() => {
    if (visible && group && user && currentItem && currentItem.userId === user.uid) {
      const repliesRef = collection(db, 'stories', currentItem.id, 'replies');
      const q = query(repliesRef, orderBy('createdAt', 'desc'), limit(50));
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReplies(list);
      });
      return () => unsubscribe();
    } else {
      setReplies([]);
    }
  }, [visible, currentItem?.id, user?.uid]);

  // 5. Final validation before render (Must be after ALL hooks)
  if (!visible || !group || !currentItem) {
    return null;
  }

  // 6. Render
  return (
    <Modal visible={visible} transparent animationType="fade">
      <StatusBar hidden />
      <View style={styles.container}>
        <Pressable style={styles.pressArea} onPress={handlePress}>
          {/* Fondo desenfocado para evitar franjas negras */}
          <Image
            source={{ uri: currentItem.mediaUrl }}
            style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
            contentFit="cover"
            blurRadius={20}
          />
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

          {/* Imagen real en modo contain para verla completa */}
          <Image
            source={{ uri: currentItem.mediaUrl }}
            style={styles.media}
            contentFit="contain"
          />
        </Pressable>

        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={styles.topGradient}
        />

        <View style={styles.progressContainer}>
          {group.items.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: index < currentIndex ? '100%' : index === currentIndex ? `${progress * 100}%` : '0%'
                  }
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          <View style={styles.uploaderInfo}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: group.avatar }} style={styles.groupAvatar} />
              {group.isTeam && (
                <View style={styles.attributionAvatarContainer}>
                  <Image source={{ uri: currentItem.userPhoto }} style={styles.attributionAvatar} />
                </View>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.isTeam && (
                <Text style={styles.attributionText}>Subido por {currentItem.userName}</Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {currentItem.userId === user?.uid && (
              <Pressable onPress={handleDeleteStory} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={24} color="#FFF" />
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFF" />
            </Pressable>
          </View>
        </View>

        <BlurView intensity={20} tint="dark" style={styles.footer}>
          {currentItem.userId === user?.uid ? (
            <View style={styles.ownerFooterContainer}>
              <View style={styles.ownerTopRow}>
                <Pressable style={styles.ownerStat} onPress={() => loadInteractors('views')}>
                  <Ionicons name="eye-outline" size={18} color="#FFF" />
                  <Text style={styles.ownerStatText}>{currentItem.views?.length || 0}</Text>
                </Pressable>
                <Pressable style={styles.ownerStat} onPress={() => loadInteractors('likes')}>
                  <Ionicons name="heart" size={18} color="#FF2D78" />
                  <Text style={styles.ownerStatText}>{currentItem.likes?.length || 0}</Text>
                </Pressable>
                <Text style={styles.repliesCount}>{replies.length} respuestas</Text>
              </View>

              {replies.length > 0 && (
                <View style={styles.repliesList}>
                  {replies.map((rep) => (
                    <View key={rep.id} style={styles.replyCard}>
                      <View style={styles.replyHeader}>
                        <Image source={{ uri: rep.senderPhoto }} style={styles.replyAvatar} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.replySenderName}>{rep.senderName}</Text>
                          <Text style={styles.replyText}>{rep.text}</Text>
                        </View>
                        <Pressable 
                          onPress={() => setActiveReplyId(activeReplyId === rep.id ? null : rep.id)}
                          style={styles.replyBackButton}
                        >
                          <Text style={styles.replyBackText}>Responder</Text>
                        </Pressable>
                      </View>
                      
                      {activeReplyId === rep.id && (
                        <View style={styles.replyInputWrapper}>
                          <TextInput
                            style={styles.ownerReplyInput}
                            placeholder={`Responder a ${rep.senderName}...`}
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={ownerReplyText}
                            onChangeText={setOwnerReplyText}
                            onSubmitEditing={() => handleOwnerReplyBack(rep)}
                            autoFocus
                          />
                          <Pressable onPress={() => handleOwnerReplyBack(rep)}>
                            <Ionicons name="send" size={20} color="#FF2D78" />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.replyInputContainer}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Enviar mensaje..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={replyText}
                  onChangeText={setReplyText}
                  onSubmitEditing={handleReply}
                  returnKeyType="send"
                />
              </View>
              <Pressable style={styles.footerIcon} onPress={handleLike}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={30} 
                  color={isLiked ? "#FF2D78" : "#FFF"} 
                />
              </Pressable>
            </>
          )}
        </BlurView>

        {/* Insights Overlay */}
        {showInsights && (
          <BlurView intensity={90} tint="dark" style={styles.insightsOverlay}>
            <View style={styles.insightsHeader}>
              <Text style={styles.insightsTitle}>
                {insightType === 'views' ? 'Visto por' : 'Le gusta a'}
              </Text>
              <Pressable onPress={() => setShowInsights(false)} style={styles.closeInsights}>
                <Ionicons name="close" size={24} color="#FFF" />
              </Pressable>
            </View>
            
            <View style={styles.interactorsList}>
              {interactors.length === 0 ? (
                <Text style={styles.emptyInteractors}>
                  {insightType === 'views' ? 'Nadie ha visto esto aún' : 'Nadie le ha dado me gusta aún'}
                </Text>
              ) : (
                interactors.map((p) => (
                  <View key={p.uid} style={styles.interactorCard}>
                    <Image source={{ uri: p.photos?.[0] }} style={styles.interactorAvatar} />
                    <Text style={styles.interactorName}>{p.name}</Text>
                    {insightType === 'likes' && <Ionicons name="heart" size={16} color="#FF2D78" />}
                  </View>
                ))
              )}
            </View>
          </BlurView>
        )}

        {/* Custom Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <BlurView intensity={80} tint="dark" style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconBg}>
                <Ionicons name="trash" size={32} color="#FF2D78" />
              </View>
              <Text style={styles.confirmTitle}>¿Eliminar historia?</Text>
              <Text style={styles.confirmSubtitle}>
                Esta acción es permanente y no se podrá recuperar.
              </Text>
              
              <View style={styles.confirmActions}>
                <Pressable 
                  style={[styles.confirmBtn, styles.cancelBtn]} 
                  onPress={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.confirmBtn, styles.deleteConfirmBtn]} 
                  onPress={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Text style={styles.deleteBtnText}>Borrando...</Text>
                  ) : (
                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </BlurView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  pressArea: {
    flex: 1,
  },
  media: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
  },
  header: {
    position: 'absolute',
    top: 65,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  attributionAvatarContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    padding: 1,
  },
  attributionAvatar: {
    flex: 1,
    borderRadius: 9,
  },
  headerText: {
    gap: 1,
  },
  groupName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  attributionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 45, 120, 0.4)',
    borderRadius: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  replyInputContainer: {
    flex: 1,
  },
  replyInput: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    color: '#FFF',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerFooterContainer: {
    flex: 1,
    paddingTop: 5,
  },
  ownerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 10,
  },
  ownerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerStatText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  repliesCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  repliesList: {
    maxHeight: 200,
    gap: 12,
  },
  replyCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 10,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replySenderName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
  },
  replyText: {
    color: '#FFF',
    fontSize: 13,
  },
  replyBackButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  replyBackText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  replyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  ownerReplyInput: {
    flex: 1,
    height: 36,
    color: '#FFF',
    fontSize: 13,
  },
  insightsOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  insightsTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeInsights: {
    padding: 5,
  },
  interactorsList: {
    gap: 12,
  },
  interactorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 15,
  },
  interactorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  interactorName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  emptyInteractors: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmCard: {
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  confirmIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 15,
  },
  confirmBtn: {
    flex: 1,
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteConfirmBtn: {
    backgroundColor: '#FF2D78',
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
