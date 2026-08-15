import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform, Modal, RefreshControl, ActivityIndicator, Keyboard
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Message, Profile } from '@/lib/mock-data';
import { useAuth, UserProfile } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { uploadToFirebaseStorage, deleteFromFirebaseStorage } from '@/lib/storage-service';
import { db, storage } from '@/lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  serverTimestamp, doc, getDoc, updateDoc, writeBatch, where,
  limit, setDoc, increment
} from 'firebase/firestore';
import { Alert } from 'react-native';

import { useTranslation } from 'react-i18next';

import Animated, { FadeInUp, FadeIn, Layout, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { ReportModal } from '@/components/ReportModal';
import { MessageReactions } from '@/components/message-reactions';
import { EmojiPicker } from '@/components/emoji-picker';
import { SmartImage } from '@/components/smart-image';
import { getProfiles } from '@/lib/profile-service';
import { getSafeSource } from '@/lib/image-utils';


// Helper for Image CDN Optimization
const getOptimizedUrl = (url: string, width = 400, height = 600) => {
  if (!url || typeof url !== 'string') return 'https://via.placeholder.com/400x600?text=Sin+Foto';
  return url;
};

export default function ChatDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { limits } = useSubscription();
  const [matchProfile, setMatchProfile] = useState<UserProfile | null>(null);
  const [isInternational, setIsInternational] = useState(false);
  const [isSupportChat, setIsSupportChat] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLimit, setMessagesLimit] = useState(30);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoConsent, setPhotoConsent] = useState<Record<string, boolean>>({});
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<any>(null);
  const [ephemeralTimer, setEphemeralTimer] = useState<number>(7);
  const [refreshing, setRefreshing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Admin Observer State
  const [isAdminObserver, setIsAdminObserver] = useState(false);
  const [participantsProfiles, setParticipantsProfiles] = useState<Record<string, UserProfile>>({});
  const observerRef = useRef(false);
  const [bannedWordsList, setBannedWordsList] = useState<string[]>([]);

  const [isDoubleDate, setIsDoubleDate] = useState(false);

  const timerRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Real-time listener already handles data, this is for UX confidence
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleScroll = React.useCallback((event: any) => {
    if (Platform.OS !== 'web') return;
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y <= 10) {
      if (messages.length >= messagesLimit) {
        setMessagesLimit(prev => prev + 30);
      }
    }
  }, [messages.length, messagesLimit]);

  // Web Scroll to bottom on new messages or typing status changes
  useEffect(() => {
    if (Platform.OS === 'web' && messages.length > 0) {
      const scrollTimer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(scrollTimer);
    }
  }, [messages.length, isTyping]);

  // Progressive Loading Optimization
  useEffect(() => {
    if (!matchId || !user?.uid) return;

    // 1. Start messages listener IMMEDIATELY with descending order for inverted list pagination
    const messagesQuery = query(
      collection(db, 'matches', matchId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(messagesLimit)
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      // Usamos docChanges para ver si realmente hay cambios que requieran un re-render pesado
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate() || new Date();
        return {
          id: doc.id,
          ...data,
          displayTime: date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
          sortTimestamp: data.createdAt?.toDate()?.getTime() || Date.now()
        };
      });

      // Ordenar cronológicamente ascendente de forma local para evitar saltos en local writes
      msgs.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

      setMessages(msgs);
      setLoading(false);
      
      // Update "seen" status
      if (!observerRef.current) {
        let hasUnread = false;
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (data.senderId !== user.uid && !data.seen) {
            batch.update(d.ref, { seen: true });
            hasUnread = true;
          }
        });
        if (hasUnread) {
          updateDoc(doc(db, 'matches', matchId), { unreadCount: 0 }).catch(() => {});
        }
        batch.commit().catch(() => {});
      }
    });

    // 2. Load metadata (Profile, Settings) in parallel
    const loadMetadata = async () => {
      try {
        const matchRef = doc(db, 'matches', matchId);
        
        // Parallel fetch for initial speed
        const [matchSnap, settingsSnap] = await Promise.all([
          getDoc(matchRef),
          getDoc(doc(db, 'system_settings', 'core'))
        ]);

        if (settingsSnap.exists() && settingsSnap.data().bannedWords) {
          setBannedWordsList(settingsSnap.data().bannedWords);
        }

        if (matchSnap.exists()) {
          const matchData = matchSnap.data();
          if (matchData.blocked || matchData.status === 'blocked') {
            router.replace('/(tabs)/matches' as any);
            return;
          }

          const participants = matchData.participants as string[];
          const isObserver = !participants.includes(user.uid) && user.role === 'admin';
          setIsAdminObserver(isObserver);
          observerRef.current = isObserver;

          setIsDoubleDate(matchData.isDoubleDate || false);
          if (matchData.isDoubleDate) {
            const otherIds = participants.filter(id => id !== user.uid);
            const profilesMap = await getProfiles(otherIds);
            setParticipantsProfiles(profilesMap);
            // Use the first other profile as the main "matchProfile" for general logic
            setMatchProfile(Object.values(profilesMap)[0] || null);
          } else if (isObserver) {
            const profilesMap = await getProfiles(participants);
            setParticipantsProfiles(profilesMap);
            setMatchProfile({ uid: 'admin_observer', name: 'Auditoría', photos: [], role: 'admin' } as any);
            setIsSupportChat(true);
          } else {
            setIsDoubleDate(matchData.isDoubleDate || false);
            const otherUserId = participants.find(id => id !== user.uid);
            if (otherUserId) {
              const profilesMap = await getProfiles([otherUserId]);
              const profileData = profilesMap[otherUserId];
              const supportFlag = matchData.isSupport || matchData.isOfficial;
              
              if (profileData) {
                setMatchProfile(profileData);
                setIsInternational(matchData.isInternational || false);
                setIsSupportChat(supportFlag || profileData.role === 'admin');
              } else if (supportFlag) {
                setMatchProfile({ uid: otherUserId, name: t('chat.support_name'), photos: [require('@/assets/images/icon.png')], role: 'admin' } as any);
                setIsSupportChat(true);
              }
            }
          }

        }
      } catch (e) {
        console.warn("Error loading metadata:", e);
      }
    };

    loadMetadata();

    // 3. Listen to match status updates (consent, blocks)
    const unsubMatch = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.blocked || data.status === 'blocked') {
          router.replace('/(tabs)/matches' as any);
          return;
        }
        if (data.photoConsent) setPhotoConsent(data.photoConsent);
      }
    });

    return () => {
      unsubMessages();
      unsubMatch();
    };
  }, [matchId, user?.uid, messagesLimit]);

  const sendMessage = React.useCallback(async (text: string) => {
    const textToSend = text.trim();
    if (!textToSend || !user?.uid || !matchId) return;
    
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    let isSpam = false;
    
    // Auto-Moderator Check
    if (bannedWordsList.length > 0) {
      const lowerText = textToSend.toLowerCase();
      if (bannedWordsList.some(word => lowerText.includes(word.toLowerCase()))) {
        isSpam = true;
      }
    }

    try {
      await addDoc(collection(db, 'matches', matchId, 'messages'), {
        text: textToSend,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seen: false,
        type: 'text',
        isSpam: isSpam
      });
      
      await updateDoc(doc(db, 'matches', matchId), {
        lastMessage: textToSend,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadCount: increment(1),
        messageCount: increment(1)
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      Alert.alert(t('common.error'), t('chat.send_error'));
    }
  }, [user?.uid, matchId, bannedWordsList]);

  const toggleReaction = React.useCallback(async (messageId: string, emoji: string) => {
    if (!user?.uid || !matchId) return;
    
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const messageRef = doc(db, 'matches', matchId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (messageSnap.exists()) {
      const data = messageSnap.data();
      const reactions = data.reactions || {};
      const currentReactors = reactions[emoji] || [];
      
      let newReactors;
      if (currentReactors.includes(user.uid)) {
        newReactors = currentReactors.filter((uid: string) => uid !== user.uid);
      } else {
        newReactors = [...currentReactors, user.uid];
      }
      
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: newReactors
      });
    }
  }, [user?.uid, matchId]);

  const uploadImageToChat = async (isEphemeral: boolean) => {
    if (!user?.uid || !matchId) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        setIsTyping(true);
        const fileName = `chat_${Date.now()}.jpg`;
        const publicUrl = await uploadToFirebaseStorage(user.uid, asset.uri, fileName);

        await addDoc(collection(db, 'matches', matchId, 'messages'), {
          text: isEphemeral ? t('chat.ephemeral_photo') : t('chat.photo'),
          imageUrl: publicUrl,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          seen: false,
          type: 'image',
          isEphemeral: isEphemeral,
          destroyed: false
        });
        
        await updateDoc(doc(db, 'matches', matchId), {
          lastMessage: isEphemeral ? t('chat.ephemeral_photo') : t('chat.photo'),
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: user.uid,
          unreadCount: increment(1)
        });
      } catch (e: any) {
        Alert.alert(t('chat.upload_error'), e.message);
      } finally {
        setIsTyping(false);
        setShowPhotoOptions(false);
      }
    }
  };

  const handleCameraButton = React.useCallback(() => {
     if (!user?.uid) return;
     const myConsent = photoConsent[user.uid];
     const otherConsent = matchProfile ? photoConsent[matchProfile.uid] : false;
     
     if (!myConsent) {
        setShowConsentModal(true);
        return;
     }

     if (!otherConsent) {
        setShowWaitModal(true);
        return;
     }

     setShowPhotoOptions(true);
  }, [user?.uid, photoConsent, matchProfile]);


  // Ephemeral timer management
  useEffect(() => {
    if (viewingImage && viewingImage.isEphemeral && user?.role !== 'admin') {
      setEphemeralTimer(7);
      timerRef.current = setInterval(() => {
        setEphemeralTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            handleDestroyImage(viewingImage.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [viewingImage?.id]);

  const handleOpenImage = React.useCallback((item: any) => {
    if (user?.role === 'admin') {
       setViewingImage(item);
       return;
    }

    if (item.isEphemeral) {
       if (item.destroyed) return;
       
       const isSender = item.senderId === user?.uid;
       if (isSender) {
          if (Platform.OS === 'web') window.alert(t('chat.sender_no_view'));
          return;
       }
    }
    setViewingImage(item);
  }, [user?.uid, user?.role]);

  const handleDestroyImage = async (msgId: string) => {
     setViewingImage(null);
     try {
       await updateDoc(doc(db, 'matches', matchId as string, 'messages', msgId), {
         destroyed: true
       });
     } catch (e) {
       console.error("No se pudo marcar como destruida", e);
     }
  };

  const handlePermanentDelete = async (item: any) => {
     if (user?.role !== 'admin') return;
     try {
        setViewingImage(null);
        if (item.imageUrl) {
           await deleteFromFirebaseStorage(item.imageUrl);
        }
        await updateDoc(doc(db, 'matches', matchId as string, 'messages', item.id), {
           imageUrl: '',
           fullyDeleted: true
        });
        if (Platform.OS === 'web') window.alert("Archivo purgado del servidor exitosamente.");
     } catch (e: any) {
        Alert.alert("Error de purga", e.message);
     }
  };

  const MessageItem = React.memo(({ 
    item, index, user, matchProfile, participantsProfiles, 
    isAdminObserver, isSupportChat, limits, toggleReaction, handleOpenImage 
  }: any) => {
    const isMe = item.senderId === user?.uid;
    const isAdmin = user?.role === 'admin';
    const EnteringAnimation = isMe ? FadeInRight : FadeInLeft;

    const showSeenStatus = isMe && (limits.readReceipts || user?.subscription === 'elite');
    const isLockedSeen = isMe && !showSeenStatus && item.seen;

    const renderInnerContent = (textColor: string) => {
      if (item.fullyDeleted) {
        return (
          <View style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🚫</Text>
            <Text style={[{ fontSize: 13, fontWeight: 'bold' }, { color: '#888' }]}>{t('chat.file_purged')}</Text>
          </View>
        );
      }

      if (item.imageUrl || item.isEphemeral) {
        if (item.isEphemeral) {
          if (item.destroyed && !isAdmin) {
            return (
              <View style={{ alignItems: 'center', padding: 8 }}>
                <Text style={{ fontSize: 24, marginBottom: 4 }}>💥</Text>
                <Text style={[{ fontSize: 13, fontWeight: 'bold' }, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#888' }]}>{t('chat.destroyed')}</Text>
              </View>
            );
          } else {
            return (
              <Pressable 
                onPress={() => handleOpenImage(item)} 
                style={[
                  { alignItems: 'center', padding: 12 },
                  isMe && !isAdmin && { opacity: 0.6 }
                ]}
              >
                <Text style={{ fontSize: 28, marginBottom: 4 }}>💣</Text>
                <View style={{ alignItems: 'center' }}>
                   <Text style={[{ fontSize: 14, fontWeight: 'bold' }, isMe ? { color: '#FFFFFF' } : { color: '#4FC3F7' }]}>
                     {isAdmin ? t('chat.admin_audit') : isMe ? t('chat.temp_photo_sent') : t('chat.tap_to_view')}
                   </Text>
                   {isMe && !isAdmin && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>[{t('chat.sender_only_label')}]</Text>}
                   {isAdmin && item.destroyed && <Text style={{ fontSize: 10, color: '#FF2D78' }}>[{t('chat.already_viewed')}]</Text>}
                </View>
              </Pressable>
            );
          }
        } else {
          return (
            <Pressable onPress={() => handleOpenImage(item)}>
              <SmartImage source={item.imageUrl} style={{ width: 220, height: 280, borderRadius: 16 }} contentFit="cover" />
            </Pressable>
          );
        }
      }
      if (item.storyRef) {
        return (
          <View style={{ gap: 8 }}>
            <View style={{ opacity: 0.8, borderLeftWidth: 2, borderLeftColor: '#FFF', paddingLeft: 8, marginBottom: 4 }}>
              <SmartImage source={item.storyRef} style={{ width: 60, height: 80, borderRadius: 8 }} contentFit="cover" />
              <Text style={{ fontSize: 11, color: '#DDD', marginTop: 2 }}>{t('chat.story_reply')}</Text>
            </View>
            <Text style={[{ fontSize: 15, lineHeight: 22 }, { color: textColor }]}>{item.text}</Text>
          </View>
        );
      }

      return <Text style={[{ fontSize: 15, lineHeight: 22 }, { color: textColor }]}>{item.text}</Text>;
    };

    const ContainerView = Platform.OS === 'web' ? View : Animated.View;
    const animationProps = Platform.OS === 'web' ? {} : {
      entering: EnteringAnimation.delay(50).duration(400)
    };

    return (
      <ContainerView 
        {...animationProps}
        style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
      >
        {!isMe && (matchProfile || Object.keys(participantsProfiles).length > 0) && !isAdminObserver && (
          <SmartImage
            source={
              isSupportChat 
                ? require('@/assets/images/icon.png') 
                : participantsProfiles[item.senderId]
                  ? participantsProfiles[item.senderId].photos[0]
                  : (matchProfile && matchProfile.photos[0] ? matchProfile.photos[0] : require('@/assets/images/icon.png'))
            }
            style={styles.avatarSmall}
            contentFit="cover"
          />
        )}
        <View style={styles.bubbleWrapper}>
          {(isAdminObserver || Object.keys(participantsProfiles).length > 1) && participantsProfiles[item.senderId] && (
             <Text style={{fontSize: 11, color: '#888', marginBottom: 4, marginLeft: 4, fontWeight: '700'}}>
               {participantsProfiles[item.senderId].name}
             </Text>
          )}
          {isMe ? (
            <LinearGradient
              colors={['#FF2D78', '#FF6B35'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bubble, styles.bubbleMe, item.imageUrl && !item.isEphemeral && { paddingHorizontal: 4, paddingVertical: 4 }]}
            >
              <Pressable onLongPress={() => toggleReaction(item.id, '❤️')}>
                {renderInnerContent('#FFFFFF')}
              </Pressable>
            </LinearGradient>
          ) : (
            <View style={[
              styles.bubble, 
              styles.bubbleOther, 
              isSupportChat && { backgroundColor: '#007AFF' },
              item.imageUrl && !item.isEphemeral && { paddingHorizontal: 4, paddingVertical: 4 }
            ]}>
              <Pressable onLongPress={() => toggleReaction(item.id, '❤️')}>
                {renderInnerContent(isSupportChat ? '#FFFFFF' : '#FFFFFF')}
              </Pressable>
            </View>
          )}

          <MessageReactions 
            reactions={item.reactions || {}}
            currentUserId={user?.uid || ''}
            onToggleReaction={(emoji: string) => toggleReaction(item.id, emoji)}
            isMe={isMe}
          />

          <View style={[styles.messageFooter, isMe && styles.messageFooterMe]}>
            <Text style={styles.messageTime}>{item.displayTime}</Text>
            {isSupportChat && !isMe && (
               <Text style={[styles.messageTime, { color: '#4FC3F7', marginLeft: 4, fontWeight: 'bold' }]}>{t('chat.official_badge')}</Text>
            )}
            {isMe && (
              <View style={styles.seenContainer}>
                {isLockedSeen ? (
                  <Pressable onPress={() => router.push('/paywall' as any)}>
                    <Text style={styles.lockedSeenText}>{t('chat.locked_seen')}</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.seenStatus, item.seen && styles.seenStatusActive]}>
                    {item.seen ? '✓✓' : '✓'}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ContainerView>
    );
  });

  const ChatInput = React.memo(({ onSendMessage, onCamera, showEmoji, setShowEmoji }: any) => {
    const [text, setText] = useState('');
    const { t } = useTranslation();

    const handleSend = () => {
      if (text.trim()) {
        onSendMessage(text);
        setText('');
      }
    };

    return (
      <>
        <View style={styles.inputArea}>
          <Pressable style={styles.attachButton} onPress={onCamera}>
            <Text style={styles.attachIcon}>📷</Text>
          </Pressable>
          <Pressable 
            style={styles.attachButton} 
            onPress={() => {
              Keyboard.dismiss();
              setShowEmoji(!showEmoji);
            }}
          >
            <Text style={styles.attachIcon}>😊</Text>
          </Pressable>

          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            onFocus={() => setShowEmoji(false)}
            placeholder={t('chat.placeholder')}
            placeholderTextColor="#666"
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, text.trim() && styles.sendButtonActive]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            {text.trim() ? (
              <LinearGradient
                colors={['#FF2D78', '#FF6B35'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.sendIconDisabled}>↑</Text>
            )}
          </Pressable>
        </View>
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji: string) => {
              setText(prev => prev + emoji);
            }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </>
    );
  });


  const renderItem = React.useCallback(({ item, index }: any) => (
    <MessageItem 
      item={item} 
      index={index} 
      user={user} 
      matchProfile={matchProfile}
      participantsProfiles={participantsProfiles}
      isAdminObserver={isAdminObserver}
      isSupportChat={isSupportChat}
      limits={limits}
      toggleReaction={toggleReaction}
      handleOpenImage={handleOpenImage}
    />
  ), [user, matchProfile, participantsProfiles, isAdminObserver, isSupportChat, limits, toggleReaction, handleOpenImage]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]} 
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        {matchProfile ? (
          <Pressable 
            style={styles.headerProfile} 
            onPress={() => !isAdminObserver && router.push(`/profile/${matchProfile.uid}` as any)}
          >
            {Object.keys(participantsProfiles).length > 1 ? (
              <View style={styles.headerGroupAvatars}>
                {Object.values(participantsProfiles).slice(0, 3).map((p, i) => (
                  <SmartImage 
                    key={p.uid} 
                    source={p.photos[0]} 
                    style={[styles.headerPhotoGroup, { marginLeft: i === 0 ? 0 : -15 }]} 
                    contentFit="cover" 
                  />
                ))}
              </View>
            ) : (
              <SmartImage
                source={isSupportChat ? require('@/assets/images/icon.png') : matchProfile.photos[0]}
                style={styles.headerPhoto}
                contentFit="cover"
              />
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {`${isSupportChat ? t('chat.support_name') : Object.keys(participantsProfiles).length > 1 ? t('chat.double_date_group') : matchProfile.name}${isInternational ? ' 🌍' : ''}`}
              </Text>
              <View style={styles.statusRow}>
                {isSupportChat ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700', width: 16, height: 16 }]}>
                      <Text style={{ fontSize: 8 }}>🛡️</Text>
                    </View>
                    <Text style={[styles.headerStatus, { color: '#FFD700', marginLeft: 4, fontWeight: 'bold' }]}>{t('chat.official_account')}</Text>
                  </View>
                ) : (
                  <>
                    {isTyping && <View style={styles.typingDotStatus} />}
                    <Text style={[styles.headerStatus, isTyping && styles.headerStatusTyping]}>
                      {isTyping ? t('chat.typing') : t('chat.active_recently')}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.headerProfile}>
             <View style={[styles.headerPhoto, { backgroundColor: '#1E1E1E' }]} />
             <View style={styles.headerInfo}>
                <View style={{ width: 100, height: 16, backgroundColor: '#1E1E1E', borderRadius: 4, marginBottom: 4 }} />
                <View style={{ width: 60, height: 10, backgroundColor: '#1E1E1E', borderRadius: 4 }} />
             </View>
          </View>
        )}
        {!isSupportChat && (
          <Pressable style={styles.headerAction} onPress={() => setReportModalVisible(true)}>
            <Text style={[styles.headerActionIcon, { color: '#FF2D78' }]}>🚩</Text>
          </Pressable>
        )}
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={Platform.OS === 'web' ? messages : [...messages].reverse()}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.messagesList, { paddingBottom: 20, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS !== 'web'}
        inverted={Platform.OS !== 'web'}
        onScroll={handleScroll}
        onEndReached={() => {
          if (Platform.OS !== 'web' && messages.length >= messagesLimit) {
            setMessagesLimit(prev => prev + 30);
          }
        }}
        onEndReachedThreshold={0.2}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#FF2D78"
            colors={['#FF2D78']}
            progressViewOffset={Platform.OS === 'ios' ? 0 : 50}
          />
        }
        ListEmptyComponent={
          Platform.OS === 'web' ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Text style={styles.emptyEmoji}>👋</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {t('chat.empty_state')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {matchProfile ? t('chat.say_hello', { name: matchProfile.name }) : t('chat.dont_be_shy')}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.emptyIconWrapper}>
                <Text style={styles.emptyEmoji}>👋</Text>
              </Animated.View>
              <Animated.Text entering={FadeInUp.delay(400).duration(600)} style={styles.emptyTitle}>
                {t('chat.empty_state')}
              </Animated.Text>
              <Animated.Text entering={FadeInUp.delay(600).duration(600)} style={styles.emptySubtitle}>
                {matchProfile ? t('chat.say_hello', { name: matchProfile.name }) : t('chat.dont_be_shy')}
              </Animated.Text>
            </View>
          )
        }
        ListHeaderComponent={
          Platform.OS === 'web' ? (
            <View style={{ height: 20 }} />
          ) : isTyping ? (
            <Animated.View entering={FadeInLeft.duration(400)} style={[styles.typingIndicator, { marginBottom: 10 }]}>
              {matchProfile && (
                <SmartImage
                  source={matchProfile.photos[0]}
                  style={styles.avatarSmall}
                  contentFit="cover"
                />
              )}
              <View style={styles.typingBubble}>
                <Animated.Text 
                  entering={FadeIn.duration(1000).delay(200)}
                  style={styles.typingDots}
                >
                  • • •
                </Animated.Text>
              </View>
            </Animated.View>
          ) : (
            <View style={{ height: 10 }} />
          )
        }
        ListFooterComponent={
          Platform.OS === 'web' ? (
            isTyping ? (
              <View style={[styles.typingIndicator, { marginTop: 10, marginBottom: 10 }]}>
                {matchProfile && (
                  <SmartImage
                    source={matchProfile.photos[0]}
                    style={styles.avatarSmall}
                    contentFit="cover"
                  />
                )}
                <View style={styles.typingBubble}>
                  <Text style={styles.typingDots}>• • •</Text>
                </View>
              </View>
            ) : (
              <View style={{ height: 20 }} />
            )
          ) : (
            <View style={{ height: 20 }} />
          )
        }
      />

      <View style={styles.inputArea}>
        {isAdminObserver ? (
          <View style={[styles.supportLockedContainer, { backgroundColor: 'rgba(255, 45, 120, 0.1)', borderColor: 'rgba(255, 45, 120, 0.3)' }]}>
            <Text style={[styles.supportLockedText, { color: '#FF2D78', fontWeight: 'bold' }]}>
              {t('chat.audit_mode')}
            </Text>
          </View>
        ) : isSupportChat && user?.role !== 'admin' ? (
          <View style={styles.supportLockedContainer}>
            <Text style={styles.supportLockedText}>
              {t('chat.support_locked')}
            </Text>
          </View>
        ) : (
          <ChatInput 
            onSendMessage={sendMessage}
            onCamera={handleCameraButton}
            showEmoji={showEmojiPicker}
            setShowEmoji={setShowEmojiPicker}
          />
        )}
      </View>

      {/* Emoji Picker Logic handled inside ChatInput or passed as prop */}

      {matchProfile && (
        <ReportModal 
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          reportedUserId={matchProfile.uid}
          reportedUserName={matchProfile.name}
          reporterId={user?.uid || ''}
        />
      )}

      {/* Modal de Consentimiento */}
      <Modal visible={showConsentModal} transparent animationType="fade">
         <View style={styles.modalBg}>
            <View style={styles.consentContainer}>
               <View style={styles.consentIconWrapper}>
                  <Text style={styles.consentEmoji}>🔒</Text>
               </View>
               <Text style={styles.consentTitle}>{t('chat.enable_photo_exchange')}</Text>
               <Text style={styles.consentDesc}>
                  {t('chat.consent_desc')}
               </Text>
               <Pressable 
                  style={styles.consentEnableBtn}
                  onPress={async () => {
                     if (!user?.uid) return;
                     try {
                        await setDoc(doc(db, 'matches', matchId as string), {
                           photoConsent: { [user.uid]: true }
                        }, { merge: true });
                        setShowConsentModal(false);
                     } catch(err: any) {
                        if (Platform.OS === 'web') window.alert("Error: " + err.message);
                     }
                  }}
               >
                  <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.consentGradient}>
                     <Text style={styles.consentEnableText}>{t('chat.enable_photos')}</Text>
                  </LinearGradient>
               </Pressable>
               <Pressable style={styles.consentCancelBtn} onPress={() => setShowConsentModal(false)}>
                  <Text style={styles.consentCancelText}>{t('chat.not_now')}</Text>
               </Pressable>
            </View>
         </View>
      </Modal>

      {/* Modal de Espera */}
      <Modal visible={showWaitModal} transparent animationType="fade">
         <View style={styles.modalBg}>
            <View style={styles.consentContainer}>
               <View style={[styles.consentIconWrapper, { backgroundColor: 'rgba(79, 195, 247, 0.1)' }]}>
                  <Text style={styles.consentEmoji}>⏳</Text>
               </View>
               <Text style={styles.consentTitle}>{t('chat.waiting_confirmation')}</Text>
               <Text style={styles.consentDesc}>
                  {t('chat.consent_wait_desc', { name: matchProfile?.name || 'tu match' })}
               </Text>
               <Pressable style={styles.consentEnableBtn} onPress={() => setShowWaitModal(false)}>
                  <LinearGradient colors={['#4FC3F7', '#2196F3']} style={styles.consentGradient}>
                     <Text style={styles.consentEnableText}>{t('chat.understood')}</Text>
                  </LinearGradient>
               </Pressable>
               <Pressable 
                  style={styles.consentCancelBtn} 
                  onPress={async () => {
                     if (!user?.uid) return;
                     try {
                        await setDoc(doc(db, 'matches', matchId as string), {
                           photoConsent: { [user.uid]: false }
                        }, { merge: true });
                        setShowWaitModal(false);
                     } catch(e) {}
                  }}
               >
                  <Text style={[styles.consentCancelText, { color: '#FF2D78' }]}>{t('chat.withdraw_permission')}</Text>
               </Pressable>
            </View>
         </View>
      </Modal>

      {/* Selector de tipo de foto */}
      <Modal visible={showPhotoOptions} transparent animationType="slide">
         <View style={styles.modalBg}>
            <View style={styles.photoOptionsContainer}>
               <Text style={styles.photoOptionsTitle}>{t('chat.attach_image')}</Text>
               <Pressable style={styles.photoOptionBtn} onPress={() => uploadImageToChat(true)}>
                  <Text style={styles.photoOptionIcon}>💣</Text>
                  <View>
                     <Text style={styles.photoOptionLabel}>{t('chat.explosive_photo')}</Text>
                     <Text style={styles.photoOptionDesc}>{t('chat.explosive_photo_desc')}</Text>
                  </View>
               </Pressable>
               <Pressable style={styles.photoOptionBtn} onPress={() => uploadImageToChat(false)}>
                  <Text style={styles.photoOptionIcon}>🖼</Text>
                  <View>
                     <Text style={styles.photoOptionLabel}>{t('chat.permanent_photo')}</Text>
                     <Text style={styles.photoOptionDesc}>{t('chat.permanent_photo_desc')}</Text>
                  </View>
               </Pressable>
               <Pressable style={styles.photoOptionCancel} onPress={() => setShowPhotoOptions(false)}>
                  <Text style={styles.photoOptionCancelText}>{t('common.cancel')}</Text>
               </Pressable>
               
               <View style={{ height: 1, backgroundColor: '#2A2A2A', marginVertical: 8 }} />
               
               <Pressable 
                  style={[styles.photoOptionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FF2D7820' }]} 
                  onPress={async () => {
                     if (!user?.uid) return;
                     try {
                        await setDoc(doc(db, 'matches', matchId as string), {
                           photoConsent: { [user.uid]: false }
                        }, { merge: true });
                        setShowPhotoOptions(false);
                     } catch(e) {}
                  }}
               >
                  <Text style={{ fontSize: 20 }}>🚫</Text>
                  <View>
                     <Text style={[styles.photoOptionLabel, { color: '#FF2D78' }]}>{t('chat.disable_cameras')}</Text>
                     <Text style={styles.photoOptionDesc}>{t('chat.disable_cameras_desc')}</Text>
                  </View>
               </Pressable>
            </View>
         </View>
      </Modal>

      {/* Visor de Imagen Pantalla Completa */}
      {viewingImage && (
         <Modal visible={true} transparent animationType="fade">
            <View style={styles.fullscreenBg}>
               <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
               <View style={styles.fullscreenHeader}>
                  {viewingImage.isEphemeral && user?.role !== 'admin' ? (
                     <View style={styles.timerBadge}>
                        <Text style={styles.timerText}>00:0{ephemeralTimer}</Text>
                     </View>
                  ) : user?.role === 'admin' ? (
                     <View style={[styles.timerBadge, { backgroundColor: '#4FC3F7' }]}>
                        <Text style={styles.timerText}>VISTA ADMIN</Text>
                     </View>
                  ) : (
                     <View />
                  )}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {user?.role === 'admin' && (
                       <Pressable 
                          style={[styles.fullscreenClose, { backgroundColor: '#FF2D78' }]} 
                          onPress={() => handlePermanentDelete(viewingImage)}
                       >
                          <Text style={{ fontSize: 18 }}>🔥</Text>
                       </Pressable>
                    )}
                    <Pressable 
                       style={styles.fullscreenClose} 
                       onPress={() => {
                          if (viewingImage.isEphemeral && user?.role !== 'admin') {
                             handleDestroyImage(viewingImage.id);
                          } else {
                             setViewingImage(null);
                          }
                       }}
                    >
                       <Text style={styles.fullscreenCloseText}>✕</Text>
                    </Pressable>
                  </View>
               </View>
               
               <Image 
                  source={getSafeSource(getOptimizedUrl(viewingImage.imageUrl, 1200, 1600))} 
                  style={[styles.fullscreenImage, { zIndex: 1 }]} 
                  contentFit="contain" 
                  transition={300}
                />
            </View>
         </Modal>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,45,120,0.3)',
  },
  headerGroupAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  headerPhotoGroup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
  },
  headerInfo: {
    gap: 2,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStatus: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionIcon: {
    fontSize: 22,
    color: '#8A8A8A',
  },
  aiBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  icebreakerContainer: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  icebreakerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  icebreakerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  icebreakerSubtitle: {
    color: '#8A8A8A',
    fontSize: 14,
    marginBottom: 20,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionItem: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  suggestionText: {
    color: '#EEE',
    fontSize: 15,
    lineHeight: 20,
  },
  regenerateBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  regenerateText: {
    color: '#A855F7',
    fontWeight: '600',
  },
  closeIcon: {
    color: '#666',
    fontSize: 20,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bubbleWrapper: {
    maxWidth: '75%',
    gap: 4,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 4,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextOther: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageFooterMe: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    color: '#8A8A8A',
    fontSize: 11,
  },
  seenStatus: {
    color: '#8A8A8A',
    fontSize: 11,
  },
  seenStatusActive: {
    color: '#4FC3F7',
  },
  seenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedSeenText: {
    fontSize: 11,
    color: '#FF2D78',
    fontWeight: '600',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  typingBubble: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingDots: {
    color: '#8A8A8A',
    fontSize: 18,
    letterSpacing: 2,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    gap: 10,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendButtonActive: {
    backgroundColor: 'transparent',
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sendIconDisabled: {
    color: '#8A8A8A',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  supportLockedContainer: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF40',
    alignItems: 'center',
  },
  supportLockedText: {
    color: '#8A8A8A',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    height: 400, // Approximate height to center it
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingDotStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  headerStatusTyping: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  photoOptionsContainer: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  photoOptionsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  photoOptionIcon: {
    fontSize: 32,
  },
  photoOptionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  photoOptionDesc: {
    color: '#8A8A8A',
    fontSize: 13,
  },
  photoOptionCancel: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  photoOptionCancelText: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '700',
  },
  fullscreenBg: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
    alignItems: 'flex-start',
  },
  timerBadge: {
    backgroundColor: '#FF2D78',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  fullscreenClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullscreenImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  consentContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 32,
    padding: 32,
    width: '85%',
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  consentIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  consentEmoji: {
    fontSize: 40,
  },
  consentTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  consentDesc: {
    color: '#8A8A8A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  consentEnableBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 12,
  },
  consentGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentEnableText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  consentCancelBtn: {
    padding: 12,
  },
  consentCancelText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '600',
  },
});
